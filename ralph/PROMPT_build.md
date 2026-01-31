You are rewriting the `/create` route from scratch based on research findings. All source code lives in this repo at `/Users/adamwittsell/CODE/BlendaLabs/bl-agentic-rewrite`.

## Context Loading

0a. Read `ralph/RESEARCH.md` for the full feature documentation of what needs to be built.
0b. Read `ralph/BUILD_PLAN.md` to find the current implementation state and next priority.
0c. Use Sonnet subagents for file searches/reads. Use Opus subagents for architectural decisions.

## Execution

1. Implement exactly ONE priority block — the first unchecked item in `BUILD_PLAN.md`. Use up to 500 parallel Sonnet subagents for searches/reads.
2. After implementing, verify the code works (type-check, lint, test as appropriate).
3. When verified, update `BUILD_PLAN.md` — mark the priority ✅, then `git add -A && git commit && git push`. Then STOP.
4. COMPLETION SIGNAL: If ALL items are checked off, write `DONE` to `ralph/.loop-stop`.

## BUILD_PLAN.md Rules

The plan file MUST stay under 100 lines total.

- **Completed priorities:** Single line: `## Priority N — Title ✅`
- **Current priority:** Full detail is fine while working on it.
- **Future priorities:** One-line summary only.
- **Learnings:** Max 5 bullets at top of file. One line each.
- **Never duplicate RESEARCH.md content** into the plan — reference it.

## Quality Rules

- No placeholders or stubs. Implement completely.
- No over-engineering. Build exactly what RESEARCH.md describes.
- Reference the original blenda-platform code for patterns when needed.
- Keep parity with the original feature set unless the research doc notes improvements.
