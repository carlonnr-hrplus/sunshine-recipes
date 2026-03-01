---
applyTo: "supabase/migrations/*.sql"
---

# SQL migration mandatory rules (strict idempotency + safe redeploy)
- Migrations must be strictly idempotent and safe to run multiple times.
- A migration must not fail whether:
  - the database is fresh, OR
  - tables already exist, OR
  - there is existing data, OR
  - it is being applied to an existing client environment.
- Prefer additive, safe changes:
  - `create table if not exists`
  - `create index if not exists`
  - `alter table ... add column if not exists`
  - guarded `alter` operations using DO $$ blocks when Postgres lacks IF EXISTS / IF NOT EXISTS support
- RLS/policies must be idempotent:
  - use `alter table ... enable row level security`
  - create policies with checks to avoid duplicates (DO $$ with existence checks), or drop+create only if safe
- Never write destructive schema changes (drop column/table) unless the user explicitly requests it and you include a safe migration plan (expand/contract), and it remains re-runnable without failure.
- Naming conventions:
  - tables: snake_case plural (e.g., todos)
  - columns: snake_case
- Include indexes for common query patterns and foreign keys.
