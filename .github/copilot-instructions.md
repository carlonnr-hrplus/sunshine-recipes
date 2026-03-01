# Copilot Instructions (Opinionated Autonomous Greenfield App Builder)

## Mission

You are an autonomous coding agent for this repository.

Your responsibilities:

- Implement complete, production-ready features end-to-end.
- Scaffold everything necessary when missing.
- Prefer executing work via CLI/scripts rather than asking the user to manually create files.
- Leave the repository runnable at all times.
- Maintain architectural consistency.
- Avoid unnecessary back-and-forth.

Only ask the user for:
- API keys
- Supabase project IDs
- Secrets
- Explicit product decisions

Otherwise, assume safe defaults and proceed.

---

# Default Stack (Mandatory for Greenfield Projects)

Unless explicitly overridden by the user, the stack is:

Frontend:
- Vite
- React + TypeScript
- React Router v6 (Declarative mode using BrowserRouter)
- Tailwind CSS

Backend / Platform:
- Supabase (Auth + Postgres + Storage)
- SQL migrations for schema + RLS evolution
- Supabase Edge Functions (if server-side logic required)

Validation:
- Zod for runtime validation

Testing:
- Vitest
- React Testing Library

Tooling:
- Node.js + npm
- ESLint
- Prettier

Database Utilities:
- Node scripts in `scripts/`
- `.database-backups/` for backups (gitignored)
- Required npm scripts:
  - `db:list`
  - `db:backup`
  - `db:restore`

---

# Required Available Commands

The following npm scripts must exist in `package.json`:

## Core
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Database
- `npm run db:list` - List database backups
- `npm run db:backup` - Create a backup in `.database-backups/`
- `npm run db:restore <backup-id>` - Restore a backup to the linked Supabase project

If any are missing, you must create them.

## Development Server
The development server must run at:

http://localhost:5173/

when using `npm run dev` or the VS Code task "Start Development Server".

---

# Greenfield Bootstrapping Behavior

If the repository is empty or missing core scaffolding, you MUST:

1. Scaffold Vite (React + TypeScript).
2. Install and configure React Router v6 (Declarative mode).
3. Configure Tailwind + PostCSS + Autoprefixer.
4. Configure ESLint + Prettier.
5. Configure Vitest + React Testing Library.
6. Create Supabase client module.
7. Create `.env.example`.
8. Create `supabase/migrations/` directory.
9. Add backup/restore tooling:
   - `scripts/db-list.js`
   - `scripts/db-backup.js`
   - `scripts/db-restore.js`
   - `.database-backups/` gitignored
10. Provide a clean README with setup instructions.
11. Ensure all required npm scripts exist.

---

# Autonomy Rules (Do Work, Don’t Ask)

- Default to implementing fully.
- Create files, update configs, wire features automatically.
- Never leave partial scaffolds.
- Ensure `.database-backups/` is gitignored.
- Ensure required npm scripts exist.
- Migrations must be strictly idempotent.
- Restore workflow must remain consistent and safe.
- Verify build integrity before finishing.

Idempotency Requirement:
All migrations and restore processes must be safe to run multiple times and must not fail on databases that already contain data.

---

# Vertical Slice Bias (Mandatory)

Every feature must include:

- UI
- Routing
- State management
- Data access layer
- Zod validation
- Auth guard if required
- Loading state
- Error state
- Empty state
- Basic test coverage
- Documentation updates

Features must be complete, not skeletal.

---

# Review-Friendly Changes

- Modify only necessary files.
- Avoid formatting churn.
- Preserve folder structure clarity.
- Avoid refactoring unrelated modules.

---

# Consistency Checks (Before Finalizing)

- `npm run build` succeeds.
- No missing imports.
- No TypeScript errors.
- Routing works correctly.
- Environment variables match `.env.example`.
- Supabase client does not expose service role keys.
- Required npm scripts exist.
- Backup/restore scripts exist.

---

# Project Structure (Preferred Baseline with Intent)

- public/                         (static assets served directly)
- src/
  - main.tsx                      (application entry point)
  - app/                          (application shell, router setup, providers)
  - assets/                       (images, fonts, icons, media)
  - components/                   (reusable UI components)
  - constants/                    (application-wide constants)
  - contexts/                     (React contexts)
  - hooks/                        (custom reusable hooks)
  - lib/                          (clients, singletons, environment utilities)
  - pages/                        (page-level components if not colocated)
  - routes/                       (route-level components and layouts)
  - services/                     (API/data access layer)
  - styles/                       (global CSS and Tailwind entry)
  - test/                         (test utilities or global test files)
  - types/                        (shared TypeScript types/interfaces)
  - utils/                        (general utilities/helpers)
- supabase/
  - functions/                    (Edge Functions)
  - migrations/                   (SQL migrations, strictly idempotent)
- scripts/
  - db-list.js
  - db-backup.js
  - db-restore.js
- .database-backups/              (local backups, gitignored)

Follow existing structure if the repository evolves.

---

# React Router v6 Conventions (Declarative Mode)

- Use `<BrowserRouter>` with `<Routes>` and `<Route>`.
- Define routing in `src/app/router.tsx`.
- Do NOT use `createBrowserRouter` or data-router APIs.
- Data fetching occurs in hooks/services, not route definitions.
- Keep route components thin.
- Protected routes must redirect unauthenticated users.
- Preserve intended destination on redirect.

---

# UI Conventions

- Tailwind-first styling.
- Accessible semantic HTML required.
- Forms must include:
  - labels
  - validation messages
  - disabled state
  - double-submit prevention
- All async views must include:
  - loading state
  - error state
  - empty state
  - success state

---

# Supabase Conventions (Mandatory)

- Use Supabase JS client.
- Single browser client module in `src/lib/supabaseClient.ts`.
- Never expose service role keys to the browser.
- All schema changes go through SQL migrations.
- Enable RLS for all user-scoped tables.
- Create policies reflecting access rules.
- Index frequently queried columns.

---

# Database Backup/Restore Policy (Tier 1)

Backups:

- Stored in `.database-backups/`
- Never committed to git
- Must include:
  - `<timestamp>_schema.sql`
  - `<timestamp>_data.sql`
  - `<timestamp>_info.txt`

Restore must:

1. Run `supabase db reset --linked`
2. Restore schema SQL
3. Restore data SQL
4. Sync `supabase_migrations.schema_migrations` to match local migrations
5. Sync Edge Functions:
   - Delete remote-only functions
   - Deploy local functions

Scripts must:
- Not crash on missing files
- Print clear status messages
- Exit with consistent exit codes

---

# SQL Migration Rules (Strict Idempotency)

Migrations must:

- Be strictly idempotent.
- Succeed on:
  - Fresh databases
  - Existing databases
  - Databases with data
  - Redeployments
- Use:
  - `create table if not exists`
  - `create index if not exists`
  - `alter table add column if not exists`
  - Guarded DO $$ blocks where necessary
- Enable RLS idempotently.
- Avoid destructive changes unless explicitly requested.
- Use snake_case naming.

No migration may fail if run twice.

---

# Security Baseline

- No secrets committed.
- Guard protected routes.
- Handle auth session refresh.
- Validate external inputs.
- Avoid unsafe HTML injection.

---

# Testing Baseline

- Add smoke test per major flow.
- Prefer behavior-based tests.
- Tests must be deterministic.
- Avoid unnecessary snapshot tests.

---

# Dependency Discipline

- Prefer fewer dependencies.
- Justify additions.
- Avoid overlapping tooling.

---

# Documentation Requirements

README must include:

- Setup instructions
- Environment variables
- Dev/build/test commands
- Supabase linking instructions
- Backup/restore workflow
- Migration policy explanation
