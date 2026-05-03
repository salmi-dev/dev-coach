## Context

Today the codebase calls `Deno.*` directly (17 distinct APIs across `src/`) and imports `@db/sqlite` directly in 9 files. The CLI binary is built with
`deno compile`, which is fine — `coach` is a Deno-native binary and we cross-compile it for linux/macos-x86_64/macos-aarch64/windows in `release.yml`.

The pain is on the **library** side. `mod.ts` is published to JSR as `@salmidev/dev-coach`. JSR scores the package at 82% and shows "Works with: ?" for every
runtime because:

1. No description in `deno.json` / JSR settings.
2. `cli.ts` has a top JSDoc but no `@module` tag, so JSR doesn't recognise it as module documentation for the `./cli` entrypoint.
3. No runtime-compat flags claimed (the field is opt-in self-declaration on JSR).
4. The exported library can't actually run on non-Deno hosts because of the `Deno.*` and `@db/sqlite` couplings.

Track A (1–3) is metadata. Track B (4) is a real porting effort, scoped to **Deno + Bun + Node**. Browsers and Cloudflare Workers are excluded by physics — we
need a filesystem and SQLite.

Current public surface from `mod.ts`:

- `loadConfig`, `saveConfig`, `validateConfig`, `CoachConfig`
- `getDb`, `closeDb`, `runMigrations`
- `saveItem`, `readItem`, `listItems`, `deleteItem`, `toSlug`, `ItemType`, `SaveItemOptions`
- `parseFrontmatter`, `serializeFrontmatter`, `*Frontmatter` types
- `search`, `SearchFilters`, `SearchResult`
- `rebuildIndex`, `regenerateDashboard`, `logSession`, `LogSessionParams`
- `getHomeDir`, `getOS`, `isInteractive`, `getConfigDir`, `getDataDir`, `getLibraryPath`

All of these eventually touch the filesystem, the SQLite DB, or `Deno.*` env / args.

## Goals / Non-Goals

**Score outcome (verified after Track A):** Track A alone reached **100%** on the JSR score (17/17). The `multipleRuntimesCompatible` flag is shown on the
package page but is NOT scored. So **Track B is no longer needed for the score**; it stands on its own merits as real multi-runtime support.

**Goals:**

- Hit **100% JSR score** for `@salmidev/dev-coach`.
- Make `mod.ts` work unchanged on **Deno**, **Bun**, and **Node ≥ 22** (LTS that ships native `node:sqlite`, with `better-sqlite3` as a fallback for older
  Node).
- Keep the library's public TypeScript types **identical** — no breaking changes for current Deno consumers.
- Keep the `coach` CLI binary unchanged in behaviour, build process, and release flow.
- Make the multi-runtime guarantee verifiable via CI (`test-bun`, `test-node` jobs), not just self-declared.

**Non-Goals:**

- Browsers / Cloudflare Workers / Edge runtimes — out of scope, will be marked **incompatible** on JSR, not unknown.
- Replacing `deno fmt` / `deno lint` / coverage tooling. The Deno toolchain stays the source of truth for code quality.
- Publishing to npm. We stay on JSR.
- Rewriting the CLI router or any user-visible behaviour.

## Decisions

### D1. Runtime detection: capability sniff, not name sniff

We detect the host by capability, in order:

```ts
const RT = typeof Deno !== 'undefined'
  ? 'deno'
  : typeof Bun !== 'undefined'
  ? 'bun'
  : typeof process !== 'undefined' && process.versions?.node
  ? 'node'
  : 'unknown';
```

**Why**: capability sniffing is robust against runtime impersonation polyfills (e.g. Bun providing a partial `Deno` global) and avoids ordering bugs. We assert
`'unknown'` throws a clear `RuntimeError` at adapter init, not at first call.

**Alternative considered**: env-var-based selection (`COACH_RUNTIME=node`). Rejected — adds a footgun for users; we should "just work".

### D2. One thin runtime adapter at `src/utils/runtime.ts`

Single module exporting a frozen `runtime` object with the methods we actually use (the 17 distinct `Deno.*` calls reduced to a curated surface):

```ts
export const runtime: {
  name: 'deno' | 'bun' | 'node';
  args: readonly string[];
  env: { get(k: string): string | undefined; set(k: string, v: string): void };
  exit(code?: number): never;
  cwd(): string;
  homedir(): string;
  osPlatform(): 'darwin' | 'linux' | 'windows' | 'freebsd' | 'other';
  consoleSize(): { columns: number; rows: number };
  stdin: { isTerminal(): boolean };
  stdout: { isTerminal(): boolean; write(data: Uint8Array): Promise<void> };
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, data: string): Promise<void>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number }>;
  readDir(path: string): AsyncIterable<{ name: string; isFile: boolean; isDirectory: boolean }>;
  remove(path: string, opts?: { recursive?: boolean }): Promise<void>;
  runCommand(cmd: string, args: string[], opts?: { stdin?: string }): Promise<{ code: number; stdout: string; stderr: string }>;
};
```

Implementations live in `src/utils/runtime/{deno,bun,node}.ts`; the index re-exports the right one based on D1. Lazy `import()` so each implementation only
loads `node:fs` / `bun:sqlite` / `@db/sqlite` on its host.

**Why**: a single explicit surface is far easier to keep in sync than scattering `if (RT === ...)` everywhere. Existing helpers like `src/utils/platform.ts`
(`getHomeDir`, `getOS`, `isInteractive`) are rewritten on top of `runtime` — public signatures unchanged.

**Alternative considered**: import-mapping `Deno` → `@deno/shim-deno` from npm on Node/Bun. Rejected — the shim is incomplete (no `Deno.consoleSize`, no
`Deno.Command` parity), and we'd still need a SQLite adapter.

### D3. SQLite adapter at `src/db/sqlite.ts`

We use a tiny subset of SQLite features today: `prepare`, `run`, `all`, `get`, `transaction`, `close`. We expose exactly that surface and pick the
implementation per runtime:

| Runtime      | Driver                                                      | Notes                                       |
| ------------ | ----------------------------------------------------------- | ------------------------------------------- |
| Deno         | `jsr:@db/sqlite@0.12`                                       | unchanged, current behaviour                |
| Bun          | `bun:sqlite` (built-in)                                     | sync API, identical shape after a thin wrap |
| Node         | `node:sqlite` (Node ≥ 22.5 experimental, then stable in 24) | first choice — built-in, zero install       |
| Node (older) | `npm:better-sqlite3`                                        | fallback if `node:sqlite` import fails      |

The adapter exposes a synchronous API (matching how SQLite is used everywhere today). All three drivers are sync; this keeps `getDb()` non-`async`.

**Why three drivers, not one**: each runtime's native SQLite is the fastest, ships with the runtime (no install for Bun, none for Node ≥ 24), and avoids
native-module-build pain. `better-sqlite3` is the only npm fallback and is the most popular Node SQLite binding.

**Alternative considered**: `sql.js` (WASM SQLite, runs anywhere). Rejected — WASM SQLite requires manual `db.export()` to persist, has no real `transaction()`,
and is 1.5 MB of WASM in every bundle.

### D4. Node target: ≥ 22, but document `better-sqlite3` fallback for 20

Our `package.json`-equivalent in JSR will declare Node ≥ 22. Users on Node 20 (still LTS until April 2026) get a clear runtime error pointing them to install
`better-sqlite3`. We test on Node 22 + Node 24 in CI.

**Why ≥ 22**: that's when `node:sqlite` lands behind `--experimental-sqlite`. Node 24 promotes it to stable. Anything earlier requires a native compile step we
don't want to support by default.

### D5. Dynamic imports + selective tree-shaking

Each runtime implementation file does its imports inline (`await import('node:fs/promises')`). The Deno bundler / JSR publisher strips the unreachable branches
because `RT` is a constant determined at adapter-load time. **For Deno consumers, no Node/Bun code is fetched.**

**Why**: keeps Deno consumers (the majority today) on a slim bundle and avoids JSR tripping on `node:` specifiers it doesn't understand.

### D6. CI matrix — verify, don't trust

`pipeline.yml` grows two new jobs:

- **`test-bun`** on `ubuntu-latest` with `oven-sh/setup-bun@v2` — runs a curated subset of `tests/**` with `bun test`.
- **`test-node`** on `ubuntu-latest` with `actions/setup-node@v4` (Node 22 + Node 24 matrix) — runs the same subset via `node --test`.

The subset excludes Deno-binary integration tests (`router_subprocess_test.ts` etc.) and focuses on the library surface (`mod.ts` exports). Both jobs
`needs: [fmt, lint]` and feed into `ci-gate`.

**Why a subset**: the CLI subprocess tests assume `deno` on `$PATH`. Porting them is out of scope; the library tests are what matters for cross-runtime
correctness.

### D7. Module docs and description — done in code, not just JSR settings

- `cli.ts` gets a `/** ... @module */` block (matching `mod.ts`) with a one-paragraph summary and at least one `coach <subcommand>` `@example`.
- `deno.json` gains a top-level `"description"` field. JSR reads it on publish (verified: Deno CLI accepts top-level `description`).
- The runtime-compat flags (`"deno": true`, `"bun": true`, `"node": true`, `"browser": false`, `"workerd": false`) and `readmeSource: "jsdoc"` are configured
  **server-side on JSR** via the JSR API or web UI. They are NOT in `deno.json`: we tried `publish.readmeSource` / `publish.runtimeCompat` and `deno publish`
  failed with `unknown field 'readmeSource', expected 'include' or 'exclude'`. There is no top-level Deno schema slot for these at this time.

**Reproducible configuration**: see [`scripts/configure-jsr-package.sh`](../../../scripts/configure-jsr-package.sh) — versioned, idempotent, takes `JSR_TOKEN`
from env. Runs the two `PATCH` calls below.

```bash
curl -X PATCH https://api.jsr.io/scopes/salmidev/packages/dev-coach \
  -H "Authorization: Bearer $JSR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"runtimeCompat":{"deno":true,"bun":true,"node":true,"browser":false,"workerd":false}}'
```

`readmeSource` already defaults to `"jsdoc"` for our package (verified via JSR API), so no PATCH is currently needed; the value is documented here so a
maintainer can re-assert it if it ever drifts.

### D8. JSR overview is `mod.ts` JSDoc, with `readmeSource: "jsdoc"` set server-side

JSR currently displays `mod.ts`'s module JSDoc on the package landing page (the JSR API returns `"readmeSource":"jsdoc"`). Today that block is four lines and
looks like a stub on JSR. We will:

- **Document the setting** in this design and the README. The setting is server-side on JSR, not in `deno.json` (see D7); we re-assert via JSR API if it drifts.
- **Rewrite the `mod.ts` module-level JSDoc** as a 50–80-line overview with: one-paragraph what-this-is, a bulleted public-API map (Config / Database / Storage
  / Search / Utilities) mirroring the section comments already in the file, and ≥ 3 `@example` blocks covering the headline workflows (load config + save an
  item, run a search, open the DB and rebuild the index).
- **Keep `README.md`** as the GitHub-side long-form doc — skills catalogue, CLI install, configuration, library structure. The two complement each other; we are
  NOT duplicating.

**Why `"jsdoc"` over `"readme"`**: the module doc travels with the published package, so `deno doc mod.ts` and the JSR landing page show the same content. The
README is growing CLI-heavy content (7 skill subcommands, shell aliases, pi integration) that would dilute the library-overview message a JSR visitor needs in
the first 30 seconds.

**Alternative considered**: flip `readmeSource` to `"readme"` and let the 220-line README serve as the JSR landing page. Rejected — too much CLI-only content
for a JSR audience there to evaluate the library API. We may revisit this once the README is split into `README.md` (CLI) + `LIBRARY.md` (API).

## Risks / Trade-offs

- **[SQLite API drift between drivers]** → Mitigation: keep the adapter surface tiny (6 methods), encode it as a TypeScript interface, and exercise it on every
  runtime in CI. Specifically check edge cases: `lastInsertRowId`, `prepare` reuse, `transaction` rollback semantics.
- **[Node `node:sqlite` is experimental on 22]** → Mitigation: catch the import error, fall back to `better-sqlite3` with a clear log line. Document the
  fallback in the README.
- **[Bun's `Deno` polyfill could mis-trigger D1's detection]** → Mitigation: capability sniff in the **D1 order** (Deno first, then Bun, then Node) — Bun's
  `Deno` shim is incomplete enough that we'd hit runtime errors anyway, so checking `Bun` first matters. Add a unit test that sets `globalThis.Bun` and asserts
  `runtime.name === 'bun'`.
- **[Library bundle size grows for Node/Bun consumers]** → Mitigation: dynamic imports gate native deps so each runtime only loads its own. The Deno bundle is
  unchanged.
- **[Maintenance: 3 SQLite drivers ≈ 3× the bug surface]** → Mitigation: the adapter is the only seam; if a feature works on Deno, it must be added to the
  interface contract first, then implemented in the other two. Make the adapter the single point of accountability.
- **[`@db/sqlite@0.12` upgrades may diverge]** → Mitigation: pin the minor; bump only when test matrix passes.

## Migration Plan

The change is purely additive for consumers; no migration needed for Deno users. Internal migration:

1. **Land Track A in one PR** (`docs(jsr): module docs + description + Deno-compat flag`). Score jumps to 94% (17/18) immediately. Risk: zero.
2. **Land the runtime adapter** (`feat(runtime): platform-agnostic adapter`) without removing direct `Deno.*` calls — adapter unused yet. PR is reviewable in
   isolation.
3. **Land the SQLite adapter** (`feat(db): runtime-agnostic SQLite adapter`) the same way — `getDb()` keeps using `@db/sqlite` directly until step 4.
4. **Cut over** (`refactor(core): route through runtime + sqlite adapters`). Big PR but mechanical: replace `Deno.X` with `runtime.X` and `new Database(...)`
   with `openDb(...)`. CI on Deno must stay green.
5. **Add CI matrix** (`ci: add test-bun and test-node jobs`). Initially `continue-on-error: true` so a Bun/Node hiccup doesn't block Deno releases. Flip to
   required once green for 7 days.
6. **Flip the JSR runtime-compat flags** (`chore(jsr): claim deno+bun+node compatibility`). Last commit; release as `v0.3.0`.

**Rollback**: each step is a normal commit on `main`. If step 4 is bad, revert that single commit; adapters stay in place but unused.

## Open Questions

- Do we ship the `node:sqlite` path or go straight to `better-sqlite3` for simplicity? Leaning toward both (try `node:sqlite` first), but if it complicates the
  adapter we'll drop it and document Node 22+ + `better-sqlite3` install.
- Should `runCommand` exist at all on Bun/Node, given that the only callers are clipboard + shell-alias detection? An alternative is to gate those features off
  when `runtime.name !== 'deno'` and document the limitation. Decision deferred to implementation — if `Deno.Command` parity is annoying, we'll degrade
  gracefully.
- Do we want a `runtime-compat` skill / spec under `openspec/specs/` to document the cross-runtime promise as a first-class capability? The proposal currently
  creates `runtime-compat` as a new capability — confirming during specs phase.
