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

## 2. Components & UI ✅

### Top-Level Structure

**`CreateLayout`** (line 2017 of main route) renders three tab views via conditional rendering:
- `edit` (default) — Timeline editor + viewer canvas
- `script` — Script workspace overlay
- `workflow` — Workflow panel overlay

**`CreateContext`** (lines 200–235) provides shared state:
```typescript
{ brand, project, engine, mediaPlayers, viewerRef, isTimelineLoaded,
  effectiveTimelineAssetId, scriptData, handleAddClipFromAsset,
  markChanged, engineForceUpdate }
```
Access via `useCreateContext()` hook.

### Lazy-Loaded Major Components

| Component | File | Purpose |
|-----------|------|---------|
| `TimelineEditor` | `app/components/modes/create/timeline-editor/TimelineEditor.tsx` | Canvas-based timeline with tracks, clips, playback, viewer |
| `ScriptWorkspace` | `app/components/script-editor/ScriptWorkspace.tsx` | Three-panel TipTap screenplay editor |
| `WorkflowPanel` | `app/components/modes/create/timeline-editor/components/WorkflowPanel.tsx` | Node-based AI workflow editor |
| `ShotEditModal` | `app/components/modes/create/timeline-editor/components/ShotEditModal.tsx` | Simple textarea modal for shot prompts |
| `TimelineWorkflowModal` | `app/components/modes/create/timeline-editor/components/TimelineWorkflowModal.tsx` | Full-screen workflow editor, auto-saves every 5s |

### Timeline Editor Sub-Components

- **`ViewerCanvas`** — HTML5 Canvas compositor for video/image preview at current frame
- **`TimelineTrackEditor`** — Composite: Toolbar + TrackSidebar + TimelineCanvas
- **`TimelineCanvas`** — Canvas-based timeline UI (ruler, tracks, clips, playhead, scrubbing, drag-to-move/trim, multi-select, auto-scroll, sub-timeline expansion)
- **`Toolbar`** — Transport (play/pause/seek), tools (split/delete/link), zoom, save indicator, export, timeline selector dropdown
- **`TrackSidebar`** — Track list with mute/hide, reorder via drag, add video/audio tracks
- **`SettingsModal`** — FPS, duration, resolution settings

### Script Editor Sub-Components

- **`OutlinerPanel`** (left) — Scene/dialogue hierarchy, timeline creation per scene
- **`ScriptEditorPanel`** (center) — TipTap (ProseMirror) screenplay editor
- **`CharacterPanel`** (right) — Character list with voice settings (ElevenLabs)
- **`CharacterDetailPanel`** — Voice selector per character
- **`ScriptCommentPanel`** — Anchor-based commenting

**Custom TipTap extensions**: `SceneHeading`, `Action`, `Character`, `Dialogue`, `Parenthetical`, `Transition`, `CharacterHighlight`, `DirectorTag`, `DirectorTagSuggestion`, `ScriptComment`, `Pagination`, `AutoFormat`

### Workflow/Canvas Sub-Components

Custom-built node editor (no react-flow):
- **`InfiniteCanvas`** — Pan/zoom canvas for node graph
- **`CanvasNode`** — Node with input/output ports, preview, status
- **`ConnectionsLayer`** — SVG bezier curves between nodes
- **`NodeSidebar`** / **`NodeSidebarContent`** — Dynamic settings per node type
- **`MegaCreateSection`** — Unified easy-mode UI for multi-model batch creation
- 30+ specialized node settings: `ImageGenerationSettings`, `ImageToVideoSettings`, `PromptField`, `ModelSelector`, `ImageUploadField`, `PublishAssetSettings`, etc.

**Node types**: `input-image`, `input-video`, `input-asset`, `text-input`, `generate-image`, `generate-video`, `image-to-video`, `prompt-enhancer`, `text-merge`, `publish-asset`

### Asset Components

Location: `app/components/modes/create/assets/`
- **`AssetSidePanel`** — Collections sidebar, grid/list view, drag-to-timeline, upload via `QuickImportDialog`, search & filter
- **`AssetBrowser`** / **`AssetBrowserGrid`** — Grid/timeline layouts, virtual scrolling
- **`AssetCard`** — Thumbnail, type icon, version badge, workflow indicator, selection
- **`AssetDetailModal`** — Full viewer with metadata, version history (triggered by `?showAssetId=`)
- **`AssetBrowserModal`** — Modal asset selector for workflow nodes
- **`CollectionBrowserModal`** — Character collection linking

### Shared Navigation

- **`SidePanel`** (`app/components/shared/navigation/SidePanel.tsx`) — Collapsible, resizable, position left/right, localStorage persistence via `panelId`

### UI Library Stack

- **Radix UI primitives** — 24+ packages (dialog, dropdown, tabs, tooltip, etc.)
- **Tailwind CSS v4** with `class-variance-authority` + `clsx` + `tailwind-merge` (shadcn/ui pattern)
- **Icons**: `lucide-react` (primary), `@radix-ui/react-icons` (supplementary)
- **Themes**: `next-themes` for dark/light mode
- **DnD**: `@dnd-kit` for asset reordering in workflow; native DnD for timeline clips
- **Hotkeys**: `react-hotkeys-hook`

Base components in `app/components/ui/` (~50 files): button, dialog, sheet, popover, tabs, input, textarea, select, checkbox, switch, slider, badge, skeleton, sonner (toasts), scroll-area, etc.

### State Management

- **No Zustand in create flow** — React Context + refs + localStorage + URL state
- **Ref-based engine** (`useTimelineEngine`) for 60fps performance — avoids re-renders during playback/scrubbing/dragging
- **URL state**: `?view=`, `?timeline=`, `?genaiAssetId=`, `?showAssetId=`, `?locale=`
- **LocalStorage**: Panel open/closed, zoom, track height, snapping, preview mode (keyed per tab)
- **Fetchers**: `scriptFetcher` (auto-save), `timelineFetcher` (load/switch timelines)
- **Supabase Channels**: Real-time script updates + processing job status

### Key UI Patterns

- **Canvas rendering**: Custom HTML5 Canvas for timeline + viewer (no external timeline library)
- **Portal-based preview**: Easy mode preview rendered via `createPortal()` into viewer area
- **Sub-timeline editing**: Nested timeline expand/collapse within parent
- **Keyboard shortcuts**: Space (play), Cmd+Z/Y (undo/redo), Backspace (delete), Cmd+S (save), Tab (script auto-format)
- **Resizable panels**: Drag handles with min/max constraints, persisted to localStorage
- **Loading states**: Suspense boundaries, skeleton loaders, inline spinners, progress indicators
- **No audio waveforms**: Audio clips rendered as solid rectangles

## 3. API & Server Actions ✅

### Action Function (lines 594–696)

Dispatches on two form fields: `intent` (timeline/workflow ops) and `action` (script ops). All handlers wrapped in try-catch with Sentry capture, returning `{ success: false, error }` on failure.

### Intent-Based Actions (Timeline/Workflow)

| Intent | Handler | Module | Type |
|--------|---------|--------|------|
| `save` | `handleSave()` L699 | `~/lib/timelines/service.server` | Write — saves clips, tracks, settings; creates timeline if needed |
| `save-script` | `handleSaveScript()` L782 | `~/lib/scripts/service.server` | Write — merges TipTap JSON, updates version in-place |
| `create-shot-nodes` | `handleCreateShotNodes()` L839 | `~/lib/timelines/shot-workflow.server` | Write — creates 6-node workflow (text-input → prompt-enhancer → text-merge ← style-text → generate-image → publish-asset) |
| `update-shot-node` | `handleUpdateShotNode()` L875 | Direct DB (`node_workflows`) | Write — updates single node value in `live_state` JSONB |
| `delete-shot-nodes` | `handleDeleteShotNodes()` L910 | Direct DB (`node_workflows`) | Write — removes nodes + connections from `live_state` |
| `process-shot` | `handleProcessShot()` L948 | `~/lib/timelines/shot-workflow.server` | Trigger — runs workflow: enhance → merge → generate → publish |
| `load-timeline` | `handleLoadTimeline()` L964 | `~/lib/timelines/service.server` | Read — fetches timeline content + clips |
| `create-scene-timeline` | `handleCreateSceneTimeline()` L1035 | `~/lib/scenes/service.server` + `timeline-population.server` | Write — creates timeline, populates with shot placeholders + audio |
| `update-scene-timeline-audio` | `handleUpdateSceneTimelineAudio()` L1094 | `~/lib/scenes/timeline-population.server` | Write — `populateSceneTimelineWithDialogue()` mode: 'minor' |
| `reset-scene-timeline` | `handleResetSceneTimeline()` L1135 | `~/lib/scenes/timeline-population.server` | Write — full timeline reset |
| `create-all-scene-timelines` | `handleCreateAllSceneTimelines()` L1175 | `~/lib/scenes/service.server` | Bulk Write — creates timelines for all scenes without one |

### Action-Based Handlers (Script Operations)

| Action | Handler | Module | Type |
|--------|---------|--------|------|
| `list-script-versions` | L1245 | `~/lib/scripts/service.server` | Read — returns script list for project |
| `create-script-version` | L1282 | `~/lib/scripts/service.server` | Write — clones script + scenes + content, updates project pointer |
| `restore-script-version` | L1365 | Direct DB (`projects`, `scripts`) | Write — switches `current_script_asset_id` with extensive RLS validation |
| `translate-dialogue` / `translate-single-dialogue` | L1516 | `~/lib/scripts/translation.server` | AI Write — batch or single dialogue translation |
| `set-script-default-locale` | L1621 | Direct DB (`scripts`) | Write — updates script locale field |

### Loader (lines 407–544)

Auth → brand verify → fetch project → list timelines → select or create default timeline (300s, 30fps, 1920×1080, Video+Audio tracks) → return deferred: `timelineData` (via `loadTimelineData()`) and `scriptData` (via `loadScriptData()`).

### Custom API Routes (Client-Side Fetches)

| Route | Method | Purpose | Called From |
|-------|--------|---------|-------------|
| `/api/dialogue/generate` | POST | Generate dialogue audio (ElevenLabs TTS) | Script editor character audio |
| `/api/assets/create` | POST | Create asset record | QuickImportDialog, AssetSidePanel |
| `/api/assets/create-version` | POST | Create asset version after upload | QuickImportDialog, AssetSidePanel |
| `/api/assets/bulk-update` | POST | Bulk edit assets (collections, tags, description) | BulkEditDialog |
| `/api/assets/collections` | POST/PATCH/DELETE | Collection CRUD + voice settings | Collection components |
| `/api/assets/ai-review` | POST | AI tagging/categorization | AssetAIReviewDialog |
| `/api/search/assets` | GET | Hybrid vector + text search (OpenAI embeddings) | useAssetSearch hook |
| `/api/workflow/generate` | POST | Generate images/videos via AI models | WorkflowPanel, TimelineWorkflowModal |
| `/api/workflow/prompt-enhancer` | POST | AI prompt enhancement | WorkflowPanel, TimelineWorkflowModal |
| `/api/export/timeline-editor/{id}` | POST/GET | Start export job / poll status | useTimelineExport hook |

### Direct Supabase Client Calls (from components)

**Storage**: `supabase.storage.from('assets').upload()` / `.remove()` — direct browser-to-storage uploads bypass Vercel size limits. Bucket: `assets` (user files), `storyboard` (generated outputs).

**Queries**: Components directly query `asset_collections`, `asset_tags`, `collection_assets`, `assets`, `processing_jobs` for reads, inserts, and lock management.

**Locking**: `useAssetLock` hook (`app/hooks/useAssetLock.ts`) — asset-level locks via `locked_by`/`locked_at` fields, 5-min timeout, 30s heartbeat. `useWorkflowLock` — workflow-level locks via fetcher actions.

### Real-Time Subscriptions (Supabase Channels)

| Component | Table | Events | Filter | Purpose |
|-----------|-------|--------|--------|---------|
| AssetSidePanel | `assets`, `collection_assets`, `asset_collections` | * | `brand_id` | Live asset/collection updates |
| TimelineEditor | `processing_jobs` | UPDATE | `timeline_asset_id` | Shot processing status |
| TimelineEditor | `workflow_assets` | INSERT/UPDATE | `timeline_asset_id` | New shot assets |
| TimelineEditor | `timeline_assets` | UPDATE | `id` | Timeline changes from collaborators |
| WorkflowPanel | `workflow_assets` | INSERT | `workflow_id` | New generations |
| WorkflowPanel | `processing_jobs` | INSERT/UPDATE | `workflow_id` | Job status |
| ShotList | `shots` | * | `template_id` | Shot changes |
| useAssetLock | `assets` | UPDATE | `id` | Lock changes |

### Server-Side Service Modules

| Module | Path | Key Functions |
|--------|------|---------------|
| Timeline Service | `app/lib/timelines/service.server.ts` | `createTimelineAsset`, `saveTimelineClips`, `loadTimelineClips`, `getTimelineContent`, `listProjectTimelines`, `loadSubTimelineData` |
| Shot Workflow | `app/lib/timelines/shot-workflow.server.ts` | `createShotWorkflowNodes`, `processShotWorkflow`, `deleteShotWorkflowNodes` |
| Script Service | `app/lib/scripts/service.server.ts` | `createScript`, `getScriptByAssetId`, `updateScriptContentInPlace`, `createScriptVersion`, `listProjectScripts` |
| Scene Service | `app/lib/scenes/service.server.ts` | `createSceneTimeline`, `getScenesByScript`, `regenerateMasterTimeline` |
| Timeline Population | `app/lib/scenes/timeline-population.server.ts` | `populateSceneTimelineWithDialogue`, `resetTimeline` |
| Dialogue Service | `app/lib/dialogue/service.server.ts` | `generateDialogueAudio`, `getAudioForScript` |
| Translation Service | `app/lib/scripts/translation.server.ts` | `translateDialogueLines`, `translateSingleDialogueLine` |
| Project Service | `app/lib/projects/service.server.ts` | `createProjectWithDefaults`, `updateProject` |
| Auth | `app/lib/auth.server.ts` | `requireAuthWithClient`, `verifyBrandAccess` |
| Supabase Factory | `app/services/supabase.server.ts` | `createSupabaseServerClient`, `createSupabaseServiceRoleServerClient` |

### Key Patterns

- **Dual routing**: Action function checks `intent` first, then `action` — for timeline vs script operations
- **Deferred loading**: Loader returns Promises for heavy data (timeline, script) enabling streaming SSR
- **Locale normalization**: Multiple handlers convert empty string → `null` for locale params
- **Service layer**: Most handlers delegate to `*.server.ts` modules; only simple updates go direct to DB
- **useFetcher**: Client uses `useFetcher()` for mutations (auto-save, shot ops, workflow save) — no full-page reloads
- **Hybrid data access**: Server actions for mutations, direct Supabase client for reads + real-time + storage uploads

## 4. Database & Data Model 🔍

## 5. External Services & Integrations 🔍

## 6. Auth & Permissions 🔍

## 7. Business Logic & Edge Cases 🔍
