You are researching the `/create` route of an existing React Router V7  application located at `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform` in preparation for a full rewrite.

The route pattern is `[brandSlug]/[projectSlug]/create` (e.g. `pippi-langstrump/demo-episode-pingpong-room/create`).

## Step 1 — Check Progress

Read `ralph/RESEARCH.md` in this repo. If it doesn't exist, create it with all 7 section headers below, each marked 🔍.

Find the FIRST section still marked 🔍. That is your assignment for this iteration.

## Step 2 — Research ONE Section

Use Sonnet subagents for all file reads and searches in `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform`. Do NOT read source files into main context — subagents only.

The sections are:

1. **Route & Page Structure** — Files under the `[brandSlug]/[projectSlug]/create` route. Pages, layouts, loading states. URL structure, dynamic segments, page hierarchy.
2. **Components & UI** — Components used in the create flow. Props, state, forms, wizards, modals. Shared components imported from elsewhere.
3. **API & Server Actions** — API endpoints and server actions called by the create flow. Request/response shapes. Server vs client components. Middleware, auth checks.
4. **Database & Data Model** — Tables/models the create flow reads or writes. Schema (columns, types, relations). Supabase patterns (RLS, policies, triggers, functions).
5. **External Services & Integrations** — AI/LLM calls, file uploads, payment/billing, notifications, third-party APIs.
6. **Auth & Permissions** — Authentication method, permission/role checks, RLS policies.
7. **Business Logic & Edge Cases** — What does "create" produce? Validation rules, error handling, edge cases, feature flags.

## Step 3 — Write Findings

Update the section in `ralph/RESEARCH.md` with your findings. Be concise — reference source file paths instead of copying code. Include short snippets only when they clarify non-obvious patterns. Mark the section ✅ when done.

## Step 4 — Commit and STOP

Run: `git add -A && git commit -m "research: [section name]"`

Then STOP. Do not research the next section. The loop will call you again.

## Step 5 — Completion Check

If ALL 7 sections are ✅, write `DONE` to `ralph/.loop-stop` before stopping.
