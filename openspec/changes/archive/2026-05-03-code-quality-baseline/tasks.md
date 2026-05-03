## 1. Lint cleanup

- [x] 1.1 `tests/init_test.ts` — remove unused `configPath` and `libraryDir` locals (or use them in assertions)
- [x] 1.2 `src/skills/sandbox.ts` — drop unused `formatSummaryTable` import; delete dead `collector` local; fix `require-await` on `run()`
- [x] 1.3 `src/skills/interactive.ts` — drop unused `ItemType` import; check unused `e` in catch (rename to `_e`)
- [x] 1.4 `src/skills/ask.ts` — fix `require-await` on `run()` (remove `async`, return `Promise.resolve(result)`); rename unused `context` → `_context` if
      applicable
- [x] 1.5 `src/skills/explain.ts` — fix `require-await` on `run()`
- [x] 1.6 `src/skills/compare.ts` — fix `require-await` on `run()`; address unused vars at line 49
- [x] 1.7 `src/skills/review.ts` — address unused var at line 127
- [x] 1.8 `src/skills/project.ts` — drop unused `ProjectType` import; address unused at line 191; fix `require-await` if any
- [x] 1.9 `src/skills/init.ts` — drop unused import at line 7:25; address unused `lang` at line 70
- [x] 1.10 `src/skills/install-pi.ts` — address unused `loadConfig` and `db` at line 69
- [x] 1.11 Re-run `deno lint` — assert **0 errors**

## 2. JSDoc audit

- [x] 2.1 Generate audit list: `grep -rn "^export " src --include="*.ts" > /tmp/exports.txt` and verify each entry has a `/** */` directly above it
- [x] 2.2 `src/cli/library.ts` — confirm/add JSDoc on `runLibraryCommand` and helpers (already added in previous change; re-verify)
- [x] 2.3 `src/cli/router.ts` — add JSDoc on `SUBCOMMANDS`, `VERSION`, `route`
- [x] 2.4 `src/skills/*.ts` — confirm every exported skill has a JSDoc; add `@example` to skill-level public exports (`askSkill`, `explainSkill`, etc.)
- [x] 2.5 `src/storage/save-prompt.ts` — confirm/add JSDoc on `savePrompt`
- [x] 2.6 `src/storage/library.ts` — confirm JSDoc on every export (most already done; verify `SlugMatch`, `listSlugs`, `resolveSlug`)
- [x] 2.7 `src/db/profile.ts`, `src/db/logger.ts`, `src/db/migrations.ts`, `src/db/connection.ts` — confirm JSDoc on every export
- [x] 2.8 `src/utils/*.ts` — confirm JSDoc on every export
- [x] 2.9 `src/pi/**/*.ts` — confirm JSDoc on every export
- [x] 2.10 `src/config/*.ts` — confirm JSDoc on every export

## 3. Coverage threshold script + verify task

- [x] 3.1 Create `scripts/check-coverage.ts` — parses `deno coverage <profile> --include=src/` summary, extracts overall line %, exits 1 if < 80
- [x] 3.2 Add JSDoc to the script's main function and the `THRESHOLD` constant
- [x] 3.3 Add `deno task verify` to `deno.json`:
      `deno fmt --check && deno lint && rm -rf cov_profile && deno test --coverage=cov_profile --allow-read --allow-write --allow-env --allow-run --allow-ffi tests/ && deno run --allow-read --allow-run scripts/check-coverage.ts cov_profile`
- [x] 3.4 Manual smoke: run `deno task verify` once with current code (will fail on coverage initially) and once after task group 4 (should pass)

## 4. Coverage gap closure (to reach ≥ 80% line %)

- [x] 4.1 `tests/picker_test.ts` — cover `pickNumeric` happy path and abort path by stubbing `Deno.stdin.readSync`/`stdout.writeSync`; cover `hasFzf()`
      returning false in absence of fzf
- [x] 4.2 `tests/router_subprocess_test.ts` — extend cli-subprocess pattern to invoke: `coach tldr list`, `coach snippet list`, `coach install-aliases` (with
      HOME=temp + SHELL=zsh env), `coach uninstall-aliases`, an unknown command
- [x] 4.3 `tests/library_cli_test.ts` — add subprocess tests for `coach tldr show <slug>` (capture stdout) and `coach tldr search <query>` (after seeding a
      TLDR); add `edit` test guarded by non-Windows using `EDITOR=true`
- [x] 4.4 Refactor `src/skills/stats.ts` — extract pure formatting helpers (`formatStreakLine`, `formatLanguageBreakdown`, `formatTopicLine`) and add
      `tests/stats_format_test.ts`
- [x] 4.5 Refactor `src/skills/explain.ts`, `compare.ts`, `review.ts` — extract their prompt-building functions (e.g. `buildExplainPrompt(input, profile)`) as
      pure exports; add `tests/skills_prompts_test.ts` asserting the produced strings include expected sections/keywords
- [x] 4.6 `tests/init_test.ts` — add unit test for `parseLangSelection` (export it from `init.ts` if not already)
- [x] 4.7 Re-run `deno coverage cov_profile --include=src/` — assert overall line % ≥ 80; iterate (add tests) until met

## 5. OpenSpec + README integration

- [x] 5.1 Update `openspec/config.yaml` — add to `rules.tasks`: "Always include a `deno task verify` task before archive."
- [x] 5.2 Update `README.md` — add a "Quality gate" subsection under Development listing what `deno task verify` checks (fmt, lint, tests, ≥80% line coverage)
- [x] 5.3 Document the threshold (80% lines) and how to update it in `scripts/check-coverage.ts`'s top-of-file JSDoc

## 6. Documentation (JSDoc)

- [x] 6.1 Every new exported symbol from this change (`scripts/check-coverage.ts` main, any newly-exported pure helpers in
      skills/stats/explain/compare/review/init) has JSDoc with summary + `@param`/`@returns` and `@example` where appropriate
- [x] 6.2 No regressions in existing JSDoc coverage (re-run audit from §2)

## 7. Verify

- [x] 7.1 `deno fmt` — clean (no diff)
- [x] 7.2 `deno lint` — **0 errors**
- [x] 7.3 `deno test` — all tests green
- [x] 7.4 `deno coverage cov_profile --include=src/` — overall line ≥ 80%
- [x] 7.5 `deno task verify` — exits 0
- [x] 7.6 `openspec verify --change code-quality-baseline` — no gaps
