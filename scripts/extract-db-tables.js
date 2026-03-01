/**
 * extract-db-tables.js
 *
 * Crawls through all Supabase migration files in ascending (chronological)
 * order, reconstructs the final schema of every table, and writes each to
 * its own file under  supabase/db-reference/tables/<table_name>.sql
 *
 * Handles:
 *   CREATE TABLE          — baseline definition
 *   ALTER TABLE ADD COLUMN
 *   ALTER TABLE DROP COLUMN
 *   ALTER TABLE ALTER COLUMN  (TYPE, SET/DROP DEFAULT, SET/DROP NOT NULL)
 *   ALTER TABLE RENAME COLUMN
 *   ALTER TABLE RENAME TO
 *   ALTER TABLE ADD CONSTRAINT
 *   ALTER TABLE DROP CONSTRAINT
 *   ALTER TABLE ENABLE ROW LEVEL SECURITY
 *   DROP TABLE             — removes the table entirely
 *
 * Freshness guarantee: migrations processed in filename order (chronological).
 * Later definitions of the same table overwrite earlier ones. ALTER TABLE
 * operations are applied incrementally to the existing definition.
 *
 * Can be run standalone:      node scripts/extract-db-tables.js
 * Or imported by the orchestrator (extract-db-reference.js).
 */

import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "node:url";

import {
  OUTPUT_DIR,
  skipSingleQuote,
  skipDollarQuote,
  findStatementEnd,
  isInsideComment,
  isInsideDollarQuote,
  normalizeName,
  splitTopLevel,
  findMatchingParen,
  listMigrationFiles,
  readMigration,
} from "./lib/sql-parser.js";

// ─── Table Model ─────────────────────────────────────────────────────────

class TableDef {
  constructor(name, sourceFile) {
    this.name = name;
    this.sourceFile = sourceFile;      // migration that created it
    this.columns = [];                 // { name, type, constraints }
    this.tableConstraints = [];        // raw constraint strings
    this.rlsEnabled = false;
    this.history = [];                 // ALTER history for reference
  }

  addColumn(name, type, constraints, source) {
    // Avoid duplicates (IF NOT EXISTS)
    if (!this.columns.find(c => c.name === name)) {
      this.columns.push({ name, type, constraints });
    }
  }

  dropColumn(name) {
    this.columns = this.columns.filter(c => c.name !== name);
  }

  renameColumn(oldName, newName) {
    const col = this.columns.find(c => c.name === oldName);
    if (col) col.name = newName;
  }

  alterColumnType(colName, newType) {
    const col = this.columns.find(c => c.name === colName);
    if (col) col.type = newType;
  }

  alterColumnSetDefault(colName, defaultExpr) {
    const col = this.columns.find(c => c.name === colName);
    if (col) {
      // Remove existing DEFAULT
      col.constraints = col.constraints.replace(/\bDEFAULT\s+\S+/i, "").trim();
      col.constraints = (col.constraints + " DEFAULT " + defaultExpr).trim();
    }
  }

  alterColumnDropDefault(colName) {
    const col = this.columns.find(c => c.name === colName);
    if (col) {
      col.constraints = col.constraints.replace(/\bDEFAULT\s+\S+/i, "").trim();
    }
  }

  alterColumnSetNotNull(colName) {
    const col = this.columns.find(c => c.name === colName);
    if (col && !/\bNOT\s+NULL\b/i.test(col.constraints)) {
      col.constraints = (col.constraints + " NOT NULL").trim();
    }
  }

  alterColumnDropNotNull(colName) {
    const col = this.columns.find(c => c.name === colName);
    if (col) {
      col.constraints = col.constraints.replace(/\bNOT\s+NULL\b/i, "").trim();
    }
  }

  addConstraint(constraintStr) {
    this.tableConstraints.push(constraintStr);
  }

  dropConstraint(name) {
    this.tableConstraints = this.tableConstraints.filter(
      c => !c.toLowerCase().includes(name.toLowerCase())
    );
  }
}

// ─── Parsers ─────────────────────────────────────────────────────────────

/**
 * Keywords that start a column-level constraint (used to split name+type
 * from the constraint portion of a column definition).
 */
const CONSTRAINT_KEYWORDS = /\b(NOT\s+NULL|NULL|DEFAULT|PRIMARY\s+KEY|UNIQUE|CHECK|REFERENCES|GENERATED|CONSTRAINT)\b/i;

/**
 * Keywords that indicate a TABLE-level constraint (the entry is not a column).
 */
const TABLE_CONSTRAINT_RE = /^\s*(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|EXCLUDE|CONSTRAINT)\b/i;

/**
 * Parse the body between `(` and `)` of a CREATE TABLE statement.
 * Returns { columns, tableConstraints }.
 */
function parseCreateTableBody(body) {
  const columns = [];
  const tableConstraints = [];

  const entries = splitTopLevel(body);

  for (const entry of entries) {
    if (!entry) continue;

    // Table-level constraint?
    if (TABLE_CONSTRAINT_RE.test(entry)) {
      tableConstraints.push(entry);
      continue;
    }

    // Column: first token = name, then type, then constraints
    // Handle quoted column names
    let colName, rest;
    if (entry.startsWith('"')) {
      const endQuote = entry.indexOf('"', 1);
      colName = entry.slice(1, endQuote);
      rest = entry.slice(endQuote + 1).trim();
    } else {
      const firstSpace = entry.search(/\s/);
      if (firstSpace === -1) continue; // can't parse
      colName = entry.slice(0, firstSpace);
      rest = entry.slice(firstSpace + 1).trim();
    }

    // Skip if "name" is actually a keyword (malformed parse)
    if (/^(PRIMARY|UNIQUE|FOREIGN|CHECK|EXCLUDE|CONSTRAINT)$/i.test(colName)) {
      tableConstraints.push(entry);
      continue;
    }

    // Split rest into type + constraints
    // Find the first constraint keyword at the top level
    const constraintMatch = rest.match(CONSTRAINT_KEYWORDS);
    let type, constraints;

    if (constraintMatch) {
      const idx = constraintMatch.index;
      type = rest.slice(0, idx).trim();
      constraints = rest.slice(idx).trim();
    } else {
      type = rest.trim();
      constraints = "";
    }

    // Clean up type — remove trailing whitespace
    type = type.replace(/\s+/g, " ").trim();

    columns.push({ name: colName, type, constraints });
  }

  return { columns, tableConstraints };
}

// ─── ALTER TABLE Helpers ──────────────────────────────────────────────────

/**
 * ALTER TABLE statements can contain multiple comma-separated actions:
 *   ALTER TABLE x ADD COLUMN a INT, ADD COLUMN b TEXT, DROP COLUMN c;
 *
 * Split these into individual action strings by detecting top-level commas
 * followed by an ALTER keyword (ADD, DROP, ALTER, RENAME, ENABLE, etc.).
 */
function splitAlterActions(afterTable) {
  // Match positions where ", ADD " / ", DROP " / ", ALTER " / ", RENAME " / ", ENABLE " appear
  // at the top level (not inside parentheses).
  const actionKeywordRe = /,\s*(?=(?:ADD|DROP|ALTER|RENAME|ENABLE|DISABLE|SET|RESET)\s)/gi;

  const actions = [];
  let lastIdx = 0;
  let m;

  // We need to be careful about commas inside parentheses
  // (e.g. CHECK constraints, REFERENCES). Use a simple approach:
  // scan for commas at depth 0 that are followed by an action keyword.
  let depth = 0;
  for (let i = 0; i < afterTable.length; i++) {
    const ch = afterTable[i];
    if (ch === "'") { i = skipSingleQuote(afterTable, i) - 1; continue; }
    if (ch === "(") { depth++; continue; }
    if (ch === ")") { depth--; continue; }
    if (ch === "," && depth === 0) {
      // Check if what follows is an action keyword
      const rest = afterTable.slice(i + 1).trimStart();
      if (/^(?:ADD|DROP|ALTER|RENAME|ENABLE|DISABLE|SET|RESET)\s/i.test(rest)) {
        actions.push(afterTable.slice(lastIdx, i).trim());
        lastIdx = i + 1;
      }
    }
  }
  actions.push(afterTable.slice(lastIdx).trim());

  return actions.filter(a => a.length > 0);
}

/**
 * Apply a single ALTER TABLE action to a TableDef.
 */
function applyAlterAction(table, action, file) {
  // ── ENABLE ROW LEVEL SECURITY ──
  if (/^ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(action)) {
    table.rlsEnabled = true;
    return;
  }

  // ── ADD COLUMN ──
  {
    const addCol = action.match(
      /^ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s+(.+)/i
    );
    if (addCol) {
      const colName = addCol[1];
      const rest = addCol[2].replace(/;$/, "").trim();

      const cm = rest.match(CONSTRAINT_KEYWORDS);
      let type, constraints;
      if (cm) {
        type = rest.slice(0, cm.index).trim();
        constraints = rest.slice(cm.index).trim();
      } else {
        type = rest;
        constraints = "";
      }

      table.addColumn(colName, type, constraints, file);
      return;
    }
  }

  // ── DROP COLUMN ──
  {
    const dropCol = action.match(
      /^DROP\s+(?:COLUMN\s+)?(?:IF\s+EXISTS\s+)?"?(\w+)"?/i
    );
    if (dropCol) {
      table.dropColumn(dropCol[1]);
      return;
    }
  }

  // ── RENAME COLUMN ──
  {
    const renCol = action.match(
      /^RENAME\s+(?:COLUMN\s+)?"?(\w+)"?\s+TO\s+"?(\w+)"?/i
    );
    if (renCol) {
      table.renameColumn(renCol[1], renCol[2]);
      return;
    }
  }

  // ── RENAME TO (table rename) ──
  // Note: table renames are handled specially in the caller since they
  // need to update the map key. We'll handle it here by storing a flag.
  {
    const renTbl = action.match(
      /^RENAME\s+TO\s+"?(\w+)"?/i
    );
    if (renTbl) {
      table._pendingRename = normalizeName(renTbl[1]);
      return;
    }
  }

  // ── ALTER COLUMN ──
  {
    const altCol = action.match(
      /^ALTER\s+(?:COLUMN\s+)?"?(\w+)"?\s+(.+)/i
    );
    if (altCol) {
      const colName = altCol[1];
      const colAction = altCol[2].replace(/;$/, "").trim();

      if (/^TYPE\s+/i.test(colAction)) {
        const newType = colAction.replace(/^TYPE\s+/i, "").replace(/\s+USING\s+.*/i, "").trim();
        table.alterColumnType(colName, newType);
      } else if (/^SET\s+DEFAULT\s+/i.test(colAction)) {
        const expr = colAction.replace(/^SET\s+DEFAULT\s+/i, "").trim();
        table.alterColumnSetDefault(colName, expr);
      } else if (/^DROP\s+DEFAULT/i.test(colAction)) {
        table.alterColumnDropDefault(colName);
      } else if (/^SET\s+NOT\s+NULL/i.test(colAction)) {
        table.alterColumnSetNotNull(colName);
      } else if (/^DROP\s+NOT\s+NULL/i.test(colAction)) {
        table.alterColumnDropNotNull(colName);
      }
      return;
    }
  }

  // ── ADD CONSTRAINT ──
  {
    const addCon = action.match(
      /^ADD\s+CONSTRAINT\s+(.+)/i
    );
    if (addCon) {
      table.addConstraint("CONSTRAINT " + addCon[1].replace(/;$/, "").trim());
      return;
    }
  }

  // ── DROP CONSTRAINT ──
  {
    const dropCon = action.match(
      /^DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/i
    );
    if (dropCon) {
      table.dropConstraint(dropCon[1]);
      return;
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Scan all migrations and reconstruct the final schema of every table.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.clean=true]  Remove the output dir before writing.
 * @returns {{ count: number, items: Array }} sorted TableDef instances.
 */
export function run({ clean = true } = {}) {
  const dir   = join(OUTPUT_DIR, "tables");
  const files = listMigrationFiles();

  console.log(`[tables] Scanning ${files.length} migration files …`);

  const tables = new Map(); // normalized name → TableDef

  for (const file of files) {
    const sql = readMigration(file);

    // ─── CREATE TABLE ──────────────────────────────────────────────────
    {
      const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:public|auth)\.)?"?(\w+)"?\s*\(/gi;
      let m;
      while ((m = re.exec(sql)) !== null) {
        if (isInsideComment(sql, m.index)) { re.lastIndex = m.index + 1; continue; }
        if (isInsideDollarQuote(sql, m.index)) { re.lastIndex = m.index + 1; continue; }

        const rawName = m[1];
        const name = normalizeName(rawName);

        const openParen = m.index + m[0].length - 1;
        const closeParen = findMatchingParen(sql, openParen);
        const body = sql.slice(openParen + 1, closeParen);

        const { columns, tableConstraints } = parseCreateTableBody(body);

        const table = new TableDef(name, file);
        table.columns = columns;
        table.tableConstraints = tableConstraints;

        const prev = tables.get(name);
        if (prev) {
          table.history = [...prev.history, `-- Recreated in ${file}`];
        }

        tables.set(name, table);
      }
    }

    // ─── DROP TABLE ────────────────────────────────────────────────────
    {
      const re = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(?:public|auth)\.)?"?(\w+)"?/gi;
      let m;
      while ((m = re.exec(sql)) !== null) {
        if (isInsideComment(sql, m.index)) { re.lastIndex = m.index + 1; continue; }
        if (isInsideDollarQuote(sql, m.index)) { re.lastIndex = m.index + 1; continue; }
        const name = normalizeName(m[1]);
        tables.delete(name);
      }
    }

    // ─── ALTER TABLE ───────────────────────────────────────────────────
    {
      const re = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(?:public|auth)\.)?"?(\w+)"?/gi;
      let m;
      while ((m = re.exec(sql)) !== null) {
        if (isInsideComment(sql, m.index)) { re.lastIndex = m.index + 1; continue; }
        if (isInsideDollarQuote(sql, m.index)) { re.lastIndex = m.index + 1; continue; }

        const name = normalizeName(m[1]);
        const table = tables.get(name);
        if (!table) continue;

        const stmtEnd = findStatementEnd(sql, m.index);
        const stmt = sql.slice(m.index, stmtEnd).replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
        const afterTable = stmt.slice(m[0].length).trim().replace(/;$/, "").trim();

        table.history.push(`-- [${file}] ${stmt}`);

        const actions = splitAlterActions(afterTable);
        for (const action of actions) {
          applyAlterAction(table, action, file);
        }

        if (table._pendingRename) {
          const newName = table._pendingRename;
          delete table._pendingRename;
          tables.delete(name);
          table.name = newName;
          tables.set(newName, table);
        }
      }
    }
  }

  // ─── Output ────────────────────────────────────────────────────────────

  const sorted = [...tables.values()].sort((a, b) => a.name.localeCompare(b.name));
  console.log(`[tables] Found ${sorted.length} tables`);

  if (clean && existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });

  for (const table of sorted) {
    const lines = [];
    lines.push(`-- Table: ${table.name}`);
    lines.push(`-- Source: ${table.sourceFile}`);
    if (table.history.length) {
      lines.push(`-- Modifications: ${table.history.length} ALTER statement(s)`);
    }
    lines.push(`-- Auto-extracted by extract-db-tables.js`);
    lines.push(``);

    lines.push(`CREATE TABLE public.${table.name} (`);

    const entries = [];
    for (const col of table.columns) {
      let def = `  ${col.name} ${col.type}`;
      if (col.constraints) def += ` ${col.constraints}`;
      entries.push(def);
    }
    for (const con of table.tableConstraints) {
      entries.push(`  ${con}`);
    }
    lines.push(entries.join(",\n"));
    lines.push(`);`);

    if (table.rlsEnabled) {
      lines.push(``);
      lines.push(`ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;`);
    }

    if (table.history.length) {
      lines.push(``);
      lines.push(`-- ═══ Modification History ═══`);
      for (const h of table.history) {
        lines.push(h);
      }
    }

    writeFileSync(join(dir, `${table.name}.sql`), lines.join("\n") + "\n", "utf-8");
  }

  console.log(`[tables] Wrote ${sorted.length} files to db-reference/tables/`);
  return { count: sorted.length, items: sorted };
}

// ─── Standalone Execution ────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { count, items } = run();

  // Write standalone manifest
  const manifest = [
    "# Database Tables Reference",
    `\nAuto-generated on ${new Date().toISOString().split("T")[0]}`,
    `\nTotal: ${count} tables\n`,
    `> Each file contains the **reconstructed** CREATE TABLE as it would appear`,
    `> after all migrations have been applied. The modification history is`,
    `> appended as comments at the bottom of each file.\n`,
  ];

  manifest.push(`## Tables (${count})\n`);
  for (const table of items) {
    const cols = table.columns.length;
    const mods = table.history.length;
    const rls = table.rlsEnabled ? " 🔒" : "";
    const modStr = mods > 0 ? ` (${mods} modifications)` : "";
    manifest.push(`- [\`${table.name}\`](tables/${table.name}.sql) — ${cols} columns${modStr}${rls}`);
  }
  manifest.push("");

  writeFileSync(join(OUTPUT_DIR, "TABLES.md"), manifest.join("\n"), "utf-8");
  console.log(`  Wrote TABLES.md manifest`);
  console.log(`\nDone.`);
}
