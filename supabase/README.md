# Supabase Setup

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- A Supabase project (create one at [supabase.com](https://supabase.com))

## Local Development

1. Link your Supabase project:

   ```bash
   supabase link --project-ref <your-project-ref>
   ```

2. Apply migrations:

   ```bash
   supabase db push
   ```

3. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key:

   ```
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
   ```

## Migrations

SQL migrations are stored in `supabase/migrations/`. They are **strictly idempotent** — safe to run multiple times on any database state.

### Current Migrations

| File | Description |
| --- | --- |
| `00001_create_recipes.sql` | Creates `recipes` table with RLS policies |
| `00002_create_favorites.sql` | Creates `favorites` table with RLS policies |

## Tables

### recipes

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK, auto-generated |
| user_id | uuid | FK → auth.users |
| title | text | Required |
| description | text | Required |
| ingredients | jsonb | Array of strings |
| instructions | text | Required |
| prep_time | integer | Minutes |
| cook_time | integer | Minutes |
| servings | integer | Min 1 |
| category | text | e.g. "Dinner" |
| image_url | text | Nullable |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### favorites

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK, auto-generated |
| user_id | uuid | FK → auth.users |
| recipe_id | uuid | FK → recipes |
| created_at | timestamptz | Auto |

Unique constraint on `(user_id, recipe_id)`.

## RLS Policies

### recipes
- **Select**: Public read access
- **Insert/Update/Delete**: Owner only (`auth.uid() = user_id`)

### favorites
- **Select/Insert/Delete**: Owner only (`auth.uid() = user_id`)
