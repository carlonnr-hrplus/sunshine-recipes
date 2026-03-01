-- Migration: Create profiles table, remove user_email from recipes,
--           secure favorites by removing RLS leak, add RPC for safe favorites fetch.
-- Idempotent: safe to run multiple times.

-- ──────────────────────────────────────────────
-- 1. Profiles table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles (needed to display author info)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_all'
  ) THEN
    CREATE POLICY profiles_select_all ON profiles FOR SELECT USING (true);
  END IF;
END $$;

-- Users can update only their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Trigger function: create/update profile row when a user is created or updated
CREATE OR REPLACE FUNCTION handle_auth_user_change()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_change();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_change();

-- Back-fill profiles for existing auth users
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- ──────────────────────────────────────────────
-- 2. Drop user_email from recipes
-- ──────────────────────────────────────────────
ALTER TABLE recipes DROP COLUMN IF EXISTS user_email;

-- ──────────────────────────────────────────────
-- 3. Fix RLS: private recipes must NOT be readable
--    just because they were favorited. Remove the
--    favorites sub-select from the SELECT policy.
-- ──────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_select_visible'
  ) THEN
    DROP POLICY recipes_select_visible ON recipes;
  END IF;

  CREATE POLICY recipes_select_visible ON recipes FOR SELECT
    USING (
      auth.uid() = user_id
      OR is_public = true
    );
END $$;

-- ──────────────────────────────────────────────
-- 4. Secure RPC: get_favorite_recipes()
--    Returns full data for own + public recipes,
--    limited data (id, title, category, is_public)
--    for private recipes the caller doesn't own.
--    Uses SECURITY DEFINER to bypass RLS and
--    controls what is returned explicitly.
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_favorite_recipes()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  ingredients jsonb,
  instructions text,
  prep_time integer,
  cook_time integer,
  servings integer,
  category text,
  image_url text,
  is_public boolean,
  is_anonymous boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_email text,
  author_full_name text,
  is_available boolean
) AS $$
DECLARE
  calling_user uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.title,
    CASE WHEN r.is_public OR r.user_id = calling_user THEN r.description        ELSE NULL END,
    CASE WHEN r.is_public OR r.user_id = calling_user THEN r.ingredients         ELSE '[]'::jsonb END,
    CASE WHEN r.is_public OR r.user_id = calling_user THEN r.instructions        ELSE NULL END,
    CASE WHEN r.is_public OR r.user_id = calling_user THEN r.prep_time           ELSE 0 END,
    CASE WHEN r.is_public OR r.user_id = calling_user THEN r.cook_time           ELSE 0 END,
    CASE WHEN r.is_public OR r.user_id = calling_user THEN r.servings            ELSE 0 END,
    r.category,
    CASE WHEN r.is_public OR r.user_id = calling_user THEN r.image_url           ELSE NULL END,
    r.is_public,
    r.is_anonymous,
    r.created_at,
    r.updated_at,
    CASE
      WHEN r.user_id = calling_user THEN NULL           -- frontend displays "You"
      WHEN r.is_anonymous           THEN NULL           -- frontend displays "Anonymous"
      ELSE p.email
    END AS author_email,
    CASE
      WHEN r.user_id = calling_user THEN NULL
      WHEN r.is_anonymous           THEN NULL
      ELSE p.full_name
    END AS author_full_name,
    (r.is_public OR r.user_id = calling_user) AS is_available
  FROM recipes r
  INNER JOIN favorites f ON f.recipe_id = r.id AND f.user_id = calling_user
  LEFT  JOIN profiles  p ON p.id = r.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
