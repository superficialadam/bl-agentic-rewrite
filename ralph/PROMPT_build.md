## Context Loading (minimize what enters main context)

0a. Find the next unchecked priority: `grep -n '\- \[ \]' ralph/IMPLEMENTATION_PLAN.md | head -3`
0b. Read ONLY the priority section you will work on from ralph/IMPLEMENTATION_PLAN.md (use offset/limit, NOT the full file).
0c. Read ONLY the specs referenced by that priority via subagents — do NOT read all specs.
0d. Search existing source code for relevant files via subagents before making changes.

## Execution

1. Implement exactly ONE priority block — the first unchecked item. Do not proceed to the next. Use up to 500 parallel Sonnet subagents for searches/reads. Use Opus subagents for complex reasoning (debugging, architectural decisions).
2. After implementing, run tests for that unit of code. If functionality is missing, add it per specs.
3. VERIFICATION GATE: After tests pass, smoke test against the running system. API endpoints → curl. DB writes → psql query. LLM calls → check trace table. Do NOT mark complete until you have evidence of real execution.
4. When verification passes, update ralph/IMPLEMENTATION_PLAN.md (via subagent — see rules below), then `git add -A && git commit && git push`. Then STOP.
5. COMPLETION SIGNAL: If ALL items are checked off, write `DONE` to `ralph/.loop-stop`.

## IMPLEMENTATION_PLAN.md Rules (CRITICAL for context budget)

The plan file MUST stay under 100 lines. Every loop iteration reads it, so bloat compounds.

- **Completed priorities:** Replace ALL detail with a single line: `## Priority N — Title ✅`
  Delete sub-items, learnings, verification evidence — everything. One line per completed priority.
- **Current priority:** Full detail is fine while working on it.
- **Future priorities:** One-line summary only. Example: `## Priority 8 — Prompt Loading (agents.md, admin-mode.md)`. NO sub-items, NO implementation detail — the specs have that.
- **Learnings header:** Max 5 bullet points at the top of the file. Each bullet max 1 line. Oldest gets removed when adding new. Only record learnings that prevent REPEATING A MISTAKE (API gotchas, schema surprises). Do NOT record what you built or how — that's in git.
- **Never duplicate spec content** into the plan. Reference the spec file name instead.
- When updating the plan via subagent, include these rules in the subagent prompt.

## Quality Rules

- Single sources of truth, no migrations/adapters. If unrelated tests fail, fix them.
- Git tag after each clean build (start 0.0.0, increment patch).
- Implement completely. No placeholders or stubs.
- Keep ralph/AGENTS.md operational only — no status updates or progress notes.
- TEST QUALITY: Every assertion must verify behavior, not existence. `expect(x).toBeDefined()` is not a test. If a unit test mocks its core dependency, add a mission test against real infrastructure.
- ANTI-PATTERNS:
  - `expect(x).toBeDefined()` / `toBeTruthy()` as sole assertions
  - Mocking the module under test
  - Mocking `@ai-sdk/gateway` to return `{ modelId, provider: 'gateway' }`
  - "Tests pass" as sole evidence when all externals are mocked
  - Completing a priority without real execution evidence
  - Recreating existing v1 tables (shopping_lists, shopping_items, tasks, events, etc.)
