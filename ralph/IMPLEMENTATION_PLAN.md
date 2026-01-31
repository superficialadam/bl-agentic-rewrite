# Implementation Plan

## Learnings
- Env vars use `VITE_` prefix (not `PUBLIC_`); `REPLICATE_API_KEY` (not `REPLICATE_API_TOKEN`).
- Supabase local: port 54321 (API) / 54322 (Postgres). Keys are `sb_publishable_*`/`sb_secret_*` format.
- `@sveltejs/vite-plugin-svelte` v5+ required for vite 6; vitest v3+ required for vite 6.
- Tailwind v4 CSS-based config; NO `<style>` blocks, NO inline `style=`.
- TipTap direct (not svelte-tiptap); Svelte 5 runes (`$props()`, `$state()`, `$derived()`).

## Priority 1 — SvelteKit + Tailwind Scaffold ✅

## Priority 2 — Supabase Clients + Tracing ✅

## Priority 3 — Database Migration ✅

## Priority 4 — Project CRUD + Layout Shell
`/` project list page, `[project]/create/+page.svelte` three-panel layout shell, project create/load. Verify: create project via UI → assert DB row.
- Refs: `00-FOUNDATIONS.md` (routes), `02-SCRIPT-EDITOR.md` (layout)

## Priority 5 — Script + Timeline API Routes
GET/POST `/api/scripts/[id]`, `/api/scripts/[id]/sync`, GET `/api/timelines/[id]`, POST/PUT/DELETE `/api/clips/[id]`. Verify: curl smoke tests return shaped JSON.
- Refs: `02-SCRIPT-EDITOR.md` (script API), `03-TIMELINE-EDITOR.md` (timeline/clip API)

## Priority 6 — TipTap Custom Nodes
TipTap setup + 5 nodes (sceneHeading, action, character, dialogue, parenthetical). Render in center panel. Verify: unit tests for scene heading parser + node rendering.
- Refs: `02-SCRIPT-EDITOR.md` (custom nodes, rendering rules)

## Priority 7 — Script Sync to Database
`syncToDatabase()` with 1s debounce, orphan cleanup, load-from-DB reconstruction. Verify: mission test — type heading + dialogue → autosave → assert DB rows → reload → content matches.
- Refs: `02-SCRIPT-EDITOR.md` (persistence flow, sync API)

## Priority 8 — Outliner Panel
Left panel scene list from `rewrite_scenes`, click-to-scroll. Verify: mission test — type two scenes → assert outliner shows both → click second → editor scrolls.
- Refs: `02-SCRIPT-EDITOR.md` (outliner)

## Priority 9 — Character Detection + Panel
Auto-detect characters from script, character panel (right), dialogue count. Verify: mission test — type character MARY → assert `rewrite_characters` row → panel shows MARY.
- Refs: `02-SCRIPT-EDITOR.md` (character panel, detection logic)

## Priority 10 — Voice Assignment
`/api/voices` endpoint (ElevenLabs list, 1hr cache), voice dropdown in character panel, voice settings. Verify: mission test — assign voice → assert `voice_id` updated.
- Refs: `04-AUDIO-GENERATION.md` (voices API, voice settings)

## Priority 11 — Timeline Canvas Rendering
Canvas 2D: ruler, tracks, clips, playhead. `frameToX`/`xToFrame`/`trackIndexToY` utils. Zoom/scroll. Verify: unit tests for conversions + timecode; canvas renders with mock data.
- Refs: `03-TIMELINE-EDITOR.md` (canvas, ruler, coordinates, zoom)

## Priority 12 — Timeline Clip Interactions
Select, move, trim, delete clips. Hit testing. Commit on gesture end. Verify: unit tests for hit testing; mission test — create clip → move → assert DB `start_frame` updated.
- Refs: `03-TIMELINE-EDITOR.md` (clip interactions)

## Priority 13 — Preview Canvas + Playback
rAF loop, play/pause/seek, preview compositing (WebCodecs + image fallback). Verify: mission test — place clip → play → assert frames advance → seek → assert correct frame.
- Refs: `03-TIMELINE-EDITOR.md` (playback engine, preview canvas)

## Priority 14 — Audio Playback in Timeline
AudioContext scheduling for audio clips during playback. Track sidebar mute/hide. Verify: mission test — place audio clip → play → assert AudioContext active; mute track → assert silent.
- Refs: `03-TIMELINE-EDITOR.md` (audio playback, track sidebar)

## Priority 15 — Image Generation API
`/api/generate/image` with Replicate polling, upload to storage, resolution utils. Verify: mission test — POST generate → assert file in storage bucket.
- Refs: `05-IMAGE-GENERATION.md` (API, polling, upload, resolution calc)

## Priority 16 — Image Generate Panel UI
Prompt field, reference drop zone, settings (resolution/aspect), generate button, results grid. Verify: mission test — enter prompt → generate → assert result visible in grid.
- Refs: `05-IMAGE-GENERATION.md` (panel UI, loading states)

## Priority 17 — Audio Generation API
`/api/generate/audio` with ElevenLabs TTS, upload to storage, SHA-256 hashing. Verify: mission test — POST generate → assert audio asset in storage + content_hash set.
- Refs: `04-AUDIO-GENERATION.md` (API, TTS call, upload)

## Priority 18 — Audio Status + Play Button
Audio status indicators (none/generating/generated/stale) on dialogue nodes, play button, stale detection. Verify: mission test — generate audio → edit content → assert status changes to stale.
- Refs: `04-AUDIO-GENERATION.md` (status indicators, stale detection, play button)

## Priority 19 — Batch Audio Regeneration
"Regenerate All" per character, sequential queue, progress indicator. Verify: mission test — regenerate all for character → assert all dialogue `audio_status='generated'`.
- Refs: `04-AUDIO-GENERATION.md` (batch regen)

## Priority 20 — Drag Image to Timeline
Drag result from generate panel to V1. Create asset + clip records. Drop indicator. Verify: mission test — drag image to V1 → assert `rewrite_clips` + `rewrite_assets` rows.
- Refs: `05-IMAGE-GENERATION.md` (drag to timeline, save as asset)

## Priority 21 — Drag Dialogue to Timeline
Drag dialogue to audio track. Generate if needed. Create clip. Verify: mission test — drag dialogue to A1 → assert clip with correct `asset_id`.
- Refs: `04-AUDIO-GENERATION.md` (drag to timeline)

## Priority 22 — Realtime Subscriptions
Subscribe to clips, tracks, scenes, scene_content, characters, assets. Update UI on external mutations. Verify: mission test — psql INSERT → assert UI updates.
- Refs: `00-FOUNDATIONS.md` (realtime), `01-DATA-MODEL.md` (subscription tables)

## Priority 23 — Error Handling + Loading States
Toast notifications, rate limit handling, loading skeletons, save indicator. Verify: `pnpm test:all` passes, `pnpm check` + `pnpm lint` clean.
- Refs: all specs (error handling sections)
