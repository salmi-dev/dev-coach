## Why

The package currently scores **82% on JSR** (14/17) and is marked as having **unknown runtime compatibility** for every runtime (Deno, Node, Bun, Browsers,
Cloudflare Workers). Three score gaps come from missing metadata that costs minutes to fix; one (multi-runtime support) requires real code changes. We want to
ship a credible, discoverable, broadly compatible library — not a Deno-only artifact with a vague description.

## What Changes

**Track A — Cheap metadata wins (gets us to 17/18 = 94%)**

- **Rewrite the `mod.ts` module-level JSDoc as a real overview.** JSR currently uses `mod.ts`'s JSDoc as the package landing page (`readmeSource: "jsdoc"` per
  JSR API). The current 4-line block (`Dev Coach — AI-powered coding coach / Library entry point for programmatic usage.`) is what every JSR visitor sees first.
  Replace it with a multi-paragraph overview that mirrors the README's most important sections: what the package is, install one-liner, a short “What you get”
  section, and three to five `@example` blocks covering the main library entry points (`saveItem`, `search`, `loadConfig`, `getDb`, `regenerateDashboard`). Keep
  ≤ ~80 lines of JSDoc — dense, scannable, code-heavy.
- Decide and pin `readmeSource` explicitly in `deno.json` (`"jsdoc"`) so the JSR overview source is versioned, not toggled in the JSR UI. Document the choice in
  `design.md` so contributors know `mod.ts`'s top JSDoc IS the JSR landing page.
- Add a JSDoc `@module` block to `cli.ts` so JSR recognises module documentation in the second entrypoint. Include a one-paragraph summary plus an `@example`
  showing CLI invocation (`coach ask`, `coach tldr show`, etc.).
- Set a real package description (in `deno.json`) so the package is searchable and the JSR score rewards the field.
- Mark **Deno** as compatible on JSR settings (already true today).

**Track B — Honest cross-runtime support (closes the last 6% to 100%)**

- Introduce a thin **runtime adapter** under `src/utils/runtime.ts` that exposes the small surface we actually need (`args`, `env`, `exit`, `cwd`, `homedir`,
  `osPlatform`, `consoleSize`, `stdin/stdout`, `readTextFile`, `writeTextFile`, `mkdir`, `stat`, `readDir`, `remove`, `runCommand`). The adapter detects the
  host (`globalThis.Deno` / `globalThis.Bun` / `process.versions.node`) and delegates to native APIs (`Deno.*`, `bun:*`,
  `node:fs`/`node:os`/`node:process`/`node:child_process`).
- Introduce a **SQLite adapter** under `src/db/sqlite.ts` that exposes the minimal `Database` shape currently used (`prepare`, `run`, `all`, `get`,
  `transaction`, `close`) and selects the implementation by runtime: `@db/sqlite` on Deno, `bun:sqlite` on Bun, `better-sqlite3` on Node.
- Replace direct `Deno.*` calls in `src/**/*.ts` and direct `@db/sqlite` imports with the adapters above. `cli.ts` keeps `Deno.args` since the CLI binary is
  Deno-built.
- Mark **Deno + Bun + Node** as compatible on JSR settings once tests pass on each.
- Add CI matrix jobs (`test-bun`, `test-node`) that run a subset of integration tests on Bun and Node to keep the compatibility honest.

**Out of scope** (documented as "incompatible by design"): Browsers and Cloudflare Workers — this is a filesystem + SQLite CLI/library; the constraint is
fundamental, not a porting effort.

## Capabilities

### New Capabilities

- `runtime-compat`: declares the runtime-adapter surface, the SQLite adapter contract, the supported runtimes (Deno + Bun + Node), and the explicit non-targets
  (browsers, Workers). Also covers the JSR-side metadata: package description, runtime-compatibility flags, and per-entrypoint module documentation.

### Modified Capabilities

- `sqlite-database`: existing requirements become runtime-agnostic — `getDb()` SHALL return the adapter `Database`, not a `@db/sqlite` instance. Behaviour
  (location, migrations, transactions) unchanged.
- `core-utils`: utilities that wrap OS commands (clipboard copy, shell detection, terminal size) SHALL go through the runtime adapter for `runCommand` /
  `consoleSize` instead of calling `Deno.Command` / `Deno.consoleSize` directly.
- `quality-gate`: CI pipeline grows two parallel jobs (`test-bun`, `test-node`) that run after `lint` and join `ci-gate`. The `verify` task and coverage
  threshold remain Deno-only.

## Impact

- **Code**: ~20 files under `src/db/**` and any file calling `Deno.*` get rewritten through the adapters. Public exports in `mod.ts` keep their TypeScript
  signatures (no breaking changes for library consumers).
- **APIs**: `mod.ts` becomes runtime-agnostic. The CLI binary (`coach`) is unchanged — `deno compile` still produces the cross-platform native binaries
  documented in `quality-gate`.
- **Dependencies**: new dev/runtime imports — `npm:better-sqlite3` (Node), `bun:sqlite` (Bun, built-in). Both pulled lazily via dynamic `import()` so Deno
  consumers never see them.
- **CI**: `pipeline.yml` gains `test-bun` (`oven-sh/setup-bun@v2`) and `test-node` (`actions/setup-node@v4`) jobs. Release workflow unchanged.
- **JSR**: score jumps **82% → 100%**; package gets a description, three "Works with" badges (Deno/Bun/Node), and module docs on both entrypoints.
- **Risk**: SQLite API divergence between `@db/sqlite`, `bun:sqlite`, and `better-sqlite3` is the main hazard — mitigated by keeping the adapter surface small
  (we use a tiny subset of SQLite features) and by the new CI matrix jobs catching regressions.
