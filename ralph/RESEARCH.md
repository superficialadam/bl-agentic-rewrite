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

## 4. Database & Data Model ✅

### Schema Source

- **Auto-generated types**: `app/types/supabase.d.ts` (67 tables across `public` + `analytics` schemas)
- **Migrations**: `supabase/migrations/` — key files listed per table below

### Core Tables

#### `brands`
`supabase/migrations/20250920104520_create_brands_table.sql`
- Columns: `id` UUID PK, `name` TEXT, `slug` TEXT (auto-generated via `generate_slug()` trigger), `created_at`, `updated_at`
- Linked to teams via `brands_teams` junction (brand_id, team_id)
- RLS: authenticated users can view; CRUD restricted to team members

#### `projects`
`supabase/migrations/20251211000001_create_projects_table.sql`
- Columns: `id` UUID PK, `brand_id` FK→brands, `name` VARCHAR(200), `description`, `slug`, `status` CHECK('draft','in_progress','review','approved','published'), `series_name`, `season_number`, `episode_number`, `target_duration_seconds`, `format_settings` JSONB (resolution/fps/aspect), `production_notes`, `current_script_asset_id` FK→assets, `current_timeline_asset_id` FK→assets, `created_by` FK→auth.users
- UNIQUE(brand_id, name)
- RLS: brand-member access via brands_teams + team_members
- Realtime enabled

#### `assets`
`supabase/migrations/20251128134035_create_asset_management_system.sql`
- Central table — timelines, scripts, images, audio, video all stored as assets
- Columns: `id` UUID PK, `brand_id` FK→brands, `project_id` FK→projects, `name` VARCHAR(200), `description`, `file_type` VARCHAR(20) ('image','audio','video','text','document','script','timeline'), `status` ('processing','pending_thumbnail','ready'), `thumb_url`, `thumb_blurhash`, `current_version_id` FK→asset_versions, `current_version_id_locales` JSONB, `locked_by` FK→auth.users, `locked_at`, `metadata` JSONB
- Legacy columns still present: `asset_type`, `url`, `template_id`, `job_id`, `locale`
- Indexes: brand_id, project_id, file_type, name, description (GIN tsvector)
- RLS: brand-member SELECT; brand-based CRUD
- Realtime enabled

#### `asset_versions`
Same migration as assets
- Columns: `id` UUID PK, `asset_id` FK→assets (CASCADE), `version_number` INT, `locale` TEXT (default 'sv'), `file_url` VARCHAR(500), `file_size` BIGINT, `metadata` JSONB (contains TimelineContent for timeline assets), `notes`, `description`, `workflow_id` FK→node_workflows, `created_by` FK→auth.users
- UNIQUE(asset_id, version_number)
- **Timeline content stored in `metadata`** as:
```typescript
{ version: "2.0", settings: { duration, frameRate, resolution: { width, height } }, tracks: [{ id, name, type, muted, hidden, order }] }
```
- RLS: inherits from parent assets via brand membership

#### `asset_renditions`
Same migration
- `asset_version_id` FK→asset_versions, `type` ('thumbnail_sm','thumbnail_lg','waveform','preview'), `file_url`, `width`, `height`, `blurhash`
- UNIQUE(asset_version_id, type)

### Timeline Tables

#### `timeline_assets`
`supabase/migrations/20251211000001_create_projects_table.sql` + `20251212142419_update_timeline_assets_for_editor.sql`
- Clip storage — one row per clip in a timeline
- Columns: `id` UUID PK, `timeline_asset_id` FK→assets (CASCADE), `asset_id` FK→assets (nullable — shots have no source asset), `referenced_timeline_id` FK→assets (for sub-timelines), `track_id`, `track_type` ('video','audio','subtimeline'), `track_order` INT, `start_time` NUMERIC(10,3), `duration` NUMERIC(10,3), `clip_data` JSONB
- `clip_data` contains: `{ id, trackId, startTime, duration, originalDuration, offset, name, type, src, groupId, assetId, assetVersionId, assetVersionNumber, referencedTimelineId, volume, opacity, position, scale, shotPrompt, shotName, targetAssetId, workflowNodes, processingStatus, thumbUrl }`
- Indexes: (timeline_asset_id, track_id), asset_id, timeline_asset_id
- RLS: brand-member access
- Trigger: auto-updates `updated_at`

### Script & Scene Tables

#### `scripts`
`supabase/migrations/20251216083800_structured_scripts_and_scenes.sql`
- Columns: `id` UUID PK, `project_id` FK→projects (CASCADE), `asset_id` FK→assets (CASCADE), `title`, `locale` FK→locales (default 'sv')
- Indexes: project_id, asset_id
- RLS: team access via scripts→projects→brands_teams→team_members

#### `scenes`
Same migration
- Columns: `id` UUID PK, `script_id` FK→scripts (CASCADE), `element_id` VARCHAR(100) (unique, maps to TipTap), `int_ext` ('INT','EXT','INT/EXT'), `location`, `time_of_day`, `scene_number`, `order_index`, `timeline_asset_id` FK→assets (SET NULL)
- UNIQUE(script_id, timeline_asset_id)
- DB function: `parse_scene_heading(TEXT)` → splits "INT. COFFEE SHOP - DAY" into fields

#### `scene_content`
Same migration
- Columns: `id` UUID PK, `scene_id` FK→scenes (CASCADE), `element_id` VARCHAR(100) (unique), `type` CHECK('action','character','dialogue','parenthetical'), `content` TEXT (original language), `content_localized` JSONB (`{locale: text}`), `order_index`, `asset_id` FK→assets (generated audio), `character_collection_id` FK→asset_collections, `director_tags` JSONB (`[{type, value}]`)
- Translation: original in `content`, translations in `content_localized[locale]`, timestamps in `content_localized[locale_updated_at]`

#### `script_assets`
`supabase/migrations/20251211000001_create_projects_table.sql`
- Junction: links dialogue audio to script elements
- PK: (script_asset_id, element_id)
- Columns: `script_asset_id` FK→assets, `asset_id` FK→assets (audio), `element_id`, `character_id` (collection ID), `content_hash` VARCHAR(64) (SHA-256 for regen detection)

### Workflow & Processing Tables

#### `node_workflows`
`supabase/migrations/20251124084557_create_node_workflows.sql`
- Columns: `id` UUID PK, `shot_id` FK→shots, `asset_id` FK→assets, `brand_id` FK→brands, `name`, `description`, `live_state` JSONB (`{ nodes: [...], connections: [...], viewport: {...} }`), `locked_by` FK→auth.users, `locked_at`
- CHECK: exactly one of (shot_id, asset_id, brand_id) must be set; UNIQUE on shot_id; UNIQUE on asset_id
- RLS: open for authenticated users (to be refined)
- Realtime enabled

#### `node_workflow_versions`
Same migration
- Columns: `workflow_id` FK→node_workflows (CASCADE), `version_number`, `state_snapshot` JSONB (immutable), `commit_message`, `triggered_by_job_id`, `created_by`
- UNIQUE(workflow_id, version_number)

#### `processing_jobs`
`supabase/migrations/20250917162010_...`
- Columns: `id` UUID PK, `job_type` TEXT ('generate_asset_thumbnail', etc.), `status` CHECK('queued','processing','completed','failed','suspended'), `options` JSONB, `metadata` JSONB (asset_id, version_id, file_url, brand_id), `error_message`
- Realtime enabled for status updates

#### `job_events`
- `job_id` FK→processing_jobs (CASCADE), `event_type`, `event_data` JSONB

### Organization Tables

#### `asset_collections`
`supabase/migrations/20251128134035_create_asset_management_system.sql`
- Columns: `id` UUID PK, `name`, `type` CHECK('character','environment','prop','general'), `description`, `cover_asset_id` FK→assets, `brand_id` FK→brands, `metadata` JSONB (voice_settings for characters: ElevenLabs voice_id, stability, similarity)
- Junction tables: `collection_assets` (collection_id, asset_id, role, sort_order), `collection_tags` (collection_id, tag_id)

#### `tags`
Same migration
- Columns: `id` UUID PK, `name`, `group` ('style','audio-type','mood','content'), `applies_to` TEXT[] (file types), `color` VARCHAR(7), `brand_id` FK→brands (null = global)
- UNIQUE(name, brand_id)
- Junction: `asset_tags` (asset_id, tag_id)

#### `brand_words`
`supabase/migrations/20260119154857_add_script_translation.sql`
- Translation dictionary for brand-specific terms
- Columns: `brand_id` FK→brands, `locale` FK→locales, `word`, `original_brand_word_id` (self-ref for linking translations)

### Search Infrastructure

#### `viewm_search_assets` (Materialized View)
`supabase/migrations/20260116173454_create_search_assets_view.sql`
- Denormalized asset search with full-text (tsvector) + trigram matching
- Includes: asset fields, latest version info, rendition URLs, tags by group, collection info, search vectors
- Refreshed async via `pg_notify('search_refresh_needed')` triggers on assets, asset_versions, asset_tags, collection_assets, asset_renditions
- GIN indexes on search_tsv, trigram text, tag_ids, collection_ids

### Storage

#### `assets` Bucket (Supabase Storage)
- Public read, 500MB file limit
- Path: `{brand_id}/{file_type}/{asset_id}/{name}-v{version}.{ext}`
- Allowed: jpeg, png, webp, gif, mp4, webm, quicktime, mpeg, wav, ogg, mp4 audio, pdf, plain text
- RLS: brand-member upload/update/delete

### Key Patterns

- **Asset-centric model**: Everything (timelines, scripts, images, audio) is an `asset` with `asset_versions`. `file_type` distinguishes them.
- **Dual storage**: Timeline structure in `asset_versions.metadata` JSONB; clip rows in `timeline_assets` table.
- **Locale-aware versioning**: `current_version_id_locales` JSONB on assets maps locale→version_id.
- **Structured scripts**: `scripts` → `scenes` → `scene_content` replaces earlier JSON blob approach. Original content + translations coexist via `content` + `content_localized`.
- **Polymorphic workflows**: `node_workflows` can belong to a shot, asset, or brand (CHECK constraint enforces exactly one).
- **RLS chain**: Most tables enforce access via brand membership: table→projects→brands_teams→team_members→auth.users.
- **Realtime**: Enabled on assets, asset_versions, projects, node_workflows, processing_jobs, job_events, scripts, scenes, scene_content.
- **Locking**: Optimistic locking via `locked_by`/`locked_at` on assets and node_workflows (5-min timeout, 30s heartbeat).
- **Search**: Materialized view with async refresh via pg_notify, not synchronous triggers.

## 5. External Services & Integrations ✅

### AI Image Generation

| Provider | SDK | Env Key | Entry Point |
|----------|-----|---------|-------------|
| **Replicate** | `replicate` v1.4.0 | `REPLICATE_API_KEY` | `app/services/genai.server.ts` L9–135 |
| **FAL.AI** | `@fal-ai/client` v1.8.3 | `FAL_API_KEY` | `app/services/genai.server.ts` L140–188 |
| **Google Gemini** | `@google/genai` v1.35.0 | `GEMINI_API_KEY` | `app/services/genai.server.ts` L194–393 |

All three called from `app/routes/api.workflow.generate.tsx` via `createPredictionSync()`. Gemini handles image-to-image with base64 conversion for multimodal inputs.

### AI Video Generation

| Provider | SDK | Env Key | Entry Point |
|----------|-----|---------|-------------|
| **Google Veo** | `@google/genai` v1.35.0 | `GEMINI_API_KEY` | `app/services/genai.server.ts` L443–685 |
| **KIE** | Direct fetch (no SDK) | `KIE_API_KEY` | `app/services/genai.server.ts` L691–830 |

Veo polls for completion (up to 6 min), downloads from Google file API. KIE uses webhook callbacks at `{APP_URL}/api/webhooks/kie?jobId={id}`.

### AI Text / LLM

| Provider | Model | SDK | Env Key | Purpose | File |
|----------|-------|-----|---------|---------|------|
| **OpenAI GPT-4** | gpt-4 | Direct fetch | `OPENAI_API_KEY` | Translation, script classification | `app/services/openai.ts` |
| **OpenAI Embeddings** | text-embedding-3-small | Direct fetch | `OPENAI_API_KEY` | Semantic asset search (1536-dim) | `app/services/embeddings.server.ts` |
| **Anthropic Claude** | claude-haiku-4.5 | `@mastra/core` v1.0.0-beta.19 | `AI_GATEWAY_API_KEY` (Vercel AI Gateway) | Prompt enhancement, agents (Director, Writer, Librarian) | `app/lib/workflow/prompt-enhancer.server.ts`, `app/lib/mastra/agents/dispatch.ts` |
| **Google Gemini Flash** | gemini-3-flash | `@mastra/core` | `AI_GATEWAY_API_KEY` | Dispatch agent routing | `app/lib/mastra/agents/dispatch.ts` L31 |
| **Google Gemini 2.5 Flash** | (via OpenRouter) | Direct fetch | `OPENROUTER_API_KEY` | VLM asset analysis/tagging | `app/lib/assets/analyze-asset.server.ts` |

Mastra agent framework (`@mastra/core`, `@mastra/memory`, `@mastra/pg`) provides streaming responses and tool calling via `@ai-sdk/react` v3.0.5.

### Text-to-Speech

**ElevenLabs** — `@elevenlabs/elevenlabs-js` v2.26.0, env: `ELEVENLABS_API_KEY`

| Function | Model | Endpoint | File |
|----------|-------|----------|------|
| `textToSpeech()` | `eleven_multilingual_v2` | Standard TTS | `app/services/elevenlabs.server.ts` |
| `textToDialogue()` | `eleven_v3` | `/v1/text-to-dialogue/with-timestamps` | `app/services/elevenlabs.server.ts` |
| Voice listing | — | `/v1/voices` | `app/routes/api.elevenlabs.voices.tsx` |

Supports 19+ language codes. Preserves director tags (`[excited]`, `[whispering]`). Audio uploaded to Supabase with locale-specific versioning. Called from `app/routes/api.dialogue.generate.tsx` and `app/routes/api.elevenlabs.dialogue.tsx`.

### File Storage (Supabase Storage)

**SDK**: `@supabase/supabase-js` v2.56.0 + `@supabase/ssr` v0.7.0

| Bucket | Path Convention | Contents |
|--------|----------------|----------|
| `assets` | `{brandId}/{fileType}/{assetId}/{name}-v{version}.{ext}` | User uploads (images, video, audio, docs) |
| `storyboard` | `{templateId}/{shotId}-{timestamp}-sync.{ext}` or `workflows/{nodeId}-{timestamp}-sync.{ext}` | AI-generated workflow outputs |

- **Client-side direct upload**: Browser → Supabase Storage (bypasses Vercel 4.5MB limit), then `api.assets.create-from-storage.tsx` creates record + moves file to final path
- **Server-side re-upload**: `uploadExternalUrlToSupabase()` in `genai.server.ts` L949–1011 downloads AI outputs (Replicate, FAL, Google) and uploads to Supabase
- 500MB max file size, public read URLs via `getPublicUrl()`

### Semantic Search

`app/routes/api.search.assets.tsx` — Hybrid search combining:
1. OpenAI `text-embedding-3-small` query embeddings (cached in-memory)
2. PostgreSQL RPC `search_assets_smart()` — vector similarity + keyword matching + metadata filters
3. Fallback to `ILIKE` keyword search if embedding generation fails

### Video Rendering & Export

| Service | SDK | Env Keys | Purpose | File |
|---------|-----|----------|---------|------|
| **Shotstack** | Direct API | `SHOTSTACK_API_KEY`, `SHOTSTACK_ENVIRONMENT` | Final video composition | `app/routes/api.webhooks.shotstack.tsx` |
| **Remotion** | `@remotion/player` v4.0.382 | — | In-browser video preview/player | Client-side only |
| **PDFKit** | `pdfkit` v0.17.2 | — | Script PDF export (US Letter, Courier) | `app/routes/api.export.script.pdf.$assetVersionId.tsx` |

### Monitoring

**Sentry** — `@sentry/react-router` v10.29.0
- DSN: `o4510483128909824.ingest.de.sentry.io`
- Config: `instrument.server.mjs`, `app/entry.server.tsx`, `app/entry.client.tsx`
- Disabled in development, captures PII (request headers, IP)
- Used in route action catch blocks and API error handlers

### Webhook Endpoints (Async Callbacks)

| Route | Provider | Trigger |
|-------|----------|---------|
| `api.webhooks.replicate.tsx` | Replicate | Prediction complete |
| `api.webhooks.kie.tsx` | KIE | Video generation complete |
| `api.webhooks.shotstack.tsx` | Shotstack | Video render complete |
| `api.webhooks.bannerbear.tsx` | Bannerbear | Image template complete |

All follow same pattern: receive callback → update `processing_jobs` status → download output → upload to Supabase Storage.

### Background Task Processor

`tasks/endless-task-processor/` — VPS-based worker with its own `.env`
- Runs same AI SDKs (Replicate, FAL, Google, ElevenLabs)
- Additional GPU providers: `RUNPOD_API_KEY`, `MODAL_ID`/`MODAL_SECRET`
- Handles: thumbnail generation, AI generation jobs, analytics

### Not Used in /create Flow

- **Bannerbear** — template-based image generation (social media posts)
- **GetLate** — social media publishing orchestrator (Facebook, Instagram, TikTok, YouTube OAuth)
- **Stripe/payments** — no payment integration found anywhere in codebase

## 6. Auth & Permissions ✅

### Authentication Method

- **Cookie-based JWT** via Supabase Auth (`@supabase/ssr`)
- Cookie name pattern: `sb-<project-ref>-auth-token`
- No custom session store — relies entirely on Supabase's cookie-based JWT

### Core Auth Function

**`requireAuthWithClient()`** — `app/lib/auth.server.ts` L61–97
1. Extracts auth token from cookie header
2. **60-second in-memory cache** keyed by token (avoids duplicate `getUser()` calls across parent/child loaders)
3. Creates user-scoped Supabase client via `createSupabaseServerClient(request)` (`app/services/supabase.server.ts` L9–75)
4. Calls `supabaseClient.auth.getUser()` to verify session
5. Redirects to `/login` on failure
6. Returns `{ user, supabaseClient }`

### Route-Level Protection

- **No middleware or centralized guard** — each route individually calls `requireAuthWithClient()` in its loader
- `app/entry.server.tsx` only contains Sentry instrumentation, no auth logic
- The `/create` route loader (L407–426) calls `requireAuthWithClient()` then `verifyBrandAccess()`

### Brand Access Verification

**`verifyBrandAccess()`** — `app/lib/auth.server.ts` L149–233

Access chain: `brands` →(inner join)→ `brands_teams` →(inner join)→ `teams` → verify `team_members` for user_id

1. Fetches brand by slug with `!inner` join on `brands_teams` → `teams`
2. Queries `team_members` WHERE `team_id` AND `user_id`
3. Throws 403 if no membership found
4. Returns `{ brand, team }`

### Team & Role Model

**`supabase/migrations/20250918085726_create_teams_functionality.sql`**

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `teams` | id, slug, name, created_by | Team entity |
| `team_members` | team_id, user_id, role | Membership with role |
| `brands_teams` | brand_id, team_id (composite PK) | Brand↔team junction |

**Roles**: `owner` > `admin` > `member` (CHECK constraint). Trigger auto-inserts creator as `owner`. Roles primarily affect team management, not content access within the create flow.

### RLS Policy Pattern

All brand-related tables use the same access check:
```sql
EXISTS (
  SELECT 1 FROM brands_teams bt
  JOIN team_members tm ON tm.team_id = bt.team_id
  WHERE bt.brand_id = <table>.brand_id
  AND tm.user_id = auth.uid()
)
```

**Nested resources** traverse the full chain:
- `scene_content` → `scenes` → `scripts` → `projects` → `brands` → `brands_teams` → `team_members`
- `timeline_assets` → parent `assets` → brand_id check

Tables with RLS: `assets`, `asset_versions`, `projects`, `timeline_assets`, `scripts`, `scenes`, `scene_content`, `asset_collections`, `collection_assets`, `processing_jobs`, `node_workflows`, `tags`, `asset_tags`

### API Route Auth

Mixed strategy:
- **All API routes** call `requireAuthWithClient()` — none rely solely on RLS
- **Some routes add manual verification** (e.g., `api.assets.create.tsx` queries `team_members` + `brands_teams` before proceeding)
- **Other routes trust RLS** for authorization (e.g., `api.workflow.generate.tsx`, `api.dialogue.generate.tsx` only call `requireAuthWithClient()`)

### Supabase Client Types

| Client | Factory | RLS | Used In |
|--------|---------|-----|---------|
| User-scoped | `createSupabaseServerClient(request)` | Enforced | All route loaders/actions, most API routes |
| Service role | `createSupabaseServiceRoleServerClient()` | **Bypassed** | Webhook handlers, background processing, `genai.server.ts` uploads |

**Create flow uses user-scoped client only** — service role not used in `/create` route or its direct API calls.

### Storage Policies

**`assets` bucket** — `supabase/migrations/20251128134035_create_asset_management_system.sql` L14–95

- **Public read**: `SELECT` allowed for all on `bucket_id = 'assets'`
- **Write (INSERT/UPDATE/DELETE)**: Authenticated + brand membership verified via path:
  ```sql
  -- Extracts brand_id from storage path: assets/{brand_id}/...
  WHERE b.id::text = (storage.foldername(objects.name))[1]
  AND tm.user_id = auth.uid()
  ```
- Same pattern on `storyboard`, `thumbnails`, `videos`, `voiceovers` buckets

### Security Summary

- **Defense in depth**: Route-level auth → application-level brand verify → database RLS policies
- **Create route specifics**: `requireAuthWithClient()` → `verifyBrandAccess()` → RLS on all queries
- **No role-based content restrictions**: All team members (owner/admin/member) have equal content access within a brand
- **Locking (not auth)**: Asset/workflow locks via `locked_by`/`locked_at` fields prevent concurrent edits but are cooperative, not enforced by RLS

## 7. Business Logic & Edge Cases ✅

### What "Create" Produces

The `/create` route manages five artifact types:

1. **Timelines** — `assets` with `file_type='timeline'`, structure in `asset_versions.metadata`, clips in `timeline_assets`
2. **Scripts** — Structured data across `scripts` → `scenes` → `scene_content` tables, plus legacy TipTap JSON in `asset_versions.metadata`
3. **Scene Timelines** — Sub-timeline assets linked to scenes, auto-populated with shot placeholders + dialogue audio
4. **Shot Assets** — AI-generated images/videos published to `assets` via 6-node workflow chains
5. **Workflow Nodes** — Stored in `node_workflows.live_state` JSONB

### Validation Rules

**No Zod schemas** — runtime checks only:

- `brandSlug` and `projectSlug` required (throws Error if missing) — route L418–419
- Script save requires `scriptAssetId` + `tiptapJson` — L786–788
- Shot node creation requires `shotPrompt`, `timelineAssetId`, `shotClipId`, `brandId` — L843–847
- Empty string locales normalized to `null` across multiple handlers — L1042–1048, L1102–1107, L1142–1148
- Script version creation rejects empty content — L1310–1315
- Audio duration must be > 0 — `timeline-population.server.ts` L554–564
- File type checks via `isSupportedMediaFile()`, `isVideoFile()`, etc. — L3181–3189
- **No explicit size, duration, or resolution validation** on timeline settings

### Error Handling

**Server-side**: All action handlers wrapped in try-catch (L633–696). Pattern:
```typescript
catch (error) {
  Sentry.captureException(error);
  return { success: false, error: error.message };
}
```

**Client-side**:
- Toast notifications for user-visible errors ("Failed to save timeline", "Failed to save script")
- Fixed Alert component for debounced save errors, auto-dismisses after 5s — L2390–2395, L4004–4012
- **Offline detection**: Checks `navigator.onLine` before save attempts — L2671, L2764
- Sentry capture on script save errors (L2733), workflow errors (L3016, L3477), asset resolution errors (L2310)

### Default Values & Auto-Creation

| Setting | Default | Source |
|---------|---------|--------|
| Timeline duration | 300s (5 min) | Route L477–482 |
| FPS | 30 | Route L477 |
| Resolution | 1920×1080 | Route L477 |
| Default tracks | 1 Video + 1 Audio | Route L502–516 |
| Image clip duration | 3.0s | `constants.ts` `DEFAULT_IMAGE_DURATION` |
| Shot clip duration | 5s | `timeline-population.server.ts` L867 |
| Audio clip offset | 1s after shot start | `timeline-population.server.ts` |
| Track height | 80px | `constants.ts` |

**Auto-creation**: If no timeline exists, loader creates one with defaults and updates `project.current_timeline_asset_id` (L471–517). Scripts are **not** auto-created.

### Loader Edge Cases

| Condition | Behavior | Lines |
|-----------|----------|-------|
| No timelines exist | Auto-creates timeline with defaults | L471–517 |
| URL timeline ID invalid | Falls back to `project.current_timeline_asset_id` | L467 |
| No `current_timeline_asset_id` | Same as no timelines — auto-creates | L471 |
| No script exists | Returns `null` scriptData, no auto-creation | L521 |
| Script asset missing `current_version` | Returns null scriptData | `loadScriptData()` L318–320 |
| Brand access denied | `verifyBrandAccess()` throws → error boundary | L422–426 |

### Save & Concurrency

**Auto-save**:
- **Timeline**: 1s debounce via `useTimelinePersistence` hook. Serializes full engine state to JSON, compares with last saved state (change detection). Silent on success, toast+alert on failure.
- **Script**: 1s debounce via `setTimeout`. Syncs to both TipTap JSON blob and structured tables (`syncTipTapToDatabase`). Offline check before attempting.
- **`beforeunload`** event warns of unsaved changes — `useTimelinePersistence.ts` L227–237

**Concurrent edits**:
- **Last writer wins** — no optimistic locking on save
- Realtime subscription detects external timeline changes (L2531–2658)
- **Timing-based guard**: Ignores external updates if `hasUnsavedChangesRef.current === true` (L2566–2571)
- 5-second window to detect own saves vs external changes (L2554–2562) — noted as unreliable in code comments (L2518–2530)
- Script realtime subscription enabled (L2791–2842)

### Undo/Redo

**Not implemented.** No state history, no undo manager, no Ctrl+Z/Y handlers for timeline or workflow operations. Mitigation: debounced autosave + script versioning (manual only).

### Sub-Timeline / Scene Timeline

**Creation** (L1035–1092):
- Creates timeline asset via `createSceneTimeline()` service
- Duration calculated from scene's percentage of total script content (min 10s) — `scenes/service.server.ts` L295–331
- Auto-populates via `resetTimeline()` with shot placeholders from action lines + audio clips from dialogue

**Population modes** (`timeline-population.server.ts`):
- `minor` — Preserves clip timing, updates URLs/durations, keeps orphaned clips
- `full` — Resequences all clips in script order, removes orphans, 0.1s gap between clips
- `analyze` — Returns change type ('none'/'minor'/'major') without modifying

**Reset** (`resetTimeline()` in `timeline-population.server.ts` L688–995):
- Preserves video tracks and manually-added video clips
- Removes audio tracks for characters no longer in script
- Creates audio tracks per character, shot placeholders (5s each), audio clips (1s offset after shot)

**No master timeline regeneration** — sub-timelines referenced as clips with `referencedTimelineId` but no automatic composition.

### Workflow Execution

**Shot workflow** (6-node chain per shot — `shot-workflow.server.ts`):

1. `text-input` → user's shot prompt
2. `prompt-enhancer` → AI-enhanced prompt (brand context)
3. `text-input` (style) → preset storyboard style text (`STORYBOARD_STYLE_TEXT` constant)
4. `text-merge` → merged enhanced prompt + style
5. `generate-image` → AI generation (preferred model: `prunaai/z-image-turbo`, 120s timeout)
6. `publish-asset` → uploads to Supabase, creates/updates target asset

**Processing flow**: User triggers → `intent: 'process-shot'` → server sets nodes to 'processing' → runs chain → updates `processing_jobs` table → realtime subscription updates clip status + src on client.

**Error handling**: Node status set to 'error', clip remains in 'error' state, returns `{ success: false, error }`. Upload failures logged but continue with external URL.

### Script Versioning

- **List**: `list-script-versions` action returns all scripts for project — L1245
- **Create**: `create-script-version` clones script + scenes + scene_content, updates `project.current_script_asset_id` — L1282–1363
- **Restore**: `restore-script-version` switches `current_script_asset_id` pointer with RLS validation — L1365
- **Guard**: Rejects version creation if script has no scenes — L1310–1315

### Feature Flags

**None found.** No environment-based feature flags or toggle system. Conditional behavior is data-driven:
- Locale support based on `brands.locales`
- Preview mode toggle (`timeline` vs `easy`) persisted in localStorage
- Tab-based panel states per view (`edit`/`script`/`workflow`)
