---
applyTo: "src/**/*.{ts,tsx}"
---

# Routing Mandatory Rules (React Router v6 - Declarative Mode)

## Router Definition
- Router must be defined in `src/app/router.tsx` (create if missing).
- Use `<BrowserRouter>` with `<Routes>` and `<Route>`.
- Do NOT use `createBrowserRouter`.
- Do NOT use `RouterProvider`.
- Do NOT use data-router APIs (no route loaders or route actions).

## Route Organization
- Routes live in `src/routes`.
- Layout routes should be defined explicitly using nested `<Route>` elements.
- Keep route components thin; move logic into features/hooks/services.

## Data Fetching
- Data fetching must occur inside:
  - feature-level hooks
  - services
  - or inside the component via hooks
- Route definitions must not contain data logic.

## Protected Routes
Protected routes must:
- Enforce authentication.
- Redirect unauthenticated users to `/login` (or equivalent).
- Preserve intended destination via:
  - location state, or
  - query parameter redirect pattern.

## Structure Expectations
- `main.tsx` mounts `<BrowserRouter>`.
- `router.tsx` exports a router component that renders `<Routes>`.
- Route components should be colocated under `src/routes`.

## Behavior Requirements
- Routing must compile without warnings.
- Navigation must not cause full page reloads.
- Deep links must function correctly.