-- Source: 00004_profiles_and_secure_favorites.sql
-- Auto-extracted by extract-db-functions.js

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
