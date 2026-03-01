-- Migration: Create recipes table
-- Idempotent: safe to run multiple times

create table if not exists recipes (
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
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_recipes_user_id on recipes(user_id);
create index if not exists idx_recipes_category on recipes(category);
create index if not exists idx_recipes_created_at on recipes(created_at desc);

-- Enable RLS
alter table recipes enable row level security;

-- Policies (idempotent: drop if exists, then create)
DO $$ BEGIN
  -- Anyone can read recipes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_select_all'
  ) THEN
    CREATE POLICY recipes_select_all ON recipes FOR SELECT USING (true);
  END IF;

  -- Authenticated users can insert their own recipes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_insert_own'
  ) THEN
    CREATE POLICY recipes_insert_own ON recipes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can update their own recipes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_update_own'
  ) THEN
    CREATE POLICY recipes_update_own ON recipes FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can delete their own recipes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_delete_own'
  ) THEN
    CREATE POLICY recipes_delete_own ON recipes FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
