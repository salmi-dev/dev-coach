## MODIFIED Requirements

### Requirement: CI verifies multi-runtime compatibility

The CI workflow (`.github/workflows/pipeline.yml`) SHALL include two additional jobs, `test-bun` and `test-node`, that run a curated subset of `tests/**`
exercising the library surface on Bun and Node respectively. Both jobs SHALL depend on `fmt` and `lint`, and SHALL feed into `ci-gate` so failures block merges
to `main`. The cross-runtime jobs SHALL be **blocking**.

The `test-node` job SHALL run on a matrix of supported Node versions (at minimum Node 22 and Node 24).

Both jobs SHALL collect line-coverage data while running the cross-runtime suite and SHALL invoke `scripts/check-coverage.ts` in lcov mode against the
`cross-runtime` preset to enforce a minimum **80% line coverage** on the modules the cross-runtime suite is meant to exercise (the runtime adapter under
`src/utils/runtime/**`, the SQLite adapter under `src/db/sqlite/**`, and `src/utils/prompt.ts`). The 80% line-coverage gate SHALL match the Deno gate's level so
the project ships a single, uniform quality promise across runtimes. The threshold SHALL be inherited from `scripts/check-coverage.ts`'s `THRESHOLD` constant
(currently `80`); the workflow SHALL NOT override it via `--threshold`. The coverage gate SHALL fail the job when the threshold is not met, and because the test
jobs are blocking in `ci-gate`, the workflow as a whole SHALL fail.

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

- **WHEN** the cross-runtime suite runs on Bun and aggregated line coverage on the cross-runtime preset is < 80%
- **THEN** the `test-bun` job SHALL exit non-zero at the coverage-check step
- **AND** the same SHALL hold for `test-node` matrix entries

#### Scenario: Workflow does not override the threshold

- **WHEN** a reviewer reads the Bun and Node coverage-check invocations in `.github/workflows/pipeline.yml`
- **THEN** the invocations SHALL NOT pass `--threshold`
- **AND** the gate SHALL inherit the `THRESHOLD = 80` constant exported by `scripts/check-coverage.ts`

### Requirement: Coverage threshold enforcement

The system SHALL enforce a minimum overall **line coverage of 80%** for files under `src/` on Deno, and the same **80%** floor on the `cross-runtime` preset
(`src/utils/runtime/**`, `src/db/sqlite/**`, `src/utils/prompt.ts`) on Bun and Node. The check SHALL be implemented by a single script
(`scripts/check-coverage.ts`) that supports two input modes:

1. **Deno profile-dir mode** (default): the script SHALL accept a path to a `deno test --coverage` profile directory, invoke
   `deno coverage <dir> --include=src/`, parse the "All files" summary line, and exit non-zero when below threshold.
2. **lcov mode**: when invoked with `--lcov <path>`, the script SHALL parse a standard lcov file (`SF:` / `DA:` records), aggregate line coverage across files
   matching `--include` globs (or a named `--profile <preset>` whose include list is defined as a script-level constant), and exit non-zero when below
   `--threshold` (default 80).

The script SHALL be the single source of truth for "is coverage above threshold" across Deno, Bun, and Node CI jobs, and the same threshold value (80) SHALL
apply to all three runtimes by default.

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

- **WHEN** the script is invoked as `scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime`
- **AND** aggregated line coverage across the `cross-runtime` preset's include globs is ≥ 80%
- **THEN** the script SHALL print the percentage and exit with code 0

#### Scenario: lcov mode below threshold

- **WHEN** the script is invoked in lcov mode without an explicit `--threshold` and aggregated coverage is below 80%
- **THEN** the script SHALL print the actual percentage, the threshold (80), the include globs used, and exit with code 1

## ADDED Requirements

### Requirement: Local cross-runtime test scripts

The repository SHALL include two executable bash scripts, `scripts/test-bun.sh` and `scripts/test-node.sh`, that run the same cross-runtime gate as the CI
`test-bun` and `test-node` jobs respectively. Each script SHALL:

1. Use `set -euo pipefail` and a `#!/usr/bin/env bash` shebang.
2. Remove any prior `coverage/` directory (or its lcov file) so the run is reproducible.
3. Invoke the runtime's test command with line-coverage instrumentation, writing lcov to `coverage/lcov.info`.
4. Invoke `deno run -A scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime` (with no `--threshold`, inheriting the 80% default).
5. Propagate the failing step's exit code as the script's own exit code.

The CI workflow's `test-bun` and `test-node` steps SHALL invoke these scripts directly (e.g. `bash scripts/test-bun.sh`) so that the local and CI execution
paths share a single recipe and cannot drift. The scripts SHALL NOT depend on macOS-only flags and SHALL work on Ubuntu (CI) and macOS (local).

The scripts SHALL be discoverable via `deno.json`: `deno task test:bun` SHALL run `scripts/test-bun.sh` and `deno task test:node` SHALL run
`scripts/test-node.sh`.

#### Scenario: Local Bun gate succeeds

- **WHEN** a developer with `bun` and `deno` on `PATH` runs `bash scripts/test-bun.sh` (or `deno task test:bun`) on a clean tree
- **AND** the cross-runtime test suite passes under Bun
- **AND** aggregated line coverage on the `cross-runtime` preset is ≥ 80%
- **THEN** the script SHALL exit 0
- **AND** the final stdout line SHALL be `scripts/check-coverage.ts`'s success message

#### Scenario: Local Node gate fails on coverage

- **WHEN** a developer runs `bash scripts/test-node.sh` and aggregated line coverage on the preset is < 80%
- **THEN** the script SHALL exit non-zero with `scripts/check-coverage.ts`'s failure message visible in stdout/stderr

#### Scenario: CI invokes the same script

- **WHEN** a reviewer reads the `test-bun` job in `.github/workflows/pipeline.yml`
- **THEN** the test/coverage step SHALL run `bash scripts/test-bun.sh` rather than re-encoding the `bun test ...` and `scripts/check-coverage.ts` invocations
  inline
- **AND** the same SHALL hold for the `test-node` job and `scripts/test-node.sh`

#### Scenario: Discoverability via deno.json

- **WHEN** a developer runs `deno task` with no arguments
- **THEN** the listed tasks SHALL include `test:bun` and `test:node`
- **AND** invoking either task SHALL execute the corresponding script
