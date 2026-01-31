# AGENTS.md

## Build & Run

```bash
pnpm install
pnpm dev
```


## Validation

Run these after implementing to get immediate feedback:

- Tests (unit): `pnpm test`
- Tests (mission): `pnpm test:missions`
- Tests (all): `pnpm test:all` — runs both unit and mission tests
- Typecheck: `pnpm check`
- Lint: `pnpm lint`

## Database

Using local Supabase instance. All v2 tables prefixed with `rewrite_` to avoid conflicts with v1.

```bash
# Query directly
psql "postgresql://postgres:postgres@localhost:54322/postgres"

# Verify traces after implementation
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT trace_id, event_type, function_name, duration_ms FROM rewrite_traces ORDER BY timestamp DESC LIMIT 10"

# Verify clips
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT id, start_frame, duration_frames FROM rewrite_clips ORDER BY created_at DESC LIMIT 10"
```

## Smoke Test

After implementing API endpoints, verify with curl:

```bash
curl -X POST http://localhost:5173/api/generate/image -H 'Content-Type: application/json' -d '{"prompt": "a red apple", "width": 1024, "height": 576}'
```

## Operational Notes

- Dev server runs on port 5173
- `vite.config.ts` has `server.host: '0.0.0.0'` so `--host` flag is optional
- `pnpm check` runs `svelte-kit sync` before `svelte-check` — generates `.svelte-kit/` types
- Svelte 5 uses `$props()` rune and `{@render children()}` for slots
- Tailwind v4 uses CSS-based config, not JS
- TipTap used directly (not svelte-tiptap wrapper)
- Timeline canvas uses Raw Canvas 2D API, no libraries
- SvelteKit loads `.env` automatically — do NOT install dotenv
