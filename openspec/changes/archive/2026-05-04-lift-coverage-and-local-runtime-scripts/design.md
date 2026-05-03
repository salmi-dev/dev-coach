## Context

The previous change (`optimize-ci-coverage-pipeline`, archived as `2026-05-03-optimize-ci-coverage-pipeline`) introduced cross-runtime coverage gates on Bun and
Node and pinned the `THRESHOLD` constant in `scripts/check-coverage.ts` at **0.60** for the lcov-mode default. This was a regression floor, deliberately lower
than the measured baselines:

| Runtime | Scope                  | Measured baseline | Current threshold |
| ------- | ---------------------- | ----------------- | ----------------- |
| Deno    | `src/`                 | ~84.7%            | ≥ 0.80            |
| Node    | `cross-runtime` preset | ~83.2%            | ≥ 0.60            |
| Bun     | `cross-runtime` preset | ~66.7%            | ≥ 0.60            |

The `cross-runtime` preset (defined as `CROSS_RUNTIME_INCLUDE` in `scripts/check-coverage.ts`) covers `src/utils/runtime/**`, `src/db/sqlite/**`, and
`src/utils/prompt.ts`. The Deno and Node baselines already exceed 80%; the only runtime that needs work to clear a uniform 80% bar is **Bun**, and the gap is
`~80 − 66.7 ≈ 13.3` percentage points.

In addition, contributors today cannot reproduce the Bun and Node CI jobs locally. The `bun test --coverage --coverage-reporter=lcov` flags, the
`node --test --experimental-test-coverage --test-reporter=lcov` flags, the lcov output paths, and the
`scripts/check-coverage.ts --lcov ... --profile cross-runtime` invocations are all baked into `.github/workflows/pipeline.yml`. The first time most contributors
will see a Bun coverage failure is when CI rejects their PR.

## Goals / Non-Goals

**Goals:**

- Unify the line-coverage threshold at **0.80** across all three runtimes (Deno on `src/`, Bun on `cross-runtime` preset, Node on `cross-runtime` preset).
- Reach the new Bun threshold by adding tests, not by narrowing the preset's include list.
- Provide `scripts/test-bun.sh` and `scripts/test-node.sh` so a developer can run the exact same gates the Bun and Node CI jobs run, locally, with a single
  command.
- Surface those local entry points via `deno task test:bun` / `deno task test:node` for discoverability.

**Non-Goals:**

- Changing the Deno gate from "files under `src/`" to a different scope.
- Changing the `cross-runtime` preset's include list (still `src/utils/runtime/**`, `src/db/sqlite/**`, `src/utils/prompt.ts`).
- Extending the cross-runtime suite to new modules (e.g. `src/storage/**`). Out of scope; would be a separate proposal that also extends
  `CROSS_RUNTIME_INCLUDE`.
- Introducing branch coverage or function coverage gates. We continue to enforce **line coverage only**; branch/function numbers remain reported in CI summaries
  but unenforced.
- Changing CI runner images, action versions, or the artifact upload/download flow.

## Decisions

### Decision 1: Tighten the cross-runtime gate by removing the workflow override, not by editing the constant

**Choice**: `scripts/check-coverage.ts` already defines `export const THRESHOLD = 80;` and uses it as both the percent-mode gate and the default for
`--threshold` in lcov mode. The workflow currently overrides this for cross-runtime jobs with `--threshold 60`. To unify at 80% across all runtimes we **delete
the `--threshold 60` override** from the Bun and Node steps in `.github/workflows/pipeline.yml`. The local scripts (Decision 3) similarly omit `--threshold`,
inheriting the same default.

**Why**: one source of truth. The constant lives in code (with unit-test coverage in `tests/check_coverage_test.ts`) and is already the default; CI now matches
it instead of overriding it. If the threshold ever needs to move again, that's a one-line edit to the constant plus its test.

**Alternatives considered**:

- _Pass `--threshold 80` explicitly from the workflow_ — redundant once the default agrees with the desired value; we'd be passing the default. Rejected for
  verbosity.
- _Two separate constants (`DENO_THRESHOLD` and `CROSS_RUNTIME_THRESHOLD`)_ — rejected. With both at 80 the duplication has no value; if they diverge in the
  future, that's the moment to introduce the split.
- _Per-preset thresholds embedded in the preset map_ — overkill for a project with one preset.

### Decision 2: Concentrate test additions on Bun's missed lines, not on broadening the preset

**Choice**: Identify the lines uncovered on Bun by running `bun test --coverage --coverage-reporter=lcov` locally, mapping the uncovered DA records back to
source, and adding small, targeted tests under `tests/cross-runtime/` (or `tests/`) that hit those specific code paths in a runtime-agnostic way. Where a code
path genuinely cannot run under Bun (e.g. a `Deno.*`-only branch), guard the test with a runtime check using the existing `detectRuntime()` helper, or refactor
the source to make the branch testable.

**Why**: The 13-point gap is small enough that a handful of well-aimed tests should close it. Broadening `CROSS_RUNTIME_INCLUDE` would dilute the meaning of the
preset (it's "library surface that ships across runtimes") and is explicitly out of scope.

**Alternatives considered**:

- _Lift Deno's gate to 90% and leave cross-runtime at 60%_ — moves the bar in the wrong direction; the user explicitly asked for 80% across the board.
- _Drop `src/db/sqlite/**` from the preset_ — shrinks the gate's meaning. The SQLite adapter is the most runtime-fragile module in the codebase; it must stay
  covered cross-runtime.
- _Add `bun:test` mocks for the Deno-only branches_ — possible but adds a Bun-specific dependency surface to tests; we prefer source refactors that make
  branches reachable on all runtimes.

### Decision 3: Shell scripts under `scripts/`, idempotent, no Deno wrapper

**Choice**: Add plain `bash` scripts at `scripts/test-bun.sh` and `scripts/test-node.sh`. Each script:

1. `set -euo pipefail`.
2. Removes any prior `coverage/` directory so the lcov file is fresh.
3. Runs the runtime's test command with coverage enabled, writing lcov to `coverage/lcov.info`.
4. Invokes `deno run -A scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime` (no explicit `--threshold` — picks up the new 0.80
   default).
5. Exits with the script's own exit code.

The scripts are wrapped by `deno task test:bun` and `deno task test:node` for discoverability, but the canonical entry point is the shell script — that's what
CI will call too, so the local and CI paths converge on a single recipe.

**Why bash, not Deno**: the work is purely process orchestration with environment differences (`bun` vs `node` on `PATH`, lcov path conventions,
`--experimental-test-coverage`). A bash script with `set -euo pipefail` is the simplest faithful encoding of the CI step. A Deno script would have to shell out
anyway and would add an indirection layer.

**Why call from CI too**: today the workflow YAML repeats the same commands. After this change, the CI step becomes `bash scripts/test-bun.sh` (and same for
Node), eliminating the drift risk between "what CI runs" and "what the script runs". The scripts must therefore stay portable (no macOS-only flags) and read
environment overrides for things like Node version (Node multi-version matrix is set up by `actions/setup-node` before the script runs, so the script just calls
`node`).

**Alternatives considered**:

- _Single `scripts/test-cross-runtime.sh` that branches on `$1`_ — rejected. Two short scripts read more clearly and let each runtime evolve independently (e.g.
  Bun gains `--coverage-include` someday).
- _`Makefile`_ — not idiomatic for this Deno-first repo.

### Decision 4: Local scripts must be silent on success but verbose on failure

**Choice**: Both scripts inherit stdout/stderr from the runtime test command (so failures show normally) but pass through `scripts/check-coverage.ts`'s output
unchanged. On success the final lines are `[check-coverage] lcov coverage/lcov.info ... 0.83 (≥ 0.80)` style, courtesy of the existing script. We do not add
per-script banners.

**Why**: keeping the local output identical to the CI step output makes debugging trivial — copy the failing line from a CI summary and reproduce locally.

## Risks / Trade-offs

- **Hidden Bun-specific gap can't be closed by tests alone** → if a code path is genuinely Deno-only inside an `_db_*` or `_node-compat` adapter, a refactor
  (move the branch out, or wrap it in a runtime-detected helper that can be stubbed) is the fix. We accept up to one such refactor in this change; a second one
  is a sign the preset should evolve and would be deferred.
- **Bun's line counter occasionally diverges from Deno's on identical sources** (this was the original reason the regression floor was set at 60%). Mitigation:
  when the post-test gap is < 1 percentage point, prefer adding one more test case rather than special-casing the threshold. If even after good-faith additions
  Bun stays at 79.x%, we'll take the data point back to the user before merging — explicitly listed as an open question below.
- **CI uses the script directly now** → a bug in the script breaks CI. Mitigation: the script does only argument-free orchestration (no parsing, no glob math);
  the heavy lifting stays in `scripts/check-coverage.ts`, which is unit-tested in `tests/check_coverage_test.ts`. Adding a smoke test for each script (running
  it under Deno via `Deno.Command` against a tiny fixture) is in scope.
- **`set -euo pipefail` is bash-specific** → that's intentional; CI runs Ubuntu and contributors are expected to have bash (macOS bundles 3.x but the syntax we
  use is 3-compatible). Documented in the script preamble.
- **Coverage tooling drift across Node minor versions** → Node 22 and Node 24 may differ in `--experimental-test-coverage` flag stability. The script accepts a
  passthrough env var (`NODE_TEST_FLAGS`) for emergency overrides; documented in a header comment.

## Migration Plan

1. Land the threshold bump and the new tests in the same PR so cross-runtime jobs stay green throughout.
2. Land the local scripts in the same PR, wired into both `deno.json` tasks and the workflow.
3. No data migration. No rollback step beyond `git revert` — this is purely test infra.

## Open Questions

- **Q**: If after good-faith test additions Bun coverage on the preset settles at 79.x%, do we (a) add a Bun-specific carve-out (e.g. `--threshold 0.79` on Bun
  only), (b) refactor source to close the gap, or (c) keep the threshold at 0.80 and lower it back to 0.78–0.79 as a new floor? **Default**: surface the data to
  the user and pause for a decision rather than silently choosing.
- **Q**: Should the Node script default to running both Node 22 and Node 24 sequentially (matching the CI matrix) when both are on `PATH` via a version manager
  (e.g. `fnm`, `volta`)? **Default**: no — local scripts use whatever `node` is active; CI matrix handles multi-version.
