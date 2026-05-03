# CLI Presentation

## Purpose

Define the cross-cutting visual conventions for the `coach` CLI: ANSI color helpers, color auto-detection, ASCII banners per skill, and the rule that Markdown
response bodies stay plain so they can be piped to LLMs and other consumers.

## Requirements

### Requirement: Color helper module

The system SHALL provide a `src/utils/colors.ts` module exporting a `c` object with semantic helpers (`success`, `error`, `warn`, `info`, `accent`, `dim`,
`bold`) and basic-color helpers (`red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `gray`). Each helper SHALL be a function `(s: string) => string` that
wraps its input in ANSI escape codes when color is enabled and returns the plain string otherwise.

#### Scenario: Color enabled wraps with escapes

- **WHEN** color is enabled and code calls `c.green('ok')`
- **THEN** the result SHALL begin with `\x1b[32m` (or equivalent green code) and end with `\x1b[0m`

#### Scenario: Color disabled returns plain text

- **WHEN** color is disabled and code calls `c.green('ok')`
- **THEN** the result SHALL equal exactly `ok` with no escape codes

### Requirement: Color auto-detection

The module SHALL compute `colorEnabled` once at module load by combining: stdout-is-TTY check, `NO_COLOR` env var (any non-empty value disables), `TERM=dumb`
env var (disables), and a runtime `--no-color` flag set via `setColorEnabled(false)`.

#### Scenario: NO_COLOR env disables

- **WHEN** `NO_COLOR=1` is set in the environment at process start
- **THEN** `c.green('x')` SHALL return `'x'` regardless of TTY status

#### Scenario: Non-TTY stdout disables

- **WHEN** stdout is piped to another process (`coach tldr list | cat`)
- **THEN** the output SHALL contain no ANSI escape codes

#### Scenario: Programmatic override for tests

- **WHEN** test code calls `setColorEnabled(false)` (or `true`)
- **THEN** subsequent calls to `c.*` helpers SHALL respect that override until changed

### Requirement: ANSI strip helper

The module SHALL export `stripAnsi(s: string): string` that removes all `\x1b[...m` escape sequences. This SHALL be the single canonical implementation reused
by `scripts/check-coverage.ts` and tests.

#### Scenario: Strips standard color codes

- **WHEN** `stripAnsi('\x1b[31mhello\x1b[0m')` is called
- **THEN** the result SHALL equal `'hello'`

#### Scenario: No-op on plain string

- **WHEN** `stripAnsi('plain text')` is called
- **THEN** the result SHALL equal `'plain text'`

### Requirement: Per-skill ASCII banner

The system SHALL provide `printBanner(skillId: string)` in `src/utils/ascii.ts` that prints a framed 3-to-5-line ASCII block plus the skill display name to
stdout. Banners SHALL be defined for at least: `ask`, `explain`, `compare`, `sandbox`, `review`, `project`, `stats`.

#### Scenario: Banner printed for known skill

- **WHEN** `printBanner('ask')` is called
- **THEN** stdout SHALL contain a multi-line block ending with the line `coach:ask`

#### Scenario: Banner falls back gracefully for unknown skill

- **WHEN** `printBanner('madeup')` is called
- **THEN** the system SHALL print only the line `coach:madeup` with no error

#### Scenario: Banner colorized when enabled

- **WHEN** color is enabled and `printBanner('ask')` is called
- **THEN** the banner border characters SHALL be wrapped in cyan ANSI codes

### Requirement: Semantic styling conventions

CLI output across the codebase SHALL apply these semantic styles consistently:

- ✅ success messages → `c.green`
- ❌ / error messages → `c.error` (red)
- ℹ️ / info messages → `c.info` (cyan)
- File paths and slugs in listings → `c.dim` for the path part, `c.bold` for the primary identifier
- Section headers and titles → `c.bold`
- Tags → `c.cyan`
- Search match highlights → `c.yellow` + `c.bold`
- Stats bar fills → `c.green`; empty bar slots → `c.dim`

#### Scenario: Success message is green when color enabled

- **WHEN** `coach install-aliases` succeeds and color is enabled
- **THEN** the line beginning with `✅` SHALL contain green ANSI escapes

#### Scenario: Error message is red when color enabled

- **WHEN** any CLI handler prints an error and color is enabled
- **THEN** the error message SHALL contain red ANSI escapes

### Requirement: Markdown response bodies remain plain for chat skills

Chat skill `run()` methods (`ask`, `explain`, `compare`, `sandbox`, `review`, `project`) SHALL NOT inject ANSI escape codes into the `response` field of
`SkillResult`. Coloring SHALL be applied only by the CLI presentation layer (banner + status messages around the response), never inside the response itself,
since these responses are downstream Markdown consumed by LLMs and tools.

The `stats` skill is an explicit exception: its response IS the rendered terminal dashboard and MAY contain ANSI escape codes which are honored when
`colorEnabled` is true.

#### Scenario: Chat-skill response body is plain Markdown

- **WHEN** `askSkill.run('q', ctx)` returns (likewise for explain/compare/sandbox/review/project)
- **THEN** `result.response` SHALL contain no `\x1b[` escape sequences regardless of `colorEnabled`

#### Scenario: Stats response respects color toggle

- **WHEN** `statsSkill.run('', ctx)` is invoked with `colorEnabled === false`
- **THEN** `result.response` SHALL contain no `\x1b[` escape sequences

#### Scenario: Stats response colored when enabled

- **WHEN** `statsSkill.run('', ctx)` is invoked with `colorEnabled === true`
- **THEN** `result.response` MAY contain ANSI escape sequences (e.g., colored progress bars, bold headers)
