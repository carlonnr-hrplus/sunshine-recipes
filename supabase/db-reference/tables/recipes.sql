-- Table: recipes
-- Source: 00001_create_recipes.sql
-- Modifications: 5 ALTER statement(s)
-- Auto-extracted by extract-db-tables.js

CREATE TABLE public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  prep_time integer not null default 0,
  cook_time integer not null default 0,
  servings integer not null default 1,
  category text not null default 'Dinner',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_public boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- ═══ Modification History ═══
-- [00001_create_recipes.sql] alter table recipes enable row level security;
-- [00003_add_recipe_visibility.sql] ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
-- [00003_add_recipe_visibility.sql] ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
-- [00003_add_recipe_visibility.sql] ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_email text;
-- [00004_profiles_and_secure_favorites.sql] ALTER TABLE recipes DROP COLUMN IF EXISTS user_email;
