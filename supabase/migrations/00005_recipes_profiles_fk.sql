-- Migration: Add FK from recipes.user_id to profiles.id
-- so PostgREST can resolve the embedded join.
-- Idempotent: safe to run multiple times.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_user_id_profiles_fk'
  ) THEN
    ALTER TABLE recipes
      ADD CONSTRAINT recipes_user_id_profiles_fk
      FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;
