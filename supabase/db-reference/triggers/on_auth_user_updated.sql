-- Source: 00004_profiles_and_secure_favorites.sql
-- Auto-extracted by extract-db-triggers.js

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_change();
