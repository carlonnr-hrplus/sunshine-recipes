-- Source: 00004_profiles_and_secure_favorites.sql
-- Auto-extracted by extract-db-functions.js

CREATE OR REPLACE FUNCTION handle_auth_user_change()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
