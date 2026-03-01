-- Migration: Create favorites table
-- Idempotent: safe to run multiple times

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Unique constraint (idempotent via DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorites_user_recipe_unique'
  ) THEN
    ALTER TABLE favorites ADD CONSTRAINT favorites_user_recipe_unique UNIQUE (user_id, recipe_id);
  END IF;
END $$;

-- Indexes
create index if not exists idx_favorites_user_id on favorites(user_id);
create index if not exists idx_favorites_recipe_id on favorites(recipe_id);

-- Enable RLS
alter table favorites enable row level security;

-- Policies (idempotent)
DO $$ BEGIN
  -- Users can read their own favorites
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'favorites_select_own'
  ) THEN
    CREATE POLICY favorites_select_own ON favorites FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Users can insert their own favorites
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'favorites_insert_own'
  ) THEN
    CREATE POLICY favorites_insert_own ON favorites FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can delete their own favorites
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'favorites_delete_own'
  ) THEN
    CREATE POLICY favorites_delete_own ON favorites FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
