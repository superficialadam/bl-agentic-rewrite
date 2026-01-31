# Foundations

Rules and patterns for all code in Creator Studio v2. Every feature builds on these. Do not deviate.

**Working directory:** All code lives in `creator-studio-v2/`. Do not create or modify files outside this directory.

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | SvelteKit | File-based routing enforces structure. SSR capability. No ambiguity about where code goes. |
| Styling | Tailwind v4 | Utility classes only. Lint blocks `<style>` blocks and inline styles. |
| Database | Supabase (local) | Existing local Supabase instance. All tables prefixed with `rewrite_` to avoid conflicts with v1. |
| Rich Text | TipTap (direct) | Official Svelte 5 support. Extension system for custom node types. No wrapper libraries. |
| Canvas | Raw Canvas 2D API | No library abstractions. Timeline rendering is simple shapes. Full control. |
| Video | WebCodecs | Frame-accurate playback. Native browser API. |
| Audio Gen | ElevenLabs | Text-to-speech for dialogue. |
| Image Gen | Replicate (flux) | Synchronous image generation. Simple API. |
| Testing | Vitest (unit) + Playwright (mission) | Binary pass/fail. Assert against DB state, not UI. |

---

## Environment Variables

All secrets and configuration live in `.env`. SvelteKit loads this file automatically — do NOT install `dotenv` or add manual loading code.

**Required variables:**

| Variable | Purpose |
|----------|---------|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ELEVENLABS_API_KEY` | Text-to-speech |
| `REPLICATE_API_TOKEN` | Image generation |

**Rules:**
- Never hardcode API keys in source code
- Never commit `.env` to git
- When adding a new env var, document it in this table

---

## Database

Using existing local Supabase instance. All v2 tables are prefixed with `rewrite_` to avoid conflicts with v1 tables.

### Table Naming

All tables: `rewrite_projects`, `rewrite_scripts`, `rewrite_scenes`, `rewrite_scene_content`, `rewrite_timelines`, `rewrite_tracks`, `rewrite_clips`, `rewrite_assets`, `rewrite_characters`, `rewrite_traces`.

### Supabase Client

Server-side code uses `createServerClient` from `@supabase/ssr`. Client-side uses `createBrowserClient`. Never use service role key on client.

### Realtime

Enable realtime on all content tables. Subscriptions for reads, mutations for writes.

---

## Project Structure

```
creator-studio-v2/
├── src/
│   ├── routes/
│   │   ├── +page.svelte
│   │   ├── +layout.svelte
│   │   ├── +layout.server.ts
│   │   ├── [project]/
│   │   │   └── create/
│   │   │       └── +page.svelte
│   │   └── api/
│   │       ├── scripts/
│   │       ├── timelines/
│   │       ├── clips/
│   │       ├── assets/
│   │       └── generate/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts
│   │   │   └── trace.ts
│   │   ├── components/
│   │   │   ├── script/
│   │   │   ├── timeline/
│   │   │   ├── generate/
│   │   │   └── shared/
│   │   ├── stores/
│   │   └── utils/
│   ├── app.css
│   └── app.html
├── tests/
│   ├── unit/
│   └── missions/
├── static/
├── svelte.config.js
├── tailwind.config.js
├── vite.config.ts
├── package.json
└── tsconfig.json
```

**File placement rules:**
- Routes go in `src/routes/` — file-based routing, no exceptions
- Server-only code goes in `src/lib/server/` — never imported by client
- Shared components go in `src/lib/components/`
- Stores go in `src/lib/stores/`
- Utilities go in `src/lib/utils/`

---

## Three-Tier State Model

| Tier | Location | Purpose |
|------|----------|---------|
| Authoritative | Supabase | Single source of truth. All persisted data. Survives reload. |
| Ephemeral | Client memory (Svelte `$state`) | Interaction state: drag positions, selections, input values. Never persisted directly. |
| Derived | Client cache (`$derived`) | Computed from authoritative state. Invalidated on subscription updates. |

**Commit boundaries:** State commits to database on gesture completion, not continuous writes. Drag-end commits clip position, not every mouse move.

**No local state for persisted data.** The database is truth.

---

## Observability

### The traced() Contract

Every function that touches the database or external APIs is wrapped with `traced()`. No untraced code paths for mutations.

The `traced()` wrapper records to `rewrite_traces` table:
- trace_id — UUID, groups all events in one request
- timestamp — when the event occurred
- event_type — request_start, mutation, api_call, subscription, error
- function_name — name of the traced function
- arguments — input as JSON
- result — output as JSON
- error — error message if thrown
- duration_ms — wall clock time

**Rules:**
- Trace ID is generated in the API route handler and passed through all calls
- Every database write and external API call is traced
- Errors are caught, traced, then re-thrown
- Traces are the debugging mechanism — read traces, not console.log

### Trace Verification

After any implementation, verify traces exist. Mission tests assert trace completeness alongside business logic.

---

## Styling Rules

**Tailwind CSS v4** — not v3. The config format changed in v4.

- Tailwind utility classes only
- No `<style>` blocks — lint error
- No inline `style=` attributes — lint error
- Build fails if either is detected
- All design tokens via Tailwind config (CSS-based in v4, not JS)

---

## Testing

### Unit Tests (Vitest)

Fast, deterministic. Mock boundaries (database, network), not logic.

**Rules:**
- Mock the database layer and external APIs
- Do NOT mock the code under test
- Every test must assert specific output values, not just existence
- `expect(thing).toBeDefined()` alone is NOT a valid test

### Mission Tests (Playwright)

End-to-end workflows against the running system. Actions trigger via API or UI. Assertions are against database state, not UI.

Example mission: "Type scene heading in script editor. Wait for autosave. Assert rewrite_scenes table has row with correct location."

Binary pass/fail. No interpretation.

**Wiring rule:** For every user-facing feature, at least one mission test must follow the actual user path — interact via UI, then assert expected backend outcome.

---

## Enforcement

- `pnpm check` — SvelteKit check + TypeScript. Must pass.
- `pnpm lint` — ESLint + style enforcement. Must pass.
- `pnpm test` — Unit tests. Must pass.
- `pnpm test:missions` — Mission tests. Must pass.
- All must pass before commit.

---

## Domain Contract Stability

The table schemas defined in the data model specs are frozen. If a schema change is needed, flag it for human review.
