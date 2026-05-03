## Context

The CLI currently emits plain `console.log` text everywhere. Users running `coach tldr list` or `coach stats` see undifferentiated lines — no visual hierarchy
distinguishing slugs from titles, errors from successes, or section headers from data. Several callers already use emoji (✅ / ❌ / ℹ️ / 💾) but no color, and
the existing `src/utils/ascii.ts` only renders box borders. This change adds an opinionated, dependency-free color layer plus per-skill ASCII banners while
staying friendly to NO_COLOR / piped / `TERM=dumb` environments.

## Goals / Non-Goals

**Goals:**

- A single `c` API (`c.green('ok')`, `c.bold('title')`, `c.dim('path')`) that auto-disables when stdout is not a TTY or when `NO_COLOR` / `--no-color` /
  `TERM=dumb` is set.
- A small set of _semantic_ helpers (`success`, `error`, `warn`, `info`, `accent`) so callers don't pick raw colors ad-hoc.
- One ASCII banner per skill, rendered once at the top of a skill invocation. Skills' Markdown response bodies stay plain.
- Colorized list/search output in `cli/library.ts` (slug bold, tags cyan, query matches yellow).
- Colorized progress bars in `skills/stats.ts`.
- Tests that assert color is **not** emitted when `NO_COLOR=1`.

**Non-Goals:**

- No TUI / `cliffy`-style framework. Plain ANSI only.
- No 256-color or truecolor — basic 16-color palette is plenty.
- No coloring of skill **response bodies** (Markdown is consumed by the LLM and downstream tools — must stay clean).
- No theming/config — colors are hard-coded, opinionated.
- Windows-specific ANSI handling beyond what Deno already provides.

## Decisions

### 1. Raw ANSI strings, no dependencies

**Decision:** Implement `src/utils/colors.ts` from scratch as ~30 lines of `\x1b[Nm` wrapping. No `@std/fmt/colors`, no third-party libs. **Rationale:** Keeps
the dep tree minimal, easy to audit, easy to test. `@std/fmt/colors` exists but adds an import and we'd still wrap it for the auto-disable logic. **Alternative
considered:** `jsr:@std/fmt/colors` — rejected: trivial wrapper would still be needed for global disable.

### 2. Disable detection: env > flag > TTY

**Decision:** Enable color only when ALL of the following are true:

- `Deno.env.get('NO_COLOR')` is unset (or empty)
- `--no-color` flag is not on `Deno.args` (router strips before dispatch)
- `Deno.env.get('TERM') !== 'dumb'`
- `Deno.stdout.isTerminal()` returns `true`

A module-level `colorEnabled` is computed once and exposed via `setColorEnabled(boolean)` for tests. **Rationale:** Honors the
[no-color.org](https://no-color.org) standard, matches how `git`, `ls --color`, `rg` behave, and lets piped output (`coach tldr list | grep`) stay
grep-friendly.

### 3. Banner is opt-in per skill, not in router

**Decision:** Each skill's `run()` is responsible for calling `printBanner(skill.name)` once if it wants one. Library/list commands get NO banner — only skill
modes (ask/explain/compare/sandbox/review/project/stats). **Rationale:** Banners on every `coach tldr list` invocation would be noisy. Skills are
conversational; library commands are tool-like.

### 4. Banner shape: 3-line fixed-width block + skill name

**Decision:** Each skill defines a 3-line ASCII art block stored in `SKILL_BANNERS: Record<string, string[]>`. `printBanner('ask')` joins them with the skill
name, framed by `╭─...─╮`/`╰─...─╯` corners (re-using existing `renderBox` helper). Width clamped to `min(60, term.cols)`. **Rationale:** Keeps the visual
signature consistent across skills while letting each have a unique flavor.

### 5. Match-highlighting in search uses regex on the rendered line

**Decision:** In `cli/library.ts` search, post-process the line by case-insensitive replacing the query string with `c.yellow(c.bold(match))` _after_ the line
is fully formatted. **Rationale:** Simpler than threading the query through formatting helpers. Acceptable false-positive rate (highlights query inside
slug/tags too — usually that's what users want).

### 6. Color helpers cached, no closure-per-call

**Decision:** Pre-build `c.red`, `c.green`, etc. as `(s: string) => string` functions at module load. Each function checks `colorEnabled` at call time (cheap
branch) so toggling for tests works without re-importing.

## Risks / Trade-offs

- **Risk:** ANSI escapes leak into log files or pipes when `isTerminal()` misreports → **Mitigation:** trust the standard env vars (`NO_COLOR`, `TERM=dumb`) and
  document `--no-color` prominently in `--help`.
- **Risk:** Match-highlighting regex breaks on regex-special characters in queries (`.`, `*`, `(`) → **Mitigation:** escape the query with a small
  `escapeRegex()` helper before building the highlight pattern.
- **Risk:** Snapshot/string-equality tests across the codebase break because output now includes escapes → **Mitigation:** the existing `tests/cli_test.ts` uses
  `assertStringIncludes` on substrings, not full equality; new color is only added to formatted output that no test currently snapshot-asserts. Where needed, we
  strip ANSI in test setup via the existing `stripAnsi` from `scripts/check-coverage.ts` (will export it from `src/utils/colors.ts` instead).
- **Trade-off:** Hard-coded palette — users can't theme. Acceptable: NO_COLOR opt-out is the only knob people genuinely need.
- **Trade-off:** No truecolor → on basic terminals colors look fine; on fancy terminals they look "old-school". Considered a feature.

## Migration Plan

This change is purely additive — no existing behavior changes when `NO_COLOR=1`. Roll out in one PR: ship `colors.ts` + banner + caller updates + tests + verify
gate, then archive.

## Open Questions

- Should the `--no-color` flag also be respected per-subprocess (i.e., does `coach tldr edit` invoking `$EDITOR` need to forward it)? **Tentative answer:** no —
  editor sub-processes have their own TTY/env handling.
