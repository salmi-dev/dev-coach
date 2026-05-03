## ADDED Requirements

### Requirement: Single verify task

The project SHALL provide a `deno task verify` command that runs, in order: format check, lint, tests with coverage instrumentation, and a coverage threshold
check. The task SHALL exit non-zero on the first failing step.

#### Scenario: Verify on a clean tree

- **WHEN** the working tree is formatted, lint-clean, all tests pass, and overall line coverage ≥ 80%
- **THEN** `deno task verify` SHALL exit with code 0

#### Scenario: Format drift

- **WHEN** any file under the project root violates `deno fmt`
- **THEN** `deno task verify` SHALL fail at the `deno fmt --check` step and exit non-zero before running lint or tests

#### Scenario: Lint error present

- **WHEN** `deno lint` reports any error
- **THEN** `deno task verify` SHALL fail at the lint step and exit non-zero

#### Scenario: Test failure

- **WHEN** any test under `tests/` fails
- **THEN** `deno task verify` SHALL fail at the test step and not run the coverage check

### Requirement: Coverage threshold enforcement

The system SHALL enforce a minimum overall **line coverage of 80%** for files under `src/`. The check SHALL be implemented by a small script
(`scripts/check-coverage.ts`) that parses the `deno coverage` summary and exits non-zero when the threshold is not met.

#### Scenario: Coverage above threshold

- **WHEN** overall line coverage of `src/` is ≥ 80%
- **THEN** `scripts/check-coverage.ts` SHALL print the percentage and exit with code 0

#### Scenario: Coverage below threshold

- **WHEN** overall line coverage of `src/` is < 80%
- **THEN** the script SHALL print the actual percentage, the threshold, and exit with code 1

#### Scenario: Missing coverage profile

- **WHEN** the coverage profile directory does not exist or contains no traces
- **THEN** the script SHALL print an error and exit with code 1

### Requirement: Zero lint errors at archive time

Every change SHALL leave `deno lint` reporting **zero errors** before being archived. This is enforced by `deno task verify` being part of every change's verify
step.

#### Scenario: New code introduces a lint error

- **WHEN** a developer runs `deno task verify` and `deno lint` reports any error
- **THEN** the verify task SHALL fail and the change SHALL NOT be archivable until the error is resolved

### Requirement: JSDoc on exported symbols

Every `export` in `src/**/*.ts` (function, class, const, type, interface, enum) SHALL have a JSDoc comment immediately preceding it. The comment SHALL include
at least a one-line summary; non-trivial signatures SHALL include `@param` and `@returns`; APIs surfaced through `cli/`, `mod.ts`, or pi tools SHALL include an
`@example` block.

#### Scenario: Audit baseline

- **WHEN** a reviewer greps for `^export` lines under `src/`
- **THEN** every match SHALL have a `/** ... */` block immediately above it

#### Scenario: Trivial helper

- **WHEN** an exported function has no parameters and a self-evident return (e.g. `getOS(): OS`)
- **THEN** a single-line summary alone SHALL satisfy the rule

### Requirement: README documents the verify task

The README SHALL include a one-paragraph "Quality gate" section under Development that mentions `deno task verify`, lists what it checks, and states the 80%
line-coverage threshold.

#### Scenario: README mentions verify

- **WHEN** a developer reads `README.md`
- **THEN** they SHALL find a description of `deno task verify` covering fmt, lint, tests, and the 80% line-coverage threshold

### Requirement: OpenSpec rule references verify

The OpenSpec project context (`openspec/config.yaml`) SHALL include in its `rules.tasks` an instruction that every change's `tasks.md` ends with a
`deno task verify` step.

#### Scenario: New change inherits the rule

- **WHEN** a developer generates a new change's tasks via `openspec instructions tasks`
- **THEN** the rendered `<rules>` block SHALL include the `deno task verify` instruction
