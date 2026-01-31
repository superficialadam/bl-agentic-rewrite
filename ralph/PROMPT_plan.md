## Context Loading

0a. Read ralph/IMPLEMENTATION_PLAN.md to understand current state.
0b. Use up to 500 Sonnet subagents to study `ralph/specs/*` and `src/*` in parallel. Do NOT read specs into main context — subagents only.

## Planning Task

1. Compare existing source code against specs. Use Sonnet subagents for search/reads, Opus subagent for analysis and prioritization. Consider: TODOs, placeholders, skipped tests, missing features, inconsistencies.
2. Update ralph/IMPLEMENTATION_PLAN.md with findings.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first.

ULTIMATE GOAL: Implement everything in `ralph/specs/*` — nothing more, nothing less. Skip out-of-scope references.

PLAN STRUCTURE RULE: Every priority that produces runnable code MUST include verification in that same priority — not deferred. A priority is only complete when verified against the real running system.

SCOPE CAP RULE — SMALL PRIORITIES: Each priority should take ~50 tool uses to implement. That means roughly: 1 new file created, or 1 component built, or 1 agent wired up, or 2-3 existing files modified + tests. Use this checklist:

- Can you describe the deliverable in ≤8 words? If not, split it.
- Does it touch more than 3 source files (excluding tests)? If yes, split it.
- Does the title have "+" or "&" joining two nouns? Split them into separate priorities.
- Bad: "UI Shell + Design Tokens + Inbox Tab" (3 things). Good: "Design Tokens CSS", "App Shell Layout", "Inbox Tab Component" (3 priorities).
- Bad: "Router + Oracle Agent + Retrieval". Good: "Input Router", "Oracle Agent", "Retrieval Tools".
- Bad: "Universal Entity Detail" (adapts to 6 types). Good: "Entity Detail — Task/Event", "Entity Detail — Shopping/Idea/Fact/Reminder".

TEST CONSTRUCTION RULE — TEST THE WIRING, NOT JUST THE PARTS:
Tests must verify that components are correctly **connected**, not just that each works in isolation. For every user-facing feature, at least one mission test must follow the **actual user path** end-to-end: interact via the UI (or the exact client-side code path), then assert the expected backend outcome.

1. **Never test only one side of a call boundary.** If the UI calls an API, there must be a test that starts from the UI and asserts the correct API was called with the correct behavior.
2. **E2E tests must assert distinguishing outcomes, not shared ones.** If multiple code paths produce the same visible result, the test must assert something that **differs** between the correct and incorrect path.
3. **When a feature has branching behavior**, write at least one E2E test per branch that starts from the UI input and asserts the branch-specific outcome.
4. **Negative-path sanity check:** "If the client were calling the wrong endpoint entirely, would this test still pass?" If yes, the test is insufficient.

## IMPLEMENTATION_PLAN.md Format Rules (CRITICAL)

The plan file MUST stay under 100 lines total.

- **Completed priorities:** Single line only: `## Priority N — Title ✅`
- **Next priority to implement:** Can have sub-items (up to 10 lines) but reference spec files instead of duplicating their content.
- **Future priorities:** One-line summary only. Example: `## Priority 8 — Prompt Loading (agents.md, admin-mode.md)`. NO sub-items.
- **Learnings:** Max 5 bullets at top of file. One line each. Only gotchas that prevent repeating mistakes.
- **Never duplicate spec content** into the plan.
