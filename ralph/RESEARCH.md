# /create Route Research

## 1. Route & Page Structure ✅

### Routing Setup

- **Config**: `app/routes.ts` uses `flatRoutes()` from `@react-router/fs-routes` — pure file-based routing
- **React Router**: v7.13.0 with SSR enabled via `react-router.config.ts` (Vercel preset)
- **Convention**: `_in.` prefix = authenticated layout; `$param` = dynamic segment; `.` = URL separator

### Route Hierarchy

```
_in.tsx                                          → AuthenticatedLayout (requireAuthWithClient)
└── _in.$brandSlug.tsx                           → Brand-level layout/redirect
    └── _in.$brandSlug.$projectSlug.create.tsx   → Main create route (4,398 lines)
```

### Key Files

| File | Purpose |
|------|---------|
| `app/routes/_in.tsx` | Auth layout wrapper. Loader calls `requireAuthWithClient()`. Custom `shouldRevalidate` skips revalidation within same brand. |
| `app/routes/_in.$brandSlug.create.tsx` | **Redirect helper**: `/:brandSlug/create` → `/:brandSlug/:projectSlug/create`. Uses cookie for last-visited project, falls back to most recently updated project, or redirects to `/templates` if no projects. |
| `app/routes/_in.$brandSlug.$projectSlug.create.tsx` | **Main create route**. Layout route with loader, action, and component. |

### URL Structure

- **Base**: `/:brandSlug/:projectSlug/create`
- **Tabs via query params** (not nested routes):
  - `?view=edit` (default) — Timeline editor
  - `?view=script` — Script editor
  - `?view=workflow` — Workflow canvas
- **Other query params**: `?timeline={id}`, `?locale={locale}`, `?genaiAssetId={id}`, `?showAssetId={id}`

### Loader (lines 407–544)

Loads: auth + brand verification, project details, brand locales, all timelines for project, active timeline (from URL or `current_timeline_asset_id`). Creates a default timeline with Video+Audio tracks if none exists. **Returns deferred promises** for `timelineData` (via `loadTimelineData()` at line 238) and `scriptData` (via `loadScriptData()` at line 299).

### Action (lines 594–696)

Dispatches on `intent` form field. Supports: `save`, `save-script`, `create-shot-nodes`, `update-shot-node`, `delete-shot-nodes`, `process-shot`, `load-timeline`, `create-scene-timeline`, `update-scene-timeline-audio`, `reset-scene-timeline`, `create-all-scene-timelines`, `list-script-versions`, `create-script-version`, `restore-script-version`, `translate-dialogue`, `translate-single-dialogue`, `set-script-default-locale`.

### Component (line 2017 — `CreateLayout()`)

Single large component using conditional rendering for tabs (no `<Outlet/>`). Uses `CreateContext` for deep state sharing. **Lazy-loaded children**: `TimelineEditor`, `ScriptWorkspace`, `WorkflowPanel`, `ShotEditModal`, `TimelineWorkflowModal`.

### Local Storage

`app/lib/localStorage/create-panel-storage.ts` — persists panel open/closed state, zoom, track height, snapping, preview mode, asset panel filters.

### Related Routes

- `_in.$brandSlug.$projectSlug.storyboard.create.tsx` — Storyboard creation (separate flow)
- API routes: `/api/assets/create`, `/api/assets/create-from-storage`, `/api/assets/create-version`

## 2. Components & UI 🔍

## 3. API & Server Actions 🔍

## 4. Database & Data Model 🔍

## 5. External Services & Integrations 🔍

## 6. Auth & Permissions 🔍

## 7. Business Logic & Edge Cases 🔍
