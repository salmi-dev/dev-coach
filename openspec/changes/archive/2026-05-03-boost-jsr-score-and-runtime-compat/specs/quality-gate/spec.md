## ADDED Requirements

### Requirement: CI verifies multi-runtime compatibility

The CI workflow (`.github/workflows/pipeline.yml`) SHALL include two additional jobs, `test-bun` and `test-node`, that run a curated subset of `tests/**`
exercising the library surface on Bun and Node respectively. Both jobs SHALL depend on `fmt` and `lint`, and SHALL feed into `ci-gate` so failures block merges
to `main`.

The `test-node` job SHALL run on a matrix of supported Node versions (at minimum Node 22 and Node 24).

The Deno-binary integration tests (CLI subprocess tests under `tests/`) SHALL remain Deno-only and run in the existing `test` job.

#### Scenario: Push to main runs Bun and Node tests

- **WHEN** a commit is pushed to `main`
- **THEN** GitHub Actions SHALL run `fmt`, `lint`, `build`, `test`, `test-bun`, `test-node`, `verify`, and `ci-gate`
- **AND** `test-bun` SHALL execute the cross-runtime test subset under Bun
- **AND** `test-node` SHALL execute the same subset under Node 22 and Node 24

#### Scenario: Cross-runtime test failure blocks the gate

- **WHEN** the `test-bun` job fails
- **THEN** the `ci-gate` job SHALL exit non-zero
- **AND** the failure SHALL appear in the per-job result table emitted to `$GITHUB_STEP_SUMMARY`

### Requirement: Runtime-compat claims are verified, not just self-declared

The runtimes listed under `publish.runtimeCompat` (or equivalent JSR field) in `deno.json` SHALL be exactly the runtimes proven by passing CI jobs at the time
of publish. Adding a runtime to the claim without a corresponding CI job SHALL be treated as a spec violation.

#### Scenario: Adding a new runtime claim requires CI evidence

- **WHEN** a maintainer adds a runtime key (e.g. `"workerd": true`) to `runtimeCompat`
- **THEN** there SHALL exist a CI job that runs the cross-runtime test subset under that runtime
- **AND** the change SHALL update this spec to list the new job
