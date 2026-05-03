## 1. Track A — JSR metadata wins (cheap, immediate score bump)

- [x] 1.1 Add `description` field to `deno.json` (≤ 120 chars, search-friendly, e.g.
      `"AI-powered coding coach: save snippets, TLDRs, and projects with SQLite-backed search."`)
- [x] 1.2 Configure `readmeSource: "jsdoc"` server-side on JSR (verified already set via API). **Note**: cannot live in `deno.json` — `deno publish` rejects
      unknown `publish` fields. Document the desired value + `curl PATCH` recipe in `design.md` D7.
- [x] 1.3 Configure `runtimeCompat: { "deno": true }` server-side on JSR (Bun/Node added in task 8.1). Same constraint as 1.2 — not a `deno.json` field.
      Pending: actually PATCH this on JSR (currently `{}` server-side); will be done after the v0.2.2 publish lands so we have a verified score.
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
- [x] 1.8 Cut a release (PATCH bump via Release workflow); on JSR confirm:
  - [x] 1.8.1 Score moved from 82% to **100%** (Track A blew past its 94% target — `multipleRuntimesCompatible` is not scored, so Deno-only already hits the
        cap)
  - [x] 1.8.2 The overview tab shows the rewritten `mod.ts` content with rendered code blocks
  - [x] 1.8.3 “Has a description”, “Has module docs in all entrypoints”, and “At least one runtime is marked as compatible” are all green

## 2. Runtime adapter — surface and Deno implementation

- [x] 2.1 Create `src/utils/runtime/index.ts` exporting the `runtime` object signature and the `RuntimeName` type defined in design.md §D2
- [x] 2.2 Implement runtime detection (Deno → Bun → Node order, throw on unknown) in `src/utils/runtime/detect.ts`
- [x] 2.3 Create `src/utils/runtime/deno.ts` mapping every adapter method to its `Deno.*` counterpart
- [x] 2.4 Wire `src/utils/runtime/index.ts` to dynamic-import the right impl based on detection
- [x] 2.5 Add JSDoc on every exported symbol (the `runtime` object, the `RuntimeName` type, the `runtime` instance)
- [x] 2.6 Add `tests/runtime_test.ts` covering: detection on Deno, every method round-trips a real value, error on missing methods

## 3. Runtime adapter — Bun and Node implementations

- [x] 3.1 Create `src/utils/runtime/bun.ts` using `Bun.*`, `bun:fs`, and Node-compatible APIs Bun exposes
- [x] 3.2 Create `src/utils/runtime/node.ts` using `node:fs/promises`, `node:os`, `node:process`, `node:child_process` (all dynamic-imported)
- [x] 3.3 Implement `runCommand` on each (Deno: `Deno.Command`; Bun: `Bun.spawn`; Node: `node:child_process.execFile`)
- [x] 3.4 Implement `consoleSize` with graceful fallback (`{ columns: 80, rows: 24 }`) when not a TTY on any runtime
- [x] 3.5 Add detection unit tests that stub `globalThis.Bun` / `globalThis.process` and assert `runtime.name`

## 4. SQLite adapter — interface and Deno implementation

- [x] 4.1 Create `src/db/sqlite/index.ts` exporting the `Database` interface (`prepare`, `run`, `all`, `get`, `transaction`, `close`) and the `openDb(path)`
      factory
- [x] 4.2 Create `src/db/sqlite/deno.ts` wrapping `@db/sqlite`'s `Database` to match the interface
- [x] 4.3 Add JSDoc on every exported symbol; document the minimum SQLite feature set we rely on
- [x] 4.4 Add `tests/db_sqlite_test.ts` covering: open in-memory db, prepare/run/all/get round-trip, transaction commit, transaction rollback on throw, close

## 5. SQLite adapter — Bun and Node implementations

- [x] 5.1 Create `src/db/sqlite/bun.ts` wrapping `bun:sqlite` to match the interface
- [x] 5.2 Create `src/db/sqlite/node.ts` trying `node:sqlite` first, falling back to `better-sqlite3` with a clear error if both fail
- [x] 5.3 Wire `openDb` factory to dynamic-import the right impl based on `runtime.name` (already done as part of Group 4 §4.1)
- [x] 5.4 Add a parameterised test runner so the SQLite test from 4.4 runs unchanged on whichever runtime executes it

## 6. Cut over — replace direct calls

- [x] 6.1 Replace direct `Deno.*` calls in every file under `src/` (except adapter impls + `src/db/connection.ts`, deferred to 6.2 because it's tangled with the
      `@db/sqlite` import) with `runtime.*` calls; ran `deno task test` after each chunk to keep changes reviewable
- [x] 6.2 Replace direct `import { Database } from '@db/sqlite'` in every file under `src/db/` (except `src/db/sqlite/deno.ts`) with the adapter `openDb()` /
      `Database` type — includes the deferred `Deno.mkdirSync` in `src/db/connection.ts`. `getDb()` is now async; ~13 callers gained `await`.
- [x] 6.3 Confirm `mod.ts` public types are unchanged (verified via `deno doc --json mod.ts` diff against pre-cutover output — identical exported set)
- [x] 6.4 Run full suite: `deno task verify` passes (266/266 tests, 84.7% coverage)
- [ ] 6.5 Add JSDoc updates anywhere a function signature gained adapter parameters

## 7. CI matrix — verify cross-runtime claims

- [x] 7.1 Add `test-bun` job to `pipeline.yml` using `oven-sh/setup-bun@v2`; runs `bun test tests/<cross-runtime-subset>` on `ubuntu-latest`
- [x] 7.2 Add `test-node` job to `pipeline.yml` using `actions/setup-node@v4` with a `node-version` matrix of `[22, 24]`; runs
      `node --test tests/<cross-runtime-subset>` (Node 22 exercises the better-sqlite3 fallback path; Node 24 uses built-in `node:sqlite`)
- [x] 7.3 Initially set `continue-on-error: true` on both new jobs so a transient hiccup doesn't block Deno releases
- [x] 7.4 Add both jobs to `ci-gate.needs` with appropriate result handling (displayed but non-blocking until 7.6)
- [x] 7.5 Curate the cross-runtime test subset (`tests/cross-runtime/`) — includes the SQLite adapter tests (`db_sqlite.test.ts`) and the runtime adapter smoke
      tests (`runtime.test.ts`)
- [ ] 7.6 Once green for ≥ 5 consecutive `main` builds, flip `continue-on-error: false`

## 8. JSR runtime-compat flip

- [ ] 8.1 PATCH `runtimeCompat` on JSR via `scripts/configure-jsr-package.sh` (already updated to flip the bun + node flags) — needs `JSR_TOKEN` so user runs it
- [x] 8.2 Update README "Supported runtimes" section with the matrix and Node version requirements (≥22 with `node:sqlite`, or any Node with `better-sqlite3`
      installed)
- [x] 8.3 Run `deno task verify`
- [ ] 8.4 Cut a MINOR release via Release workflow (this is a feature: cross-runtime support)
- [ ] 8.5 Verify on JSR: score = 100%, "Works with" badges show Deno + Bun + Node, browsers + Workers shown as not compatible

## 9. Documentation and openspec sync

- [ ] 9.1 Update root README with usage examples on each runtime (Deno import, Bun import, Node import)
- [ ] 9.2 Add a "Cross-runtime compatibility" section explaining how the adapter works (one paragraph) and listing the supported runtimes
- [ ] 9.3 Run `deno fmt` on all modified files
- [ ] 9.4 Add/update JSDoc on any new exported symbol introduced by tracks B–D
- [ ] 9.5 Run `deno task verify` (covers fmt + lint + tests + ≥80% line coverage)
- [ ] 9.6 Verify all openspec change artifacts are still consistent with the implementation; archive change after merge
