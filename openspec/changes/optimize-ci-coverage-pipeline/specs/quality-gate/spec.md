## MODIFIED Requirements

### Requirement: Single verify task

The project SHALL provide a `deno task verify` command that runs, in order: format check, lint, tests with coverage instrumentation, and a coverage threshold
check. The task SHALL exit non-zero on the first failing step. Internally `verify` SHALL be composed of `deno task coverage:report` (run tests with
`--coverage`) followed by `deno task coverage:check` (enforce threshold against the produced profile), so that CI can run the two halves separately without
re-running tests.

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
- **THEN** `deno task verify` SHALL fail at the `coverage:report` step and not run `coverage:check`

#### Scenario: Coverage report and check are independently runnable

- **WHEN** a developer (or CI) runs `deno task coverage:report` and then later runs `deno task coverage:check` against the produced profile
- **THEN** the two steps SHALL together produce the same pass/fail outcome as `deno task verify` minus the fmt and lint gates

### Requirement: Coverage threshold enforcement

The system SHALL enforce a minimum overall **line coverage of 80%** for files under `src/` on Deno. The check SHALL be implemented by a single script
(`scripts/check-coverage.ts`) that supports two input modes:

1. **Deno profile-dir mode** (default): the script SHALL accept a path to a `deno test --coverage` profile directory, invoke
   `deno coverage <dir> --include=src/`, parse the "All files" summary line, and exit non-zero when below threshold.
2. **lcov mode**: when invoked with `--lcov <path>`, the script SHALL parse a standard lcov file (`SF:` / `DA:` records), aggregate line coverage across files
   matching `--include` globs (or a named `--profile <preset>` whose include list is defined as a script-level constant), and exit non-zero when below
   `--threshold` (default 80).

The script SHALL be the single source of truth for "is coverage above threshold" across Deno, Bun, and Node CI jobs.

#### Scenario: Deno coverage above threshold

- **WHEN** overall line coverage of `src/` is ≥ 80% in the supplied profile dir
- **THEN** `scripts/check-coverage.ts <profile-dir>` SHALL print the percentage and exit with code 0

#### Scenario: Deno coverage below threshold

- **WHEN** overall line coverage of `src/` is < 80%
- **THEN** the script SHALL print the actual percentage, the threshold, and exit with code 1

#### Scenario: Missing coverage profile

- **WHEN** the supplied coverage profile directory does not exist or contains no traces, or the supplied lcov file is missing
- **THEN** the script SHALL print an error and exit with code 1

#### Scenario: lcov mode against included scope

- **WHEN** the script is invoked as `scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime --threshold 80`
- **AND** aggregated line coverage across the `cross-runtime` preset's include globs is ≥ 80%
- **THEN** the script SHALL print the percentage and exit with code 0

#### Scenario: lcov mode below threshold

- **WHEN** the script is invoked in lcov mode and aggregated coverage is below the supplied threshold
- **THEN** the script SHALL print the actual percentage, the threshold, the include globs used, and exit with code 1

### Requirement: CI workflow mirrors the local verify task

The repository SHALL include a GitHub Actions workflow at `.github/workflows/pipeline.yml` (workflow name `CI`) that runs on every push to `main` and every pull
request targeting `main`. The workflow SHALL execute the same gates a developer runs locally via `deno task verify`, broken into separate jobs for visibility:
`fmt`, `lint`, `build`, `test`, `verify`, plus an aggregating `ci-gate` job. The Deno test suite SHALL run **exactly once** per CI build: the `test` job SHALL
invoke `deno task coverage:report` and upload the produced `cov_profile/` directory as an artifact, and the `verify` job SHALL download that artifact and run
`deno task coverage:check` without re-executing tests. JSR publishing is **not** part of this workflow — it lives in the `Release` workflow so a package version
is only published when a maintainer cuts a release.

#### Scenario: Push to main runs the full pipeline

- **WHEN** a commit is pushed to `main`
- **THEN** GitHub Actions SHALL run jobs `fmt`, `lint`, `build`, `test`, `verify`, and `ci-gate` in that dependency order
- **AND** `build` and `test` SHALL depend on `fmt` and `lint`
- **AND** `verify` SHALL depend on `build` and `test`
- **AND** no JSR publish SHALL occur from this workflow

#### Scenario: Pull request runs gates without publishing

- **WHEN** a pull request targets `main`
- **THEN** the workflow SHALL run `fmt`, `lint`, `build`, `test`, `verify`, and `ci-gate`
- **AND** no JSR publish SHALL occur (publishing is gated on the `Release` workflow only)

#### Scenario: CI gate aggregates results

- **WHEN** any of `fmt`, `lint`, `build`, `test`, `verify` ends in `failure` or `cancelled`
- **THEN** the `ci-gate` job SHALL exit non-zero and emit a per-job result table to `$GITHUB_STEP_SUMMARY`

#### Scenario: Run name uses the commit SHA

- **WHEN** the workflow is triggered by a push to `main`
- **THEN** the run-name SHALL be `main — <github.sha>` (full SHA; GitHub Actions expressions provide no substring function at the run-name level)
- **AND** for pull requests the run-name SHALL be `PR #<number> — <title>`

#### Scenario: Deno tests run only once per build

- **WHEN** the CI pipeline runs end-to-end on a push or pull request
- **THEN** `deno test` SHALL be invoked at most once across the whole workflow (inside the `test` job, with `--coverage`)
- **AND** the `verify` job SHALL consume the produced profile via `actions/download-artifact` rather than running `deno test` again

### Requirement: CI verifies multi-runtime compatibility

The CI workflow (`.github/workflows/pipeline.yml`) SHALL include two additional jobs, `test-bun` and `test-node`, that run a curated subset of `tests/**`
exercising the library surface on Bun and Node respectively. Both jobs SHALL depend on `fmt` and `lint`, and SHALL feed into `ci-gate` so failures block merges
to `main`. As of this change the cross-runtime jobs are **blocking** — the previous “non-blocking until 5 green main builds” gate from runtime-compat task 7.6
is lifted in this same change because the new coverage gate provides an additional layer of protection that justifies the flip.

The `test-node` job SHALL run on a matrix of supported Node versions (at minimum Node 22 and Node 24).

Both jobs SHALL collect line-coverage data while running the cross-runtime suite and SHALL invoke `scripts/check-coverage.ts` in lcov mode against the
`cross-runtime` preset to enforce a minimum **60% line coverage** on the modules the cross-runtime suite is meant to exercise (the runtime adapter under
`src/utils/runtime/**`, the SQLite adapter under `src/db/sqlite/**`, and `src/utils/prompt.ts`). The 60% floor is a **regression gate**, deliberately set below
today's measured baselines (Bun ≈ 66%, Node ≈ 83%) so the suite can be expanded incrementally without forcing test additions in any single change. The coverage
gate SHALL fail the job when the threshold is not met, and because the test jobs are blocking in `ci-gate`, the workflow as a whole SHALL fail.

The Deno-binary integration tests (CLI subprocess tests under `tests/`) SHALL remain Deno-only and run in the existing `test` job.

#### Scenario: Push to main runs Bun and Node tests

- **WHEN** a commit is pushed to `main`
- **THEN** GitHub Actions SHALL run `fmt`, `lint`, `build`, `test`, `test-bun`, `test-node`, `verify`, and `ci-gate`
- **AND** `test-bun` SHALL execute the cross-runtime test subset under Bun with `bun test --coverage --coverage-reporter=lcov`
- **AND** `test-node` SHALL execute the same subset under Node 22 and Node 24 with the built-in test-coverage reporter writing lcov

#### Scenario: Cross-runtime test failure blocks the gate

- **WHEN** the `test-bun` job fails (test failure or coverage below threshold)
- **THEN** the `ci-gate` job SHALL exit non-zero
- **AND** the failure SHALL appear in the per-job result table emitted to `$GITHUB_STEP_SUMMARY`

#### Scenario: Cross-runtime coverage below threshold fails the job

- **WHEN** the cross-runtime suite runs on Bun and aggregated line coverage on the cross-runtime preset is < 60%
- **THEN** the `test-bun` job SHALL exit non-zero at the coverage-check step
- **AND** the same SHALL hold for `test-node` matrix entries

## ADDED Requirements

### Requirement: Cross-runtime coverage scope is defined in code, not in workflow YAML

`scripts/check-coverage.ts` SHALL export a `CROSS_RUNTIME_INCLUDE` constant listing the glob patterns that scope the Bun and Node coverage gates. The list SHALL
be the single source of truth — the workflow YAML SHALL invoke the script with `--profile cross-runtime` (a named preset) rather than passing globs inline.

The initial value SHALL be:

- `src/utils/runtime/**`
- `src/db/sqlite/**`
- `src/utils/prompt.ts`

Adding a new module to the cross-runtime suite SHALL include adding it to `CROSS_RUNTIME_INCLUDE`.

#### Scenario: Workflow uses preset name, not raw globs

- **WHEN** a reviewer reads `.github/workflows/pipeline.yml`
- **THEN** the Bun and Node coverage-check invocations SHALL pass `--profile cross-runtime`
- **AND** SHALL NOT inline the include glob list

#### Scenario: Adding a cross-runtime test for a new module

- **WHEN** a developer adds a `tests/cross-runtime/<feature>.test.ts` exercising a new module
- **THEN** the developer SHALL extend `CROSS_RUNTIME_INCLUDE` with the corresponding `src/<feature>/**` glob in the same change
