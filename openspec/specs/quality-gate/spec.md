## ADDED Requirements

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

### Requirement: Build job produces a signed Linux artifact

The `build` job SHALL run `deno task build` to produce the `coach` binary, upload it as an artifact named `coach-linux-x86_64` (30-day retention,
`if-no-files-found: error`), and generate SLSA v1.0 build provenance via `actions/attest-build-provenance@v2`.

#### Scenario: Build emits artifact and provenance

- **WHEN** the `build` job completes successfully on `main`
- **THEN** the `coach` binary SHALL be available as artifact `coach-linux-x86_64`
- **AND** an SLSA build-provenance attestation SHALL be recorded for that subject

### Requirement: Publish to JSR happens from the Release workflow

The `Release` workflow (`.github/workflows/release.yml`) SHALL include a `publish` job that runs `deno publish` with `id-token: write` so that JSR
auto-generates and signs SLSA build provenance via Sigstore. The job SHALL depend on `bump` and check out the bumped tag (`vX.Y.Z`) so the version published to
JSR matches the version on the GitHub Release. The CI pipeline (`pipeline.yml`) SHALL NOT publish to JSR.

#### Scenario: Release publishes the bumped version

- **WHEN** a maintainer dispatches `Release` and the `bump` job succeeds
- **THEN** the `publish` job SHALL check out tag `vX.Y.Z` and run `deno publish`
- **AND** the published version SHALL appear at `https://jsr.io/@salmidev/dev-coach` with the same `vX.Y.Z`

#### Scenario: Push to main does not publish to JSR

- **WHEN** a commit is pushed to `main` (including a release bump commit, which carries `[skip ci]`)
- **THEN** no `deno publish` SHALL be invoked from the CI workflow

### Requirement: Manual release workflow with semver bump

The repository SHALL include a `.github/workflows/release.yml` workflow named `Release`, triggered exclusively by `workflow_dispatch`, that takes one input
`bump` of type `choice` with options `patch | minor | major` (default `patch`). The workflow SHALL bump the `version` field of `deno.json`, commit the change
with `[skip ci]` to prevent the CI pipeline from re-triggering, create an annotated tag `vX.Y.Z`, and push both commit and tag to the triggering branch.

#### Scenario: Default bump is patch

- **WHEN** a maintainer dispatches the `Release` workflow without overriding inputs
- **THEN** the patch component of the version SHALL be incremented (e.g. `0.1.0` → `0.1.1`)

#### Scenario: Minor or major bump zeroes lower components

- **WHEN** `bump` is `minor`
- **THEN** the minor component SHALL be incremented and the patch component SHALL be reset to `0`
- **WHEN** `bump` is `major`
- **THEN** the major component SHALL be incremented and both minor and patch SHALL be reset to `0`

#### Scenario: Bump commit does not retrigger CI

- **WHEN** the release job pushes its `chore(release): vX.Y.Z` commit to `main`
- **THEN** the commit message SHALL contain the literal substring `[skip ci]`
- **AND** the `CI` workflow SHALL NOT run for that commit

### Requirement: Release workflow builds for linux, macOS, and windows

The `Release` workflow SHALL build native binaries for the following targets via a job matrix on real OS runners and upload each as a separate artifact with a
`.sha256` sidecar:

| Artifact name          | Runner           | `--target`                 | Suffix |
| ---------------------- | ---------------- | -------------------------- | ------ |
| `coach-linux-x86_64`   | `ubuntu-latest`  | `x86_64-unknown-linux-gnu` | (none) |
| `coach-macos-x86_64`   | `ubuntu-latest`  | `x86_64-apple-darwin`      | (none) |
| `coach-macos-aarch64`  | `macos-latest`   | `aarch64-apple-darwin`     | (none) |
| `coach-windows-x86_64` | `windows-latest` | `x86_64-pc-windows-msvc`   | `.exe` |

The `macos-x86_64` binary is **cross-compiled** on `ubuntu-latest` via `deno compile --target x86_64-apple-darwin`; the `macos-13` Intel runner pool is avoided
because its queue has been unreliable.

Each build SHALL invoke `deno compile` with the same permissions used by `deno task build` (`--allow-read --allow-write --allow-env --allow-run --allow-ffi`).

#### Scenario: All four binaries are produced

- **WHEN** the `Release` workflow completes successfully
- **THEN** four artifacts (`coach-linux-x86_64`, `coach-macos-x86_64`, `coach-macos-aarch64`, `coach-windows-x86_64`) SHALL exist
- **AND** each artifact SHALL include a `.sha256` file alongside the binary

#### Scenario: One target's build failure does not cancel the others

- **WHEN** any matrix job fails to compile
- **THEN** the remaining matrix jobs SHALL still run to completion (`fail-fast: false`)

### Requirement: Release workflow publishes a GitHub Release with attestations

A final `release` job SHALL download every matrix artifact, generate SLSA build provenance for all `coach-*` binaries via `actions/attest-build-provenance@v2`,
and publish a GitHub Release at the bumped tag using `softprops/action-gh-release@v2` with `generate_release_notes: true` and all binaries attached.

#### Scenario: Release page contains all binaries

- **WHEN** the `Release` workflow finishes
- **THEN** a GitHub Release at tag `vX.Y.Z` SHALL exist with the four `coach-*` binaries attached
- **AND** auto-generated release notes SHALL be present
- **AND** SLSA build provenance SHALL be attested for every `coach-*` artifact

### Requirement: Workflow actions pinned to current major versions

All third-party actions used in `.github/workflows/` SHALL be pinned to their current major version tag and SHALL be reviewed when this spec changes. The
currently approved set is:

- `actions/checkout@v6`
- `denoland/setup-deno@v2`
- `actions/upload-artifact@v7`
- `actions/download-artifact@v8`
- `actions/attest-build-provenance@v4`
- `softprops/action-gh-release@v3`

#### Scenario: Audit pinned actions

- **WHEN** a reviewer greps `uses:` lines under `.github/workflows/`
- **THEN** every action reference SHALL match one of the entries in the approved list above (or an explicit successor agreed in a follow-up change)

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

### Requirement: Runtime-compat claims are verified, not just self-declared

The runtimes listed under `publish.runtimeCompat` (or equivalent JSR field) in `deno.json` SHALL be exactly the runtimes proven by passing CI jobs at the time
of publish. Adding a runtime to the claim without a corresponding CI job SHALL be treated as a spec violation.

#### Scenario: Adding a new runtime claim requires CI evidence

- **WHEN** a maintainer adds a runtime key (e.g. `"workerd": true`) to `runtimeCompat`
- **THEN** there SHALL exist a CI job that runs the cross-runtime test subset under that runtime
- **AND** the change SHALL update this spec to list the new job
