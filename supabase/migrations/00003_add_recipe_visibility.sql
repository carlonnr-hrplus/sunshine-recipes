-- Migration: Add visibility (public/private) and anonymous support to recipes
-- Idempotent: safe to run multiple times

-- Add is_public column (default false = private)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Add is_anonymous column (default false = show author email when public)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- Add user_email column (denormalized for display; set on insert/update)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_email text;

-- Index for public recipe queries
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);

-- Back-fill user_email for existing recipes from auth.users
-- (safe no-op if column was just added and no rows exist)
UPDATE recipes
SET user_email = u.email
FROM auth.users u
WHERE recipes.user_id = u.id
  AND recipes.user_email IS NULL;

-- Replace the old "anyone can read" SELECT policy with visibility-aware policy
-- Users can see: their own recipes, public recipes, or recipes they have favorited
DO $$ BEGIN
  -- Drop the old permissive select-all policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_select_all'
  ) THEN
    DROP POLICY recipes_select_all ON recipes;
  END IF;

  -- Create the new visibility-aware select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_select_visible'
  ) THEN
    CREATE POLICY recipes_select_visible ON recipes FOR SELECT
      USING (
        auth.uid() = user_id
        OR is_public = true
        OR id IN (SELECT recipe_id FROM favorites WHERE favorites.user_id = auth.uid())
      );
  END IF;
END $$;
