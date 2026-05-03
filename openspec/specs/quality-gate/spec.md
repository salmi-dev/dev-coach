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

### Requirement: CI workflow mirrors the local verify task

The repository SHALL include a GitHub Actions workflow at `.github/workflows/pipeline.yml` (workflow name `CI`) that runs on every push to `main` and every pull
request targeting `main`. The workflow SHALL execute the same gates a developer runs locally via `deno task verify`, broken into separate jobs for visibility:
`fmt`, `lint`, `build`, `test`, `verify`, plus an aggregating `ci-gate` job, and a `publish` job restricted to push events on `main`.

#### Scenario: Push to main runs the full pipeline

- **WHEN** a commit is pushed to `main`
- **THEN** GitHub Actions SHALL run jobs `fmt`, `lint`, `build`, `test`, `verify`, `ci-gate`, and `publish` in that dependency order
- **AND** `build` and `test` SHALL depend on `fmt` and `lint`
- **AND** `verify` SHALL depend on `build` and `test`
- **AND** `publish` SHALL depend on `verify`

#### Scenario: Pull request runs gates without publishing

- **WHEN** a pull request targets `main`
- **THEN** the workflow SHALL run `fmt`, `lint`, `build`, `test`, `verify`, and `ci-gate`
- **AND** the `publish` job SHALL be skipped (it requires `github.event_name == 'push'` and `github.ref == 'refs/heads/main'`)

#### Scenario: CI gate aggregates results

- **WHEN** any of `fmt`, `lint`, `build`, `test`, `verify` ends in `failure` or `cancelled`
- **THEN** the `ci-gate` job SHALL exit non-zero and emit a per-job result table to `$GITHUB_STEP_SUMMARY`

#### Scenario: Run name uses the commit SHA

- **WHEN** the workflow is triggered by a push to `main`
- **THEN** the run-name SHALL be `main — <github.sha>` (full SHA; GitHub Actions expressions provide no substring function at the run-name level)
- **AND** for pull requests the run-name SHALL be `PR #<number> — <title>`

### Requirement: Build job produces a signed Linux artifact

The `build` job SHALL run `deno task build` to produce the `coach` binary, upload it as an artifact named `coach-linux-x86_64` (30-day retention,
`if-no-files-found: error`), and generate SLSA v1.0 build provenance via `actions/attest-build-provenance@v2`.

#### Scenario: Build emits artifact and provenance

- **WHEN** the `build` job completes successfully on `main`
- **THEN** the `coach` binary SHALL be available as artifact `coach-linux-x86_64`
- **AND** an SLSA build-provenance attestation SHALL be recorded for that subject

### Requirement: Publish job pushes to JSR with provenance

The `publish` job SHALL run `deno publish` with `id-token: write` so that JSR auto-generates and signs SLSA build provenance via Sigstore. The job SHALL only
run for push events on `main`.

#### Scenario: Publish on main

- **WHEN** `verify` succeeds on a push to `main`
- **THEN** `deno publish` SHALL be invoked and the published version SHALL appear at `https://jsr.io/@salmidev/dev-coach`

#### Scenario: Publish skipped on PR

- **WHEN** the workflow is triggered by a pull request
- **THEN** the `publish` job SHALL not run

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
| `coach-macos-aarch64`  | `macos-latest`   | `aarch64-apple-darwin`     | (none) |
| `coach-windows-x86_64` | `windows-latest` | `x86_64-pc-windows-msvc`   | `.exe` |

Each build SHALL invoke `deno compile` with the same permissions used by `deno task build` (`--allow-read --allow-write --allow-env --allow-run --allow-ffi`).

#### Scenario: All three binaries are produced

- **WHEN** the `Release` workflow completes successfully
- **THEN** three artifacts (`coach-linux-x86_64`, `coach-macos-aarch64`, `coach-windows-x86_64`) SHALL exist
- **AND** each artifact SHALL include a `.sha256` file alongside the binary

#### Scenario: One target's build failure does not cancel the others

- **WHEN** any matrix job fails to compile
- **THEN** the remaining matrix jobs SHALL still run to completion (`fail-fast: false`)

### Requirement: Release workflow publishes a GitHub Release with attestations

A final `release` job SHALL download every matrix artifact, generate SLSA build provenance for all `coach-*` binaries via `actions/attest-build-provenance@v2`,
and publish a GitHub Release at the bumped tag using `softprops/action-gh-release@v2` with `generate_release_notes: true` and all binaries attached.

#### Scenario: Release page contains all binaries

- **WHEN** the `Release` workflow finishes
- **THEN** a GitHub Release at tag `vX.Y.Z` SHALL exist with the three `coach-*` binaries attached
- **AND** auto-generated release notes SHALL be present
- **AND** SLSA build provenance SHALL be attested for every `coach-*` artifact

### Requirement: Workflow actions pinned to current major versions

All third-party actions used in `.github/workflows/` SHALL be pinned to their current major version tag and SHALL be reviewed when this spec changes. The
currently approved set is:

- `actions/checkout@v4`
- `denoland/setup-deno@v2`
- `actions/upload-artifact@v4`
- `actions/download-artifact@v4`
- `actions/attest-build-provenance@v2`
- `softprops/action-gh-release@v2`

#### Scenario: Audit pinned actions

- **WHEN** a reviewer greps `uses:` lines under `.github/workflows/`
- **THEN** every action reference SHALL match one of the entries in the approved list above (or an explicit successor agreed in a follow-up change)
