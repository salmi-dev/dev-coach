## 1. Local cross-runtime scripts

- [x] 1.1 Create `scripts/test-bun.sh` (`#!/usr/bin/env bash`, `set -euo pipefail`): clean `coverage/`, run
      `bun test tests/cross-runtime --coverage --coverage-reporter=lcov --coverage-dir=coverage`, then run
      `deno run -A scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime`.
- [x] 1.2 Create `scripts/test-node.sh` (same shebang/`set -euo pipefail`): clean `coverage/`, run
      `node --test --experimental-test-coverage --test-reporter=lcov --test-reporter-destination=coverage/lcov.info tests/cross-runtime`, then the same
      `scripts/check-coverage.ts` invocation. Honor `$NODE_TEST_FLAGS` passthrough env var.
- [x] 1.3 `chmod +x` both scripts and verify `git diff --summary` shows mode 100755.
- [x] 1.4 Add `test:bun` and `test:node` tasks to `deno.json` that shell out to the scripts (e.g. `"test:bun": "bash scripts/test-bun.sh"`).
- [x] 1.5 Run `bash scripts/test-bun.sh` locally — confirm it currently fails at the coverage-check step (pre-test-additions baseline ~66.7%, threshold 80%).
      Capture the lcov gap for use in section 2.
- [x] 1.6 Run `bash scripts/test-node.sh` locally — confirm it currently passes (Node baseline ~83.2%, threshold 80%).

## 2. Lift Bun coverage on the cross-runtime preset to ≥ 80%

- [x] 2.1 From the lcov captured in 1.5, list every `DA:<line>,0` record under `src/utils/runtime/**`, `src/db/sqlite/**`, and `src/utils/prompt.ts`. Save the
      analysis as a comment in the next test file or a scratch note.
- [x] 2.2 Group uncovered lines by source file and by reason (e.g. "Deno-only branch", "error path", "unused export").
- [x] 2.3 For each `Deno-only branch` group: either (a) refactor the module so the branch is reachable cross-runtime, or (b) add a runtime-guarded test under
      `tests/cross-runtime/` using `detectRuntime()` to assert the not-Deno fallback.
- [x] 2.4 For each `error path` group: add `tests/cross-runtime/<feature>.test.ts` cases that trigger the error (bad input, missing file, malformed sqlite blob,
      …) and assert the thrown error or rejected promise.
- [x] 2.5 For each `unused export` group: either add a tiny smoke test that exercises the export, or move the export to a Deno-only module (with a
      `// @internal` note in the source if it's not part of the public surface).
- [x] 2.6 Re-run `bash scripts/test-bun.sh` after each batch of additions; iterate until the coverage-check step passes (≥ 80%). Note the final percentage.
- [x] 2.7 Re-run `bash scripts/test-node.sh` to confirm Node stays ≥ 80% after the Bun-driven additions (it should, but verify).
- [x] 2.8 Run `deno task verify` to confirm the Deno-on-`src/` gate is still ≥ 80% after any source refactors from 2.3/2.5.
- [x] 2.9 If after good-faith additions Bun is stuck at 79.x%, **stop** and surface the data to the maintainer per the open question in `design.md` (do **not**
      silently lower the threshold).

## 3. Wire CI to the new scripts and drop the threshold override

- [x] 3.1 In `.github/workflows/pipeline.yml`, replace the inline Bun test + coverage steps with a single step running `bash scripts/test-bun.sh`. Preserve the
      lcov upload artifact behaviour and the rich coverage summary (the script prints the same lines, just rewire the summary capture).
- [x] 3.2 Same for the Node matrix job: replace inline commands with `bash scripts/test-node.sh`. Verify the Node 22 / Node 24 matrix still runs both versions.
- [x] 3.3 Confirm neither workflow step passes `--threshold` to `scripts/check-coverage.ts`. The 80% gate must come from the script's `THRESHOLD` constant.
- [x] 3.4 Update the CI Gate banner text in `pipeline.yml` from `cross-runtime (≥0.60 ...)` to `cross-runtime (≥0.80 ...)` so the summary matches reality.
- [x] 3.5 Verify the workflow YAML parses (e.g. `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pipeline.yml'))"`).

## 4. Smoke tests for the scripts themselves

- [x] 4.1 Add a Deno test under `tests/scripts_test.ts` that runs `bash scripts/test-bun.sh` via `Deno.Command` only when `which bun` succeeds; otherwise
      `Deno.test.ignore`. Assert exit code 0.
- [x] 4.2 Add a similar Deno test for `scripts/test-node.sh` gated on `which node` (always present in CI).
- [x] 4.3 Keep the smoke tests outside `tests/cross-runtime/` so they don't run on Bun/Node themselves (avoid recursion).

## 5. Documentation

- [x] 5.1 Update `README.md` "Quality gate" section: replace any mention of the 60% cross-runtime floor with 80%; add a "Run locally" subsection showing
      `deno task test:bun` and `deno task test:node`.
- [x] 5.2 Update the JSDoc header of `scripts/check-coverage.ts` if it still references "60" anywhere.
- [x] 5.3 Add a one-line header comment to each new script describing its purpose and the env var it honors (Node only).

## 6. Verify

- [x] 6.1 `deno fmt` — no diff.
- [x] 6.2 `deno lint` — zero errors.
- [x] 6.3 `deno task verify` — passes (Deno gate still ≥ 80% on `src/`).
- [x] 6.4 `bash scripts/test-bun.sh` — passes (≥ 80%).
- [x] 6.5 `bash scripts/test-node.sh` — passes (≥ 80%).
- [x] 6.6 `openspec validate --changes` — `lift-coverage-and-local-runtime-scripts` passes.
- [ ] 6.7 Push branch, open PR, confirm all 9 CI checks green (Fmt, Lint, Build, Test, Test (Bun), Test (Node 22), Test (Node 24), Verify, CI Gate).
