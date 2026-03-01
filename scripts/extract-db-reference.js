/**
 * extract-db-reference.js  — ORCHESTRATOR
 *
 * Runs all three database reference extractors in sequence and writes a
 * combined INDEX.md manifest that links to every function, trigger, and
 * table file.
 *
 * Usage:  node scripts/extract-db-reference.js
 *
 * Individual extractors can also be run standalone:
 *   node scripts/extract-db-functions.js
 *   node scripts/extract-db-triggers.js
 *   node scripts/extract-db-tables.js
 */

import { writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";

import { OUTPUT_DIR } from "./lib/sql-parser.js";
import { run as runFunctions } from "./extract-db-functions.js";
import { run as runTriggers }  from "./extract-db-triggers.js";
import { run as runTables }    from "./extract-db-tables.js";

// ─── Main ────────────────────────────────────────────────────────────────

console.log("═══ Database Reference Extraction ═══\n");

// 1. Clean entire output directory
if (existsSync(OUTPUT_DIR)) rmSync(OUTPUT_DIR, { recursive: true });

// 2. Run each extractor (clean=false since we already wiped the parent)
const { count: fnCount,  items: functions } = runFunctions({ clean: false });
console.log();
const { count: trCount,  items: triggers }  = runTriggers({ clean: false });
console.log();
const { count: tblCount, items: tables }    = runTables({ clean: false });

// 3. Combined manifest
const lines = [
  "# Database Reference",
  `\nAuto-generated on ${new Date().toISOString().split("T")[0]}`,
  `\nTotal: **${fnCount}** functions · **${trCount}** triggers · **${tblCount}** tables\n`,
  `> **How freshness is guaranteed:** migrations are processed in ascending`,
  `> (chronological) order. Each object is keyed by name, so a later migration`,
  `> overwrites any earlier definition. Objects that are DROPped after their`,
  `> last CREATE are excluded entirely.\n`,
];

// Functions
lines.push(`## Functions (${fnCount})\n`);
for (const def of functions) {
  const tag = def.returnsTrigger ? " ⚡" : "";
  lines.push(`- [\`${def.name}\`](functions/${def.name}.sql)${tag} — from ${def.sourceFile}`);
}
lines.push("");

// Triggers
lines.push(`## Triggers (${trCount})\n`);
for (const def of triggers) {
  lines.push(`- [\`${def.name}\`](triggers/${def.name}.sql) — from ${def.sourceFile}`);
}
lines.push("");

// Tables
lines.push(`## Tables (${tblCount})\n`);
for (const table of tables) {
  const cols = table.columns.length;
  const mods = table.history.length;
  const rls  = table.rlsEnabled ? " 🔒" : "";
  const modStr = mods > 0 ? ` (${mods} modifications)` : "";
  lines.push(`- [\`${table.name}\`](tables/${table.name}.sql) — ${cols} columns${modStr}${rls}`);
}
lines.push("");

writeFileSync(join(OUTPUT_DIR, "INDEX.md"), lines.join("\n"), "utf-8");
console.log(`\n  Wrote combined INDEX.md manifest`);

const total = fnCount + trCount + tblCount;
console.log(`\n═══ Done. ${total} files written to supabase/db-reference/ ═══`);
