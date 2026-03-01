/**
 * sql-parser.js
 *
 * Shared SQL parsing utilities used by the database reference extraction
 * scripts (functions, triggers, tables).
 *
 * Every helper is a pure function — no side-effects, no file I/O.
 * Path constants and the migration-loader are also exported for convenience.
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// ─── Path Constants ──────────────────────────────────────────────────────

export const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "supabase", "migrations");
export const OUTPUT_DIR     = join(import.meta.dirname, "..", "..", "supabase", "db-reference");

// ─── SQL Keywords (never valid as object identifiers) ────────────────────

export const SQL_KEYWORDS = new Set([
  "for", "if", "in", "as", "is", "on", "or", "to", "by", "of", "at",
  "no", "do", "set", "all", "key", "not", "new", "old", "end", "row",
  "any", "and", "the", "with", "from", "into", "each", "that", "this",
  "null", "true", "false", "case", "when", "then", "else", "loop",
  "exit", "next", "open", "close", "begin", "table", "index", "grant",
  "where", "group", "order", "limit", "union", "check", "using",
]);

// ─── Low-level String Skippers ───────────────────────────────────────────

/** Advance past a single-quoted string (handles '' escapes). */
export function skipSingleQuote(sql, i) {
  let j = i + 1;
  while (j < sql.length) {
    if (sql[j] === "'" && sql[j + 1] !== "'") return j + 1;
    if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
    j++;
  }
  return j;
}

/** Advance past a dollar-quoted string: $tag$...$tag$ */
export function skipDollarQuote(sql, i) {
  const m = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
  if (!m) return i + 1;
  const tag = m[0];
  const end = sql.indexOf(tag, i + tag.length);
  return end === -1 ? sql.length : end + tag.length;
}

// ─── Statement Boundary Detection ────────────────────────────────────────

/**
 * Find the end of a top-level SQL statement (the first `;` not inside
 * a string, comment, or dollar-quoted block).
 */
export function findStatementEnd(sql, startIdx) {
  let i = startIdx;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i); i = nl === -1 ? sql.length : nl + 1; continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2); i = end === -1 ? sql.length : end + 2; continue;
    }
    if (ch === "'") { i = skipSingleQuote(sql, i); continue; }
    if (ch === "$") {
      const m = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (m) { i = skipDollarQuote(sql, i); continue; }
    }
    if (ch === ";") return i + 1;
    i++;
  }
  return sql.length;
}

// ─── Context Detection ───────────────────────────────────────────────────

/**
 * Returns true if `pos` is inside a dollar-quoted block ($tag$...$tag$).
 */
export function isInsideDollarQuote(sql, pos) {
  let i = 0, tag = null;
  while (i < pos) {
    const ch = sql[i];
    if (!tag && ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i); i = nl === -1 ? pos : nl + 1; continue;
    }
    if (!tag && ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2); i = end === -1 ? pos : end + 2; continue;
    }
    if (!tag && ch === "'") { i = skipSingleQuote(sql, i); continue; }
    if (ch === "$") {
      const m = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (m) {
        const t = m[0];
        if (!tag)      { tag = t;    i += t.length; continue; }
        if (t === tag) { tag = null;  i += t.length; continue; }
      }
    }
    i++;
  }
  return tag !== null;
}

/**
 * Returns true if `pos` is inside a SQL comment (-- line or /* block *​/).
 */
export function isInsideComment(sql, pos) {
  // Line comment: look for -- before pos on the same line
  const lineStart = sql.lastIndexOf("\n", pos - 1) + 1;
  const linePrefix = sql.slice(lineStart, pos);
  let i = 0;
  while (i < linePrefix.length) {
    if (linePrefix[i] === "'") { i = skipSingleQuote(linePrefix, i); continue; }
    if (linePrefix[i] === "-" && linePrefix[i + 1] === "-") return true;
    i++;
  }
  // Block comment: scan from start for unclosed /* */
  let inBlock = false, j = 0;
  while (j < pos) {
    if (!inBlock && sql[j] === "'") { j = skipSingleQuote(sql, j); continue; }
    if (!inBlock && sql[j] === "-" && sql[j + 1] === "-") {
      const nl = sql.indexOf("\n", j); j = nl === -1 ? pos : nl + 1; continue;
    }
    if (!inBlock && sql[j] === "/" && sql[j + 1] === "*") { inBlock = true;  j += 2; continue; }
    if (inBlock  && sql[j] === "*" && sql[j + 1] === "/") { inBlock = false; j += 2; continue; }
    j++;
  }
  return inBlock;
}

// ─── Higher-level Parsers ────────────────────────────────────────────────

/**
 * Normalize a table / object name: strip public/auth/… schema, quotes,
 * lowercase.
 */
export function normalizeName(raw) {
  return raw
    .replace(/^(?:public|auth|extensions|storage)\./, "")
    .replace(/"/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Split a string by `delimiter` at the top level only (not inside parens,
 * single-quotes, or dollar-quotes).
 */
export function splitTopLevel(str, delimiter = ",") {
  const parts = [];
  let depth = 0, start = 0, i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === "'") { i = skipSingleQuote(str, i); continue; }
    if (ch === "$") {
      const m = str.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (m) { i = skipDollarQuote(str, i); continue; }
    }
    if (ch === "(") { depth++; i++; continue; }
    if (ch === ")") { depth--; i++; continue; }
    if (depth === 0 && str.slice(i, i + delimiter.length) === delimiter) {
      parts.push(str.slice(start, i).trim());
      i += delimiter.length;
      start = i;
      continue;
    }
    i++;
  }
  const last = str.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

/**
 * Find the matching closing paren for an opening paren at `openIdx`.
 * Respects strings, dollar-quotes, and comments.
 */
export function findMatchingParen(sql, openIdx) {
  let depth = 1, i = openIdx + 1;
  while (i < sql.length && depth > 0) {
    const ch = sql[i];
    if (ch === "'") { i = skipSingleQuote(sql, i); continue; }
    if (ch === "$") {
      const m = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (m) { i = skipDollarQuote(sql, i); continue; }
    }
    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i); i = nl === -1 ? sql.length : nl + 1; continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2); i = end === -1 ? sql.length : end + 2; continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    i++;
  }
  return i - 1;
}

// ─── Migration Loader ────────────────────────────────────────────────────

/**
 * Returns a sorted list of migration filenames (ascending / chronological).
 */
export function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();
}

/**
 * Read a single migration file and return its contents as a string.
 */
export function readMigration(fileName) {
  return readFileSync(join(MIGRATIONS_DIR, fileName), "utf-8");
}
