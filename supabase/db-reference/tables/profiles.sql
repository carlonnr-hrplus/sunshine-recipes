-- Table: profiles
-- Source: 00004_profiles_and_secure_favorites.sql
-- Modifications: 1 ALTER statement(s)
-- Auto-extracted by extract-db-tables.js

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ═══ Modification History ═══
-- [00004_profiles_and_secure_favorites.sql] ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
