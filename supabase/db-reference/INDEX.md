# Database Reference

Auto-generated on 2026-03-01

Total: **2** functions · **2** triggers · **3** tables

> **How freshness is guaranteed:** migrations are processed in ascending
> (chronological) order. Each object is keyed by name, so a later migration
> overwrites any earlier definition. Objects that are DROPped after their
> last CREATE are excluded entirely.

## Functions (2)

- [`get_favorite_recipes`](functions/get_favorite_recipes.sql) — from 00004_profiles_and_secure_favorites.sql
- [`handle_auth_user_change`](functions/handle_auth_user_change.sql) ⚡ — from 00004_profiles_and_secure_favorites.sql

## Triggers (2)

- [`on_auth_user_created`](triggers/on_auth_user_created.sql) — from 00004_profiles_and_secure_favorites.sql
- [`on_auth_user_updated`](triggers/on_auth_user_updated.sql) — from 00004_profiles_and_secure_favorites.sql

## Tables (3)

- [`favorites`](tables/favorites.sql) — 4 columns (1 modifications) 🔒
- [`profiles`](tables/profiles.sql) — 5 columns (1 modifications) 🔒
- [`recipes`](tables/recipes.sql) — 15 columns (5 modifications) 🔒
