## 1. Coverage script — extend with lcov mode

- [x] 1.1 Add a `CROSS_RUNTIME_INCLUDE` exported constant to `scripts/check-coverage.ts` listing the three globs (`src/utils/runtime/**`, `src/db/sqlite/**`,
      `src/utils/prompt.ts`).
- [x] 1.2 Add CLI flag parsing: positional `<profile-dir>` → existing Deno mode; `--lcov <path> [--include <globs>] [--profile <preset>] [--threshold <N>]` →
      new lcov mode.
- [x] 1.3 Implement an lcov parser that consumes a `lcov.info` file (only `SF:` and `DA:` records), accumulates `(linesFound, linesHit)` across files matching
      the include set, and returns the aggregate line-%.
- [x] 1.4 Add a `cross-runtime` preset that resolves to `CROSS_RUNTIME_INCLUDE`. Reject unknown preset names with a helpful error.
- [x] 1.5 Reuse the existing pass/fail print formatting (✅ / ❌ + percentage + threshold) for both modes; keep ANSI handling via `stripAnsi` import.
- [x] 1.6 Add unit tests under `tests/check_coverage_test.ts` covering: lcov parser happy-path, empty/malformed lcov, preset resolution, include-glob filtering,
      threshold pass and fail.
- [x] 1.7 `deno task verify` (locally) still passes after these additions.

## 2. Deno tasks — split verify into report + check

- [x] 2.1 In `deno.json`, add task `coverage:report` =
      `rm -rf cov_profile && deno test --coverage=cov_profile --allow-read --allow-write --allow-env --allow-run --allow-ffi --allow-net tests/`.
- [x] 2.2 In `deno.json`, add task `coverage:check` = `deno run --allow-read --allow-run scripts/check-coverage.ts cov_profile`.
- [x] 2.3 Rewrite `verify` task to: `deno fmt --check && deno lint && deno task coverage:report && deno task coverage:check`.
- [x] 2.4 Confirm `deno task test`, `deno task coverage:report`, `deno task coverage:check`, and `deno task verify` all behave as expected on a clean tree.
- [x] 2.5 Update README's "Quality gate" / Development section to mention the two new tasks alongside `verify`.

## 3. CI workflow — Deno test/verify split

- [x] 3.1 In `.github/workflows/pipeline.yml`, change the `test` job to run `deno task coverage:report` instead of `deno task test`.
- [x] 3.2 Add an `actions/upload-artifact@v7` step at the end of `test` uploading `cov_profile/` as artifact `deno-cov-profile` (retention: 1 day).
- [x] 3.3 Change the `verify` job: drop the `deno task verify` invocation; instead `actions/download-artifact@v8` `deno-cov-profile` into `cov_profile/`, then
      run `deno task coverage:check`.
- [x] 3.4 Update the `verify` job's step-summary block to reflect that it consumes a pre-built profile (no fmt/lint/test rerun).
- [x] 3.5 Sanity-check `needs:` graph: `verify` still depends on `build` and `test`; `test` still depends on `fmt` and `lint`.

## 4. CI workflow — Bun coverage

- [x] 4.1 In the `test-bun` job, replace the run step with `bun test --coverage --coverage-reporter=lcov tests/cross-runtime/` so Bun writes
      `coverage/lcov.info`.
- [x] 4.2 Add a follow-up step: install Deno (`denoland/setup-deno@v2`), then run
      `deno run --allow-read --allow-run scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime --threshold 60`.
- [x] 4.3 If Bun's lcov output path differs, surface it in the step summary; capture `bun --version` and the lcov path in the summary block.
- [x] 4.4 Confirm Bun version on `oven-sh/setup-bun@v2` `latest` supports `--coverage-reporter=lcov`; if not, pin a known-good minimum version.

## 5. CI workflow — Node coverage

- [x] 5.1 In the `test-node` matrix, add coverage flags: Node 22 → `--experimental-test-coverage`, Node 24 → `--test-coverage` (matrix `coverage-flag` field).
      Keep the existing `--experimental-strip-types` for Node 22.
- [x] 5.2 Configure Node's lcov reporter via `--test-reporter=lcov --test-reporter-destination=coverage/node-lcov.info` (in addition to the default reporter for
      human output).
- [x] 5.3 Add a follow-up step that runs the same `scripts/check-coverage.ts --lcov coverage/node-lcov.info --profile cross-runtime --threshold 60` (using
      `denoland/setup-deno@v2` since the script is Deno-run).
- [x] 5.4 Verify both Node 22 (better-sqlite3 fallback) and Node 24 (built-in node:sqlite) hit the threshold; adjust the cross-runtime test surface if not.
- [x] 5.5 Update each Node summary block to include coverage % and lcov path.

## 6. Workflow housekeeping

- [x] 6.1 Update the `ci-gate` summary table to include a "Coverage gate (Deno / Bun / Node)" line so the aggregator reflects the new check structure.
- [x] 6.2 Confirm the workflow still respects the existing `continue-on-error: true` on `test-bun` / `test-node` (coverage failures within those jobs surface as
      job failures but remain non-blocking until task 7.6 of the previous change flips them).
- [x] 6.3 Grep `.github/workflows/` to confirm no action versions changed (still on the approved pinned set).

## 7. Validation and rollout

- [x] 7.1 Locally: run `deno task verify` end-to-end — confirm green and faster (no double test pass on the local machine since `verify` now chains
      report→check).
- [x] 7.2 Locally: run `bun test --coverage --coverage-reporter=lcov tests/cross-runtime/` followed by
      `deno run --allow-read --allow-run scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime --threshold 60` — confirm pass.
- [x] 7.3 Locally: run the equivalent Node 24 invocation — confirm pass.
- [x] 7.4 Open the PR; confirm CI runs Deno tests exactly once (grep the workflow logs).
- [x] 7.5 Capture before/after wall-clock from a recent green main run vs. this PR's run; record in the PR description.
- [x] 7.6 `deno task verify` passes on the final commit before review.
