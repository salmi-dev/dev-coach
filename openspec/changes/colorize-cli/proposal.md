## Why

The CLI today is mostly monochrome `console.log` output. Skill responses, library listings, and status messages all blend together — there's no visual hierarchy
that says "this is success", "this is an error", or "this is the start of a new section". A small, opinionated dose of ANSI color and ASCII art will make
`coach` feel like a polished tool, sharpen scanability of search/list output, and reinforce per-skill identity without changing any actual behavior.

## What Changes

- New `src/utils/colors.ts` module: small ANSI helper exposing semantic styles (`success`, `error`, `warn`, `info`, `dim`, `bold`, `accent`) plus `c.cyan`,
  `c.green`, etc. — auto-disables when `NO_COLOR=1`, `TERM=dumb`, or stdout is not a TTY.
- New `printBanner(skill)` helper in `src/utils/ascii.ts`: renders a small framed ASCII banner for each skill at start of a session (replaces the current bare
  "coach:ask" header).
- Colorize router/library/init output: ✅ in green, ❌ in red, ℹ️ in cyan, slugs/paths in dim, titles in bold; tag chips in cyan.
- Colorize `coach tldr list` / `coach snippet list`: `slug` (bold) — `title` (white) — `[tags]` (cyan dim).
- Colorize search results: highlight matched query terms in yellow.
- Colorize stats dashboard bars (`█` filled in green, `░` in dim) and section headers in bold.
- Add `--no-color` global flag and respect `NO_COLOR` env var (https://no-color.org).
- Expand `SKILL_ICONS` with a 3-line ASCII art block per skill (used by `printBanner`); keep current single-glyph icons as fallback.

## Capabilities

### New Capabilities

- `cli-presentation`: ANSI color and ASCII banner conventions for all CLI output, including the `--no-color` / `NO_COLOR` opt-out contract.

### Modified Capabilities

- `cli-router`: SHALL recognise the `--no-color` global flag and SHALL print a colorized startup banner for skill subcommands.
- `library-cli`: list/search/show output SHALL use the cli-presentation color scheme (slug bold, tags cyan, matches highlighted).

## Impact

- **Affected code**: `src/utils/ascii.ts` (extend), new `src/utils/colors.ts`, `src/cli/router.ts`, `src/cli/library.ts`, `src/skills/*` (banner calls only —
  response bodies stay plain Markdown), `src/skills/stats.ts` (bar coloring).
- **APIs**: new exports `c` (color helpers), `printBanner`, `colorize`. No breaking changes to existing exports.
- **Dependencies**: none — implemented with raw ANSI escape codes (~30 lines), no new JSR packages.
- **Tests**: new `tests/colors_test.ts` (NO_COLOR / TTY-detection / strip behavior); extend `tests/cli_test.ts` to assert color output is suppressed when
  `--no-color` is set.
- **Quality gate**: must keep `deno task verify` green (≥80% line coverage, lint clean, JSDoc on new exports).
