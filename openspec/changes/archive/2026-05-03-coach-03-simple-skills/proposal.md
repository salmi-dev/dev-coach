## Why

The CLI foundation (change 01) and storage layer (change 02) are complete, but all skill commands are stubs. Users can `coach init` and the DB/library are
ready, but `coach ask`, `coach explain`, and `coach compare` just print "not yet implemented." These three skills share the simplest interaction pattern (1
question → 1 response) and will establish the skill architecture that all future skills build on.

## What Changes

- **New base skill interface** (`src/skills/base.ts`) — `Skill` interface, `SessionContext`, `SkillResult` types used by all skills
- **`coach:ask` skill** — Quick Q&A with command detection, clipboard copy, and tldr save prompt
- **`coach:explain` skill** — Structured 5-layer explanation with cross-references to existing library items
- **`coach:compare` skill** — Side-by-side comparison with ASCII table, verdict, and code examples
- **CLI router update** — Replace stubs with real skill handlers for ask, explain, compare
- **Pi skill definitions** — SKILL.md files for each skill so they work within pi agents

## Capabilities

### New Capabilities

- `skill-base`: Base skill interface (`Skill`, `SessionContext`, `SkillResult`), shared skill runner with session logging and save prompt flow
- `skill-ask`: Quick Q&A skill — answer questions, detect commands, offer clipboard copy + tldr save
- `skill-explain`: Deep-dive explainer — 5-layer structured output (one-liner, core, how-it-works, example, gotchas) with library cross-references
- `skill-compare`: Comparison skill — ASCII table, verdict, code examples for each approach, save as snippet

### Modified Capabilities

(none)

## Impact

- **New files**: `src/skills/base.ts`, `src/skills/ask.ts`, `src/skills/explain.ts`, `src/skills/compare.ts`,
  `src/pi/skills/coach-{ask,explain,compare}/SKILL.md`
- **Modified files**: `src/cli/router.ts` (replace stubs with real handlers)
- **Dependencies**: Uses storage layer (save prompt, search, session logger) from change 02
