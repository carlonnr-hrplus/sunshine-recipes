# ☀️ Sunshine Recipes

A recipe book app with full CRUD operations, search, filtering, and favorites functionality — built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Browse recipes** — public homepage with recipe cards
- **Search** — full-text search across titles and descriptions
- **Filter by category** — Appetizer, Breakfast, Lunch, Dinner, Dessert, and more
- **Create / Edit / Delete** — full CRUD for authenticated users
- **Favorites** — save and manage your favorite recipes
- **Auth** — email/password sign-up and sign-in via Supabase Auth
- **Responsive** — mobile-friendly layout with Tailwind CSS

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router v6 (declarative) |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth + Postgres + RLS) |
| Validation | Zod |
| Testing | Vitest + React Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) project

### Setup

1. **Clone the repo** and install dependencies:

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. **Apply database migrations:**

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:5173/](http://localhost:5173/)

## Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:list` | List database backups |
| `npm run db:backup` | Create database backup |
| `npm run db:restore` | Restore database backup |

## Database

See [supabase/README.md](supabase/README.md) for full schema documentation and setup instructions.

### Migration Policy

All SQL migrations in `supabase/migrations/` are **strictly idempotent** — they use `IF NOT EXISTS` guards and can be safely re-run against any database state.

## Database Backups

Backups are stored in `.database-backups/` (gitignored). Each backup includes:

- `<timestamp>_schema.sql` — database schema
- `<timestamp>_data.sql` — database data
- `<timestamp>_info.txt` — backup metadata

Use `npm run db:backup` to create and `npm run db:restore <backup-id>` to restore.

## Project Structure

```
src/
  main.tsx                 — app entry point
  app/                     — app shell, router
  components/              — reusable UI components
  constants/               — categories, etc.
  contexts/                — React contexts (Auth)
  hooks/                   — custom hooks (useRecipes, useFavorites)
  lib/                     — Supabase client
  routes/                  — page-level route components
  services/                — API/data access layer
  styles/                  — global CSS + Tailwind entry
  test/                    — test setup
  types/                   — shared TypeScript types
  utils/                   — validation schemas, helpers
supabase/
  migrations/              — SQL migrations (idempotent)
scripts/                   — DB backup/restore tooling
```

## License

Private
