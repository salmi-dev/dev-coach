## Why

The cross-runtime coverage gate currently sits at a 60% **regression floor** because Bun's stricter line counter measured at ~66.7% on the curated
`cross-runtime` preset (Node sat at ~83.2%, Deno at ~84.7% on `src/`). That threshold was a deliberate, data-informed compromise to ship the gate without
forcing an ad-hoc test sprint inside the previous change. Now that the gate is in place and blocking, we want a **uniform 80% line-coverage bar** across all
three runtimes so the project ships a single, easy-to-explain quality promise rather than two thresholds.

In parallel, contributors currently have no straightforward way to reproduce the Bun and Node CI jobs locally — the exact `bun test` / `node --test`
invocations, lcov paths, and `--profile cross-runtime` arguments live only inside `.github/workflows/pipeline.yml`. Adding small driver scripts under `scripts/`
will let developers run the same gates locally before pushing.

## What Changes

- Raise the cross-runtime line-coverage gate from **60% → 80%** by removing the `--threshold 60` overrides from `.github/workflows/pipeline.yml` (and the local
  scripts) so both fall back to the script's existing `THRESHOLD = 80` default — i.e. tighten the gate by deleting an override, not by editing the constant.
- Add tests targeted at modules in the `cross-runtime` preset (`src/utils/runtime/**`, `src/db/sqlite/**`, `src/utils/prompt.ts`) so Bun's measured line
  coverage on that scope reaches ≥ 80%. The Deno gate (≥ 80% on `src/`) and the Node gate (already ≥ 80% in measurement) already clear the new bar; the work
  concentrates on the Bun side, with any incidental tests counted under all three runtimes.
- Add `scripts/test-bun.sh` — runs the cross-runtime suite under Bun with lcov coverage and invokes
  `scripts/check-coverage.ts --lcov coverage/lcov.info --profile cross-runtime`. Mirrors the Bun CI job byte-for-byte.
- Add `scripts/test-node.sh` — same idea for Node; runs the cross-runtime suite with the built-in test-coverage reporter (lcov), then runs the same coverage
  check. Defaults to the active `node` on `PATH` and accepts an optional argument to force a version.
- Update `deno.json` with new tasks `test:bun` and `test:node` that simply shell out to the scripts, so the local entry points are discoverable via `deno task`.
- Update `README.md` "Quality gate" section to reflect the unified 80% threshold and the new local scripts.

## Capabilities

### New Capabilities

(none — all work fits under the existing `quality-gate` capability)

### Modified Capabilities

- `quality-gate`: tighten the cross-runtime coverage threshold from 60% to 80% and add a "local cross-runtime scripts" requirement so the Bun and Node CI jobs
  are reproducible locally.

## Impact

- **Code**: new tests under `tests/cross-runtime/` (and any narrow targeted unit tests under `tests/`) to lift Bun coverage on the preset to ≥ 80%; new files
  `scripts/test-bun.sh`, `scripts/test-node.sh`. No changes to `scripts/check-coverage.ts` (constant already `80`).
- **Workflow**: `.github/workflows/pipeline.yml` — Bun and Node jobs drop the `--threshold 60` override (falling back to the script's `THRESHOLD = 80`); summary
  copy and the CI Gate banner text updated to read `≥ 0.80` everywhere.
- **Tasks**: `deno.json` gains `test:bun` and `test:node`.
- **Docs**: `README.md` "Quality gate" section.
- **Spec**: delta against `quality-gate`.
- **Risk**: if any hidden Bun-only branch in the SQLite or runtime adapters cannot be reasonably exercised, the threshold lift may force a small refactor
  (extract / inline a fallback) — acceptable, called out in design.
