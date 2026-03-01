-- Table: favorites
-- Source: 00002_create_favorites.sql
-- Modifications: 1 ALTER statement(s)
-- Auto-extracted by extract-db-tables.js

CREATE TABLE public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now()
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ═══ Modification History ═══
-- [00002_create_favorites.sql] alter table favorites enable row level security;
