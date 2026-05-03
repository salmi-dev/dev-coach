## Why

Code-quality signals are drifting:

- `deno lint` reports **16 errors** (12 `no-unused-vars`, 4 `require-await`) across 11 source files and 1 test file. CI has nothing enforcing zero-lint, so each
  new change accretes warnings.
- Several exported symbols (notably in skills, the new `cli/library.ts`, and helpers in `db/`, `pi/`, `storage/save-prompt.ts`) lack JSDoc despite the project
  rule introduced in the previous change.
- `deno test --coverage` shows **75% branch / 76% function / 60% line coverage** for `src/` — below the 80% line-coverage target the team wants. Worst
  offenders: `skills/stats.ts` (14% lines), `cli/router.ts` (29%), `skills/explain.ts` (31%), `cli/library.ts` (37%), `utils/picker.ts` (3%).

We want a single change that (a) fixes every existing lint error, (b) audits and fills missing JSDoc on exported symbols, (c) raises line coverage to ≥80%
overall, and (d) wires `deno fmt --check`, `deno lint`, and a coverage threshold check into a single `deno task verify` so future changes are gated.

## What Changes

- Resolve all 16 existing lint errors:
  - Remove or `_`-prefix unused vars/imports/params.
  - Drop superfluous `async` from skill `run()` methods that don't `await`, OR add a meaningful `await` (case-by-case).
- Audit every `export` in `src/**/*.ts` and add JSDoc where missing, following the project rule (one-line summary + `@param`/`@returns` for non-trivial
  signatures + `@example` for public APIs).
- Add tests to bring overall **line coverage ≥ 80%**:
  - `utils/picker.ts` — exercise the numeric fallback path with stubbed stdin.
  - `cli/library.ts` — cover `show`, `search`, and `edit` happy paths via temp library.
  - `cli/router.ts` — cover `tldr`/`snippet`/`install-aliases`/`uninstall-aliases` routing.
  - `skills/stats.ts`, `skills/explain.ts`, `skills/compare.ts`, `skills/review.ts`, `skills/init.ts` — focused unit tests for pure helpers and prompt builders.
- Add `deno task verify` that runs `deno fmt --check && deno lint && deno test --coverage=cov_profile && deno coverage cov_profile --include=src/` and **fails
  when overall line coverage < 80%** (threshold script).
- Document `deno task verify` in README and reference it in OpenSpec rules so future change `tasks.md` files include a verify step.

## Capabilities

### New Capabilities

- `quality-gate`: a single `deno task verify` command that gates fmt + lint + test + coverage, plus a tiny script enforcing the 80% line-coverage threshold.

### Modified Capabilities

_None._ This change touches code hygiene and tests across many existing modules but does not modify their public requirements; no existing spec's behaviour
changes.

## Impact

- Code: small edits across ~12 files in `src/skills/`, `src/cli/`, `src/utils/`, `src/storage/`, plus `tests/init_test.ts`.
- New: `scripts/check-coverage.ts` (or inlined in deno task), new test files under `tests/` for picker/router/skills.
- Tooling: new `deno task verify` in `deno.json`.
- Docs: README "Development" section mentions `deno task verify`; `openspec/config.yaml` `tasks` rule references it.
- No public API changes. No DB migrations. No breaking changes.
