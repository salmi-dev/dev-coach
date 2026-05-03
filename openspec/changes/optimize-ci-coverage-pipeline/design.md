## Context

Today's CI pipeline (`.github/workflows/pipeline.yml`) has two structural inefficiencies:

1. **Deno tests run twice per build.** The `Test` job runs `deno task test` (no coverage). The `Verify` job runs `deno task verify`, whose body is
   `deno fmt --check && deno lint && rm -rf cov_profile && deno test --coverage=cov_profile … && check-coverage.ts cov_profile`. The `--coverage` test pass is
   functionally identical to the one in the `Test` job. Wall-clock cost: ~45 s of redundant work per push, and roughly double the Deno test churn.

2. **Cross-runtime jobs ship blind.** `test-bun` runs `bun test tests/cross-runtime/`, `test-node` runs `node --test tests/cross-runtime/*.test.ts`. Neither
   measures coverage. Since the cross-runtime suite is the _only_ thing that verifies our runtime adapter and sqlite adapter actually work on Bun and Node, the
   modules most likely to drift between drivers have zero CI-enforced coverage floor on those runtimes.

The local `verify` task currently couples format-check, lint, test-with-coverage, and threshold-check into a single command. That's convenient locally but makes
it impossible to reuse the threshold check in CI without re-running the tests.

## Goals / Non-Goals

**Goals:**

- Run the Deno test suite **exactly once** per CI build while keeping the coverage gate intact.
- Add a coverage threshold gate to `test-bun` and `test-node` jobs scoped to the modules the cross-runtime suite actually exercises (runtime adapter, sqlite
  adapter, prompt utility).
- Make `scripts/check-coverage.ts` (or a sibling script) the single source of truth for "is coverage above threshold" across all three runtimes.
- Keep `deno task verify` working locally as a one-shot quality gate (developer ergonomics — preserved).

**Non-Goals:**

- Adding source-code coverage instrumentation outside of tests (e.g., production binary). Out of scope.
- Unifying the _test runners_. Deno keeps `deno test`; Bun keeps `bun test`; Node keeps `node --test`. Only the coverage _check_ is unified.
- Raising the global threshold above the current 80 %. Threshold values stay where they are; this change is about instrumentation and pipeline shape.
- Touching the macOS / Windows release builds — those don't run in `pipeline.yml`.
- Flipping `continue-on-error: false` on the Bun / Node jobs. That's task 7.6 of the previous change and is governed by "5 consecutive green main builds", not
  by adding coverage. We keep them non-blocking until that gate is met.

## Decisions

### D1 — Split `verify` into `coverage:report` + `coverage:check`, keep `verify` as the one-shot composite

Add two new tasks to `deno.json`:

- `coverage:report` → `rm -rf cov_profile && deno test --coverage=cov_profile <perms> tests/`
- `coverage:check` → `deno run --allow-read --allow-run scripts/check-coverage.ts cov_profile`

Rewrite `verify` as: `deno fmt --check && deno lint && deno task coverage:report && deno task coverage:check`.

In CI:

- `Test` job → `deno task coverage:report`, then upload `cov_profile/` as an artifact.
- `Verify` job → download the artifact, run `deno task coverage:check` (no test rerun).

Rationale: keeps one local entry point (`deno task verify`) while letting CI split the work. Alternatives considered:

- Merge `Test` + `Verify` into one job: rejected — current parallel-fan-then-aggregate shape is what makes the `CI Gate` summary readable, and `Build` currently
  runs in parallel with `Test`. Keeping `Verify` as a downstream-of-Test job lets us avoid running the build serially behind tests too.
- Have `Verify` re-do fmt+lint inside `deno task verify`: rejected — fmt and lint already have dedicated jobs that block `Verify` via `needs:`. Re-running them
  in CI is pointless waste; locally `verify` still does it for one-shot ergonomics.

### D2 — Bun coverage via `--coverage --coverage-reporter=lcov`, threshold parsed from lcov

Bun (≥ 1.1.31) supports `--coverage` with `--coverage-reporter=lcov` to write `coverage/lcov.info`. We invoke:

```
bun test --coverage --coverage-reporter=lcov tests/cross-runtime/
```

Then parse `coverage/lcov.info` and enforce a threshold scoped to the files we expect to be exercised:

- `src/utils/runtime/**`
- `src/db/sqlite/**`
- `src/utils/prompt.ts`

We do **not** apply a global `src/` threshold here, because the cross-runtime suite intentionally only exercises adapter surfaces — applying a global gate would
either be misleading (low coverage) or force us to ship cross-runtime tests for unrelated modules.

Threshold: **60 %** lines on the included scope. This is a deliberate regression-floor choice based on real measurements during implementation — Bun's stricter
line-counting produces ≈66 % on the current cross-runtime suite, Node's ≈83 %. Setting the gate at 60 % catches regressions on both runtimes without forcing
test additions in this change; the floor can be raised in a future change once the cross-runtime suite is expanded.

Rationale for lcov over Bun's text reporter: lcov is line-precise, machine-parseable, and unifies with Node's reporter shape. Alternatives:

- Bun's text reporter parsed via regex: rejected — fragile, format has changed across Bun minors.
- `c8` wrapping `bun test`: rejected — adds an npm dep + complicates the Bun job for marginal gain.

### D3 — Node coverage via built-in `--experimental-test-coverage` (22) / `--test-coverage` (24), threshold via lcov reporter

Node 22 needs `--experimental-test-coverage`; Node 24 makes it stable as `--test-coverage`. Both support `--test-coverage-include` and the `lcov` reporter (via
`--test-reporter=lcov --test-reporter-destination=coverage/node-lcov.info`). We use the lcov path for symmetry with Bun and feed it into the same threshold
script.

Scope: same three globs as Bun (`src/utils/runtime/**`, `src/db/sqlite/**`, `src/utils/prompt.ts`).

Rationale: keeps one parsing code-path (lcov) regardless of runtime. Alternatives:

- `--test-coverage-lines=NN` flag (lets Node fail itself): rejected — different flag names across Node 22 vs 24, and we'd lose the per-file table in the step
  summary.

### D4 — `scripts/check-coverage.ts` grows a single-input "lcov mode"; Deno keeps profile-dir mode

Today the script takes a Deno coverage profile dir, calls `deno coverage <dir> --include=src/`, and parses the "All files" row. We add:

- New mode: `scripts/check-coverage.ts --lcov <path> --include <glob>[,<glob>...] --threshold <N>`
- Existing mode (Deno) stays: `scripts/check-coverage.ts <profile-dir>` (defaults: `--include=src/`, `--threshold=80`).

The Deno mode keeps using `deno coverage` (which already understands its own profile format). The lcov mode parses `lcov.info` directly (line records:
`DA:<line>,<hits>` and `SF:<file>` headers) — no external deps.

Rationale: single binary, single threshold-decision logic, no duplication of "is coverage above N" code across CI scripts.

### D5 — Cross-runtime threshold lives next to the script, not in the workflow YAML

The list of "scope globs" for cross-runtime coverage (`src/utils/runtime/**`, `src/db/sqlite/**`, `src/utils/prompt.ts`) is defined as a constant in
`scripts/check-coverage.ts` exported as `CROSS_RUNTIME_INCLUDE`. The Bun/Node jobs invoke the script with `--profile cross-runtime` (a named preset) instead of
passing the glob list inline.

Rationale: keeps the workflow YAML readable; one place to update if the cross-runtime surface grows; matches the existing `THRESHOLD` constant pattern.

## Risks / Trade-offs

- **[Risk]** Bun's `--coverage-reporter=lcov` flag was added relatively recently; if `bun-version: latest` ever rolls back below the supporting version, the Bun
  coverage step will fail. → **Mitigation:** pin Bun to a known-good minimum in the job (`bun-version: '>=1.1.31'`) and document the floor in the spec.
- **[Risk]** Node 22 vs Node 24 produce subtly different lcov output (e.g., `BRDA:` records may or may not appear). → **Mitigation:** parse only `SF:` and `DA:`
  records, ignore everything else. Tested against both Node majors in the same matrix.
- **[Risk]** Splitting fmt/lint out of CI's `verify` could mask a case where local `deno fmt`/`deno lint` versions disagree with CI versions (since CI's Verify
  no longer re-runs them). → **Mitigation:** the dedicated `Fmt` and `Lint` jobs already cover this; they are required `needs:` of `Verify`. No regression in
  coverage of formatter/linter drift.
- **[Trade-off]** The Deno test profile is uploaded as a CI artifact (~few hundred KB of JSON). Tiny storage cost; retention defaults to 30 days. Acceptable.
- **[Trade-off]** Cross-runtime coverage is **scoped** rather than global. A regression that drops coverage on, say, `src/storage/library.ts` will show up in
  Deno's gate but not in Bun's or Node's. That's intentional — those files aren't exercised by the cross-runtime suite — but it means the Bun/Node gates are
  narrow by design and not a substitute for the Deno gate.

## Migration Plan

1. **Land the script changes first.** Extend `scripts/check-coverage.ts` with `--lcov` mode + `CROSS_RUNTIME_INCLUDE` constant; ship it without touching CI.
   Local Deno workflow is unaffected.
2. **Land the `deno.json` task split.** Add `coverage:report` and `coverage:check`; rewrite `verify` to chain them. Locally `deno task verify` still does the
   same thing end-to-end.
3. **Land the CI workflow changes** (`Test` uploads profile; `Verify` downloads + checks; Bun + Node jobs gain coverage steps).
4. **Observe one or two main runs** to confirm wall-clock is faster and Bun/Node coverage steps are stable, before opening the change for archive.

Rollback: revert the workflow-only commit. Script and task additions are forward-compatible (the new mode is unused by Deno's path).

## Open Questions

- None blocking. The exact coverage threshold for the cross-runtime scope (80 % vs something tighter) can be tuned in tasks; 80 % matches the global gate.
