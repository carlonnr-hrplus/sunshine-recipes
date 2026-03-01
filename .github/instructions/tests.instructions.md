---
applyTo: "**/*.{test,spec}.{ts,tsx}"
---

# Testing mandatory rules
- Use Vitest + React Testing Library.
- Prefer tests that cover user behavior (render, click, type).
- Avoid snapshots unless they add value.
- Keep tests deterministic and fast.
- Add at least one smoke test for auth gating and one for core CRUD.
