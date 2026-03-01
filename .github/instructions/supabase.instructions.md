---
applyTo: "**/*"
---

# Supabase mandatory rules
- Use Supabase for auth, database, and storage unless user explicitly requests otherwise.
- Create a single client module: `src/lib/supabaseClient.ts`.
- Use env vars (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY). Never hardcode secrets.
- Never use service role key in browser code.
- Schema changes must be done via SQL migrations under `supabase/migrations`.
- For each new table:
  - enable RLS
  - add policies for intended access
  - add indexes for common queries
- Provide a `supabase/README.md` with setup steps and local dev instructions.
