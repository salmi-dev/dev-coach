# Implementation tasks: colorize-cli

## 1. Color helper module

- [x] 1.1 Create `src/utils/colors.ts` with module-level `colorEnabled` computed from `NO_COLOR`, `TERM`, `Deno.stdout.isTerminal()`
- [x] 1.2 Export `setColorEnabled(enabled: boolean): void` for `--no-color` flag and tests
- [x] 1.3 Export `c` object: basic colors (`red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `gray`) + style modifiers (`bold`, `dim`)
- [x] 1.4 Export semantic helpers: `success`, `error`, `warn`, `info`, `accent` (each delegates to a basic color)
- [x] 1.5 Export `stripAnsi(s: string): string` (canonical implementation)
- [x] 1.6 Add JSDoc with `@example` to every export
- [x] 1.7 Update `scripts/check-coverage.ts` to import `stripAnsi` from `src/utils/colors.ts` instead of defining its own

## 2. ASCII banner

- [x] 2.1 Add `SKILL_BANNERS: Record<string, string[]>` to `src/utils/ascii.ts` with 3-line ASCII art for each of: ask, explain, compare, sandbox, review,
      project, stats
- [x] 2.2 Add `printBanner(skillId: string): void` rendering banner + `coach:<skill>` framed by `╭─...─╮` corners, cyan when colored
- [x] 2.3 Banner falls back to single line `coach:<skill>` for unknown skill ids (no throw)
- [x] 2.4 Width clamp: `Math.min(60, Deno.consoleSize().columns)` (graceful when not a TTY)

## 3. Router integration

- [x] 3.1 In `src/cli/router.ts`, parse and strip `--no-color` from `Deno.args` before dispatch; call `setColorEnabled(false)` when present
- [x] 3.2 Mention `--no-color` in `--help` output
- [x] 3.3 Call `printBanner(<skill>)` for skill subcommands only (ask, explain, compare, sandbox, review, project, stats); NOT for tldr/snippet/init/install-*
- [x] 3.4 Colorize router status messages: ✅ in `c.success`, ❌/error in `c.error`, ℹ️ in `c.info`, paths in `c.dim`

## 4. Library CLI integration

- [x] 4.1 In `src/cli/library.ts` list output: slug bolded, em-dash separators dimmed, tags in `c.cyan`
- [x] 4.2 Search results: bold slug, dim path, then post-process line to highlight query matches in `c.yellow(c.bold(...))`
- [x] 4.3 Add `escapeRegex(s: string): string` helper (local to library.ts) and use it before building highlight pattern
- [x] 4.4 Error messages (no editor configured, unknown slug, etc.) use `c.error`
- [x] 4.5 Success messages (re-indexed, deleted) use `c.success`

## 5. Stats colorization

- [x] 5.1 In `src/skills/stats.ts` `renderBar`: filled `█` blocks via `c.green`, empty `░` blocks via `c.dim`
- [x] 5.2 Section headers in monthly/weekly dashboard use `c.bold`
- [x] 5.3 Verify `tests/skills_run_test.ts` stats tests still pass (assertions use `.length > 0`, not equality — should be fine)

## 6. Skill response purity

- [x] 6.1 Audit all skill `run()` methods to confirm response strings contain no ANSI escapes
- [x] 6.2 Add a guard test in `tests/skills_run_test.ts` asserting `result.response` matches `/\x1b\[/` is false for ask/explain/compare/sandbox/review

## 7. Tests

- [x] 7.1 Create `tests/colors_test.ts`: enable/disable, NO_COLOR env, stripAnsi round-trip, semantic helper output
- [x] 7.2 Extend `tests/cli_test.ts` (or new `tests/router_color_test.ts`) with subprocess test running `coach --no-color tldr list` and asserting no `\x1b[` in
      stdout
- [x] 7.3 Add subprocess test for skill banner: run `EDITOR=true coach ask "hi"` (or pipe stdin) and assert stdout starts with banner border characters
- [x] 7.4 All new exports have JSDoc

## 8. Quality gate

- [x] 8.1 `deno fmt`
- [x] 8.2 `deno lint` clean
- [x] 8.3 JSDoc audit: every new export has `/** ... */` directly above
- [x] 8.4 `deno task verify` passes (≥80% line coverage maintained)
- [x] 8.5 `openspec verify --change colorize-cli` clean
