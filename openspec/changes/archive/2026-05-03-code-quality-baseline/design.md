## Context

The previous change (`library-subcommands`) introduced the project's first "code style" project context block in `openspec/config.yaml`: semicolons, single
quotes, 160-col width, and a JSDoc-on-exports rule. However nothing enforces these gates in CI/local — `deno fmt` is run by hand, `deno lint` is reporting 16
pre-existing errors that have been quietly tolerated, and there is no coverage threshold.

Baseline (measured before this change):

- `deno lint`: **16 errors** — `require-await` (4 in `skills/{ask,explain,review,sandbox,project}.ts` `run()` methods that don't `await`), `no-unused-vars` (12
  across skills + a couple in `tests/init_test.ts`).
- `deno fmt`: clean (already enforced after the previous change).
- `deno test --coverage`: 144 → 150 tests, **75.0% branch / 76.1% function / 59.9% line** for `src/`. Below the 80% line target.

We need one change that (a) clears the lint backlog, (b) audits JSDoc, (c) raises coverage above 80% lines, and (d) puts a single `deno task verify` gate in
front of all of these so future changes can't regress silently.

## Goals / Non-Goals

**Goals:**

- 0 lint errors after this change.
- Every exported symbol in `src/**/*.ts` carries JSDoc per the project rule.
- Overall **line coverage ≥ 80%** for `src/` (measured by `deno coverage`).
- A single `deno task verify` that fails on fmt diff, any lint error, any test failure, or coverage < 80%.
- Documented in README so contributors know the gate.

**Non-Goals:**

- No per-file coverage thresholds — only the overall line %.
- No mutation testing, type-coverage, or branch-coverage gating in v1 (line % is the simplest meaningful signal).
- No CI pipeline changes (e.g. GitHub Actions). Local `deno task verify` only; CI integration is a follow-up.
- No refactor of skill architecture even though several skill `run()` methods are flagged `require-await` — fix locally without redesign.
- No new doc-generation tooling (`deno doc`); JSDoc audit is manual + simple grep heuristic.

## Decisions

### 1. Fix `require-await` by removing `async`, not by adding fake `await`

Skills like `ask.run()` synchronously build a `SkillResult` and return it. Their interface (`Skill.run`) returns `Promise<SkillResult>`, so dropping `async`
requires returning `Promise.resolve(...)` or wrapping the return — but actually, since the method is declared on an interface that returns a Promise, the
simpler fix is to keep the signature returning `Promise<SkillResult>` while removing `async` and using `Promise.resolve(result)`. This makes the lint rule happy
without changing the contract.

**Alternative considered:** add a no-op `await Promise.resolve()` — rejected, hides the fact that the method is sync.

### 2. `no-unused-vars` cleanup is mechanical

- Imports: delete the import line entirely.
- Local vars in tests (`configPath`, `libraryDir` in `init_test.ts`): delete or use them in assertions.
- Function params required by an interface (e.g. `context` in `run(input, context)`): rename to `_context` per Deno's hint. Same for unused `e` in catch.
- `collector` in `sandbox.ts` is dead code — delete it.

### 3. JSDoc audit via grep, not tooling

`deno doc --json src/**/*.ts` would give a structured list, but it's noisy and includes private symbols. Simpler: grep for `^export` lines and visually verify
each has a `/** ... */` directly above. Track results in `tasks.md`. Acceptance: every `export` (function/class/const/type/interface/enum) has at least a
one-line summary; non-trivial functions have `@param`/`@returns`; "public" APIs (anything imported by `cli/`, `mod.ts`, or pi tools) get an `@example`.

### 4. Coverage threshold enforcement

Deno's `deno coverage` prints a summary table but does not natively support `--fail-under`. We add a small wrapper script `scripts/check-coverage.ts`:

```ts
// Runs `deno coverage <profile> --include=src/`, parses the "All files" summary line,
// extracts the line %, exits 1 if < 80.
```

The threshold (`80`) is hard-coded as a constant in the script for simplicity; can be lifted to env var later if needed.

### 5. `deno task verify` composition

```jsonc
"verify": "deno fmt --check && deno lint && rm -rf cov_profile && deno test --coverage=cov_profile --allow-read --allow-write --allow-env --allow-run --allow-ffi tests/ && deno run --allow-read --allow-run scripts/check-coverage.ts cov_profile"
```

Order matters: cheapest checks first (fmt → lint), then test+coverage. Failures short-circuit via `&&`.

### 6. Coverage gap closure strategy

Worst-coverage modules and the planned approach for each:

- `utils/picker.ts` (3% lines) — pure-logic test for `pickNumeric` by stubbing `Deno.stdin.readSync`/`writeSync`. Skip the `fzf` branch (covered by `hasFzf`
  mock returning false).
- `cli/router.ts` (29%) — extend existing subprocess-style tests to invoke `coach tldr list`, `coach snippet list`, `coach install-aliases` (with `HOME=temp`,
  `SHELL=zsh`), `coach uninstall-aliases`, and an unknown command.
- `cli/library.ts` (37%) — add tests for `show` (capture stdout via Deno.Command spawning `deno run cli.ts tldr show <slug>`), `search` (after seeding DB), and
  `edit` happy path (set `EDITOR=true` so the spawned editor exits 0 immediately).
- `skills/stats.ts` (14%) — extract pure formatting helpers (`formatStreakLine`, `formatLanguageBreakdown`) and unit-test those.
- `skills/explain.ts` / `compare.ts` / `review.ts` — extract their prompt-building functions to pure helpers and test the strings they produce; the LLM-call
  path stays untested (it's just a delegation).
- `skills/init.ts` (47%) — already added `shouldInstallAliases` tests; add tests for `parseLangSelection` which is also pure.

Target: bumping each red module above 60% lines while keeping the green ones stable should bring the overall ≥ 80%. We measure after each batch.

### 7. JSDoc rule reinforcement in OpenSpec config

Update `openspec/config.yaml` `rules.tasks` to include: "Always include a `deno task verify` task before archive." This way every future change inherits the
gate without having to re-derive it.

## Risks / Trade-offs

- **`require-await` fix changes the runtime shape of skill methods slightly** (removing `async` keyword) → mitigated by keeping the same return type
  `Promise<SkillResult>` and using `Promise.resolve`. Existing callers `await skill.run(...)` continue to work.
- **Subprocess-spawning tests are slower** (each spawns `deno run`) → trade-off: real end-to-end coverage of CLI routing is more valuable than micro-second
  speed; tests already use this pattern in `cli_test.ts`.
- **Hard-coded 80% threshold** → easy to adjust later; we accept simplicity over flexibility.
- **JSDoc audit is manual** → risk of inconsistency. Mitigated by tracking each module as a checkbox in `tasks.md`.
- **Coverage of editor-spawning code path in `cli/library.ts edit`** → tests use `EDITOR=true` (the unix `true` binary exits 0). On Windows this won't work;
  we'll guard the test with `if (Deno.build.os !== 'windows')`.

## Migration Plan

No migrations. Everything is additive (new task, new script, new tests) plus internal cleanup that doesn't change any public contract.

## Open Questions

- Should `deno task verify` be aliased as the default `test` task? **Decision:** No — keep `test` as just `deno test ...` for fast iteration; `verify` is the
  pre-commit/pre-archive gate.
- Per-file coverage minimums? **Decision:** Not in v1; revisit if a single bad file drags the average.
