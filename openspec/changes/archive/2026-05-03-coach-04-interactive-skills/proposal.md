## Why

Changes 01–03 delivered the foundation, storage layer, and three simple 1→1 skills (ask, explain, compare). But the coaching experience needs richer interactions: exploring a topic with multiple approaches (sandbox) and getting structured code feedback (review). These two skills introduce the multi-response pattern — producing multiple outputs per session with batch save capabilities — which is a new interaction model beyond the simple skills.

## What Changes

- **Multi-response framework** (`src/skills/interactive.ts`) — shared utilities for approach numbering, progress indicators, collection prompts, and batch save
- **`coach:sandbox` skill** — Explore a topic with multiple approaches, summary table, batch snippet save with selection
- **`coach:review` skill** — Structured code review (bugs, style, performance, security, architecture, refactored version, score) from file, stdin, or pasted code
- **Pi skill definitions** — SKILL.md files for sandbox and review
- **Pi custom tools** — `coach-save` and `coach-search` tools for agent use during interactions
- **CLI router update** — Replace sandbox and review stubs with real handlers

## Capabilities

### New Capabilities

- `interactive-framework`: Multi-response utilities — approach numbering, progress display, collection/selection prompt ("Which to save? [all/1,3/none]"), batch save with consistent frontmatter
- `skill-sandbox`: Explore topics with multiple approaches, summary table, batch snippet selection and save
- `skill-review`: Structured code review from file/stdin/paste — 6 review categories + refactored version + score, language auto-detection, severity levels
- `pi-custom-tools`: Agent-callable tools for saving items and searching library during interactions

### Modified Capabilities

(none)

## Impact

- **New files**: `src/skills/interactive.ts`, `src/skills/sandbox.ts`, `src/skills/review.ts`, `src/pi/skills/coach-{sandbox,review}/SKILL.md`, `src/pi/tools/coach-save.ts`, `src/pi/tools/coach-search.ts`
- **Modified files**: `src/cli/router.ts` (replace sandbox/review stubs)
- **Dependencies**: Uses skill base (change 03), storage layer (change 02)
