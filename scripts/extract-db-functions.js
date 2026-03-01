/**
 * extract-db-functions.js
 *
 * Extracts the latest version of every CREATE [OR REPLACE] FUNCTION from
 * the Supabase migration files and writes each to its own .sql file under
 *   supabase/db-reference/functions/
 *
 * Can be run standalone:      node scripts/extract-db-functions.js
 * Or imported by the orchestrator (extract-db-reference.js).
 */

import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "node:url";

import {
  OUTPUT_DIR,
  SQL_KEYWORDS,
  findStatementEnd,
  isInsideComment,
  isInsideDollarQuote,
  listMigrationFiles,
  readMigration,
} from "./lib/sql-parser.js";

// ─── Extraction Helper ───────────────────────────────────────────────────

/**
 * Extract all CREATE [OR REPLACE] FUNCTION definitions from a SQL string.
 * Returns an array of { name, returnsTrigger, body, sourceFile }.
 */
function extractFunctions(sql, fileName) {
  const results = [];
  const re =
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:(?:public|auth|extensions|storage)\.)?"?(\w+)"?/gi;

  let match;
  while ((match = re.exec(sql)) !== null) {
    const name     = match[1];
    const startIdx = match.index;

    if (SQL_KEYWORDS.has(name.toLowerCase())) { re.lastIndex = startIdx + 1; continue; }
    if (isInsideComment(sql, startIdx))       { re.lastIndex = startIdx + 1; continue; }
    if (isInsideDollarQuote(sql, startIdx))   { re.lastIndex = startIdx + 1; continue; }

    const endIdx = findStatementEnd(sql, startIdx);
    const body   = sql.slice(startIdx, endIdx).trim();
    if (body.length < 20) continue;

    const returnsTrigger = /RETURNS\s+TRIGGER/i.test(body);

    results.push({ name, returnsTrigger, body, sourceFile: fileName });
  }
  return results;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Scan all migrations and write the latest version of every function.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.clean=true]  Remove the output dir before writing.
 * @returns {{ count: number, items: Array }} sorted function definitions.
 */
export function run({ clean = true } = {}) {
  const dir   = join(OUTPUT_DIR, "functions");
  const files = listMigrationFiles();

  console.log(`[functions] Scanning ${files.length} migration files …`);

  // 1. Build latest-wins map
  const latest = new Map();
  for (const file of files) {
    const sql = readMigration(file);
    for (const d of extractFunctions(sql, file)) latest.set(d.name, d);
  }

  // 2. Remove objects DROPped after their last CREATE
  for (const file of files) {
    const sql = readMigration(file);
    const re  = /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:(?:public|auth)\.)?"?(\w+)"?\s*\(/gi;
    let m;
    while ((m = re.exec(sql)) !== null) {
      const def = latest.get(m[1]);
      if (def && files.indexOf(def.sourceFile) < files.indexOf(file)) {
        latest.delete(m[1]);
      }
    }
  }

  // 3. Sort
  const sorted = [...latest.values()].sort((a, b) => a.name.localeCompare(b.name));
  console.log(`[functions] Found ${sorted.length} functions`);

  // 4. Write files
  if (clean && existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });

  for (const def of sorted) {
    const header =
      `-- Source: ${def.sourceFile}\n` +
      `-- Auto-extracted by extract-db-functions.js\n\n`;
    writeFileSync(join(dir, `${def.name}.sql`), header + def.body + "\n", "utf-8");
  }

  console.log(`[functions] Wrote ${sorted.length} files to db-reference/functions/`);
  return { count: sorted.length, items: sorted };
}

// ─── Standalone Execution ────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
