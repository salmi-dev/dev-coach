## Why

The CI pipeline runs the Deno test suite **twice** on every push (once in the `Test` job, once inside `verify` for coverage), wasting ~45 s of CI time per
build. At the same time, the cross-runtime jobs (`test-bun`, `test-node`) run with no coverage instrumentation at all, so we have zero coverage signal for the
runtime adapter and SQLite adapter on Bun and Node — the very files most likely to drift between drivers. We can fix both gaps in one pass.

## What Changes

- Split the single `verify` task into two layers: a `coverage:report` task (runs Deno tests with `--coverage`) and a `coverage:check` task (consumes a profile
  and enforces the threshold). The aggregate `verify` task still chains both for local use.
- In CI, run Deno tests **once** with coverage in the existing `Test` job, upload the profile as an artifact, and have the `Verify` job download + check it
  instead of re-running tests.
- Add coverage instrumentation to the Bun cross-runtime job using `bun test --coverage --coverage-reporter=lcov` and enforce a per-capability threshold on the
  files actually exercised by the cross-runtime suite (runtime adapter + sqlite adapter).
- Add coverage instrumentation to the Node cross-runtime jobs using `--experimental-test-coverage` (Node 22) / `--test-coverage` (Node 24) and enforce the same
  per-capability threshold via `--test-coverage-lines`.
- Generalise `scripts/check-coverage.ts` to handle three input shapes: a Deno coverage profile dir, a Bun lcov file, and a Node test-coverage summary — a single
  threshold gate that any runtime can call.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `quality-gate`: the verify pipeline no longer runs Deno tests twice; the cross-runtime jobs gain coverage thresholds; the threshold script accepts inputs from
  all three runtimes.

## Impact

- `.github/workflows/pipeline.yml` — restructured `test` / `test-bun` / `test-node` / `verify` jobs; new artifact upload/download wiring.
- `deno.json` — replace `verify` task body; add `coverage:report` and `coverage:check` tasks.
- `scripts/check-coverage.ts` — extended to read Bun lcov + Node coverage summary in addition to Deno profile dirs.
- No changes to source code or runtime behaviour — CI/build only.
- Wall-clock CI time on green main runs: ~45 s faster per build (one fewer Deno test pass).
- Coverage signal: gains Bun + Node × {runtime adapter, sqlite adapter} where there was none.
