---
applyTo: "**/*.{ts,tsx}"
---

# Frontend (React) mandatory rules
- Use React + TypeScript.
- Routing must be React Router v6.
- Prefer functional components + hooks.
- Keep components small; extract reusable UI into `src/components`.
- Feature code should live in `src/features/<featureName>/`.
- Tailwind-first styling. Avoid introducing other styling systems.

## State and data fetching
- Prefer simple local state first.
- If data is shared across routes/components, create a feature-level hook (e.g., `useTodos`).
- Avoid duplicate fetches: centralize in a service + hook pattern.

## Forms
- Always provide:
  - labels
  - validation errors
  - disabled state while submitting
  - double-submit protection
- Prefer Zod validation schemas for form inputs.

## UX
- Every async view has loading/error/empty states.
- Navigation must handle signed-out behavior gracefully.

## Accessibility
- Use semantic elements and keyboard-friendly interactions.
- Buttons must include `type="button"` unless they submit forms.
