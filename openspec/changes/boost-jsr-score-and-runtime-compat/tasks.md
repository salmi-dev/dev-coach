## 1. Track A — JSR metadata wins (cheap, immediate score bump)

- [x] 1.1 Add `description` field to `deno.json` (≤ 120 chars, search-friendly, e.g.
      `"AI-powered coding coach: save snippets, TLDRs, and projects with SQLite-backed search."`)
- [x] 1.2 Add `"readmeSource": "jsdoc"` under `publish` in `deno.json` so the JSR overview source is pinned in version control (not relying on JSR UI defaults)
- [x] 1.3 Add `publish.runtimeCompat` to `deno.json` with `{ "deno": true }` only (Bun/Node flipped on later, after track B)
- [x] 1.4 **Rewrite `mod.ts` top-of-file JSDoc as the JSR landing page** — this is what visitors see first on jsr.io:
  - [x] 1.4.1 One-paragraph “what is this” (≤ 3 sentences) targeting library consumers (not CLI users)
  - [x] 1.4.2 Bulleted public-API map by area (Config / Database / Storage / Search / Utilities) mirroring the existing section comments in `mod.ts`
  - [x] 1.4.3 `@example` block: load config + save a snippet (`loadConfig` + `saveItem`)
  - [x] 1.4.4 `@example` block: run a search across the library (`search` with filters)
  - [x] 1.4.5 `@example` block: open the DB and rebuild the FTS index (`getDb` + `rebuildIndex`)
  - [x] 1.4.6 Closing “See also” sentence linking to the GitHub README and the `./cli` entrypoint
  - [x] 1.4.7 Verify total length is 50–80 lines of JSDoc; trim prose if longer
  - [x] 1.4.8 Run `deno doc mod.ts` and confirm the module-level block renders cleanly with code blocks
- [x] 1.5 **Add `cli.ts` top-of-file `@module` JSDoc** (after the shebang):
  - [x] 1.5.1 One-paragraph CLI summary (purpose, when to use it vs the library)
  - [x] 1.5.2 `@example` showing one or two real subcommand invocations (e.g. `coach ask 'how does X work'`, `coach tldr show foo`)
  - [x] 1.5.3 Run `deno doc cli.ts` to verify the block is recognised
- [x] 1.6 Update README's Development section: mention the JSR score target, link to the package page, and note that the JSR landing page is sourced from
      `mod.ts` JSDoc (so contributors editing `mod.ts` are editing the JSR overview)
- [x] 1.7 Run `deno fmt`, `deno lint`, `deno task verify`
- [ ] 1.8 Cut a release (PATCH bump via Release workflow); on JSR confirm:
  - [ ] 1.8.1 Score moved from 82% to ≥ 94%
  - [ ] 1.8.2 The overview tab shows the rewritten `mod.ts` content with rendered code blocks
  - [ ] 1.8.3 “Has a description”, “Has module docs in all entrypoints”, and “At least one runtime is marked as compatible” are all green

## 2. Runtime adapter — surface and Deno implementation

- [ ] 2.1 Create `src/utils/runtime/index.ts` exporting the `runtime` object signature and the `RuntimeName` type defined in design.md §D2
- [ ] 2.2 Implement runtime detection (Deno → Bun → Node order, throw on unknown) in `src/utils/runtime/detect.ts`
- [ ] 2.3 Create `src/utils/runtime/deno.ts` mapping every adapter method to its `Deno.*` counterpart
- [ ] 2.4 Wire `src/utils/runtime/index.ts` to dynamic-import the right impl based on detection
- [ ] 2.5 Add JSDoc on every exported symbol (the `runtime` object, the `RuntimeName` type, the `runtime` instance)
- [ ] 2.6 Add `tests/runtime_test.ts` covering: detection on Deno, every method round-trips a real value, error on missing methods

## 3. Runtime adapter — Bun and Node implementations

- [ ] 3.1 Create `src/utils/runtime/bun.ts` using `Bun.*`, `bun:fs`, and Node-compatible APIs Bun exposes
- [ ] 3.2 Create `src/utils/runtime/node.ts` using `node:fs/promises`, `node:os`, `node:process`, `node:child_process` (all dynamic-imported)
- [ ] 3.3 Implement `runCommand` on each (Deno: `Deno.Command`; Bun: `Bun.spawn`; Node: `node:child_process.execFile`)
- [ ] 3.4 Implement `consoleSize` with graceful fallback (`{ columns: 80, rows: 24 }`) when not a TTY on any runtime
- [ ] 3.5 Add detection unit tests that stub `globalThis.Bun` / `globalThis.process` and assert `runtime.name`

## 4. SQLite adapter — interface and Deno implementation

- [ ] 4.1 Create `src/db/sqlite/index.ts` exporting the `Database` interface (`prepare`, `run`, `all`, `get`, `transaction`, `close`) and the `openDb(path)`
      factory
- [ ] 4.2 Create `src/db/sqlite/deno.ts` wrapping `@db/sqlite`'s `Database` to match the interface
- [ ] 4.3 Add JSDoc on every exported symbol; document the minimum SQLite feature set we rely on
- [ ] 4.4 Add `tests/db_sqlite_test.ts` covering: open in-memory db, prepare/run/all/get round-trip, transaction commit, transaction rollback on throw, close

## 5. SQLite adapter — Bun and Node implementations

- [ ] 5.1 Create `src/db/sqlite/bun.ts` wrapping `bun:sqlite` to match the interface
- [ ] 5.2 Create `src/db/sqlite/node.ts` trying `node:sqlite` first, falling back to `better-sqlite3` with a clear error if both fail
- [ ] 5.3 Wire `openDb` factory to dynamic-import the right impl based on `runtime.name`
- [ ] 5.4 Add a parameterised test runner so the SQLite test from 4.4 runs unchanged on whichever runtime executes it

## 6. Cut over — replace direct calls

- [ ] 6.1 Replace direct `Deno.*` calls in every file under `src/` (except adapter impls) with `runtime.*` calls; run `deno test` after each module to keep
      changes reviewable
- [ ] 6.2 Replace direct `import { Database } from '@db/sqlite'` in every file under `src/db/` (except `src/db/sqlite/deno.ts`) with the adapter `openDb()` /
      `Database` type
- [ ] 6.3 Confirm `mod.ts` public types are unchanged (run `deno check mod.ts`; diff `deno doc --json mod.ts` against pre-cutover output)
- [ ] 6.4 Run full suite: `deno task verify` must pass
- [ ] 6.5 Add JSDoc updates anywhere a function signature gained adapter parameters

## 7. CI matrix — verify cross-runtime claims

- [ ] 7.1 Add `test-bun` job to `pipeline.yml` using `oven-sh/setup-bun@v2`; runs `bun test tests/<cross-runtime-subset>` on `ubuntu-latest`
- [ ] 7.2 Add `test-node` job to `pipeline.yml` using `actions/setup-node@v4` with a `node-version` matrix of `[22, 24]`; runs
      `node --test tests/<cross-runtime-subset>`
- [ ] 7.3 Initially set `continue-on-error: true` on both new jobs so a transient hiccup doesn't block Deno releases
- [ ] 7.4 Add both jobs to `ci-gate.needs` with appropriate result handling
- [ ] 7.5 Curate the cross-runtime test subset (a `tests/cross-runtime/` dir or a tagged glob) — must include the SQLite adapter tests and the runtime adapter
      tests
- [ ] 7.6 Once green for ≥ 5 consecutive `main` builds, flip `continue-on-error: false`

## 8. JSR runtime-compat flip

- [ ] 8.1 Update `deno.json` `publish.runtimeCompat` to `{ "deno": true, "bun": true, "node": true, "browser": false, "workerd": false }`
- [ ] 8.2 Update README "Supported runtimes" section with the matrix and Node version requirements (≥22 with `node:sqlite`, or any Node with `better-sqlite3`
      installed)
- [ ] 8.3 Run `deno task verify`
- [ ] 8.4 Cut a MINOR release via Release workflow (this is a feature: cross-runtime support)
- [ ] 8.5 Verify on JSR: score = 100%, "Works with" badges show Deno + Bun + Node, browsers + Workers shown as not compatible

## 9. Documentation and openspec sync

- [ ] 9.1 Update root README with usage examples on each runtime (Deno import, Bun import, Node import)
- [ ] 9.2 Add a "Cross-runtime compatibility" section explaining how the adapter works (one paragraph) and listing the supported runtimes
- [ ] 9.3 Run `deno fmt` on all modified files
- [ ] 9.4 Add/update JSDoc on any new exported symbol introduced by tracks B–D
- [ ] 9.5 Run `deno task verify` (covers fmt + lint + tests + ≥80% line coverage)
- [ ] 9.6 Verify all openspec change artifacts are still consistent with the implementation; archive change after merge
