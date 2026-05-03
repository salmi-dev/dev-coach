## ADDED Requirements

### Requirement: Single runtime adapter surface

The library SHALL expose all platform-specific operations through a single module at `src/utils/runtime.ts` that re-exports a frozen `runtime` object. No file
under `src/` other than the adapter implementations themselves SHALL call `Deno.*`, `Bun.*`, `process.*`, or `node:*` APIs directly. `cli.ts` MAY call
`Deno.args` because the CLI binary is Deno-built.

The adapter SHALL provide at minimum: `name`, `args`, `env.get`, `env.set`, `exit`, `cwd`, `homedir`, `osPlatform`, `consoleSize`, `stdin.isTerminal`,
`stdout.isTerminal`, `stdout.write`, `readTextFile`, `writeTextFile`, `mkdir`, `stat`, `readDir`, `remove`, `runCommand`.

#### Scenario: Adapter loads on Deno

- **WHEN** the library is imported on Deno (`globalThis.Deno` defined)
- **THEN** `runtime.name` SHALL equal `'deno'`
- **AND** `runtime.readTextFile`, `runtime.cwd`, `runtime.exit` SHALL behave identically to `Deno.readTextFile`, `Deno.cwd`, `Deno.exit`

#### Scenario: Adapter loads on Bun

- **WHEN** the library is imported on Bun (`globalThis.Bun` defined, `globalThis.Deno` undefined)
- **THEN** `runtime.name` SHALL equal `'bun'`
- **AND** filesystem and env operations SHALL succeed using Bun's APIs

#### Scenario: Adapter loads on Node

- **WHEN** the library is imported on Node (`process.versions.node` defined, neither `Deno` nor `Bun` global present)
- **THEN** `runtime.name` SHALL equal `'node'`
- **AND** filesystem operations SHALL use `node:fs/promises`, env via `node:process`

#### Scenario: Unknown runtime fails fast

- **WHEN** the library is loaded in an environment with none of `Deno` / `Bun` / `process.versions.node` defined
- **THEN** importing `src/utils/runtime.ts` SHALL throw a clear error mentioning the supported runtimes

### Requirement: SQLite adapter selects driver per runtime

The library SHALL expose a `Database` interface and an `openDb(path: string)` factory at `src/db/sqlite.ts`. The factory SHALL choose its underlying driver per
runtime: `jsr:@db/sqlite` on Deno, `bun:sqlite` on Bun, `node:sqlite` on Node ≥ 22 (with `npm:better-sqlite3` as a documented fallback). The interface SHALL
expose at minimum: `prepare(sql)`, `run(sql, ...params)`, `all(sql, ...params)`, `get(sql, ...params)`, `transaction(fn)`, `close()`.

No file under `src/db/` other than the adapter SHALL import `@db/sqlite`, `bun:sqlite`, `node:sqlite`, or `better-sqlite3` directly.

#### Scenario: Open database on Deno

- **WHEN** `openDb('/tmp/x.db')` is called on Deno
- **THEN** the returned `Database` SHALL be backed by `@db/sqlite`'s `Database`
- **AND** `db.prepare('SELECT 1').get()` SHALL return `{ '1': 1 }` (or driver-equivalent)

#### Scenario: Open database on Bun

- **WHEN** `openDb('/tmp/x.db')` is called on Bun
- **THEN** the returned `Database` SHALL be backed by `bun:sqlite`'s `Database`
- **AND** the same minimal queries SHALL succeed

#### Scenario: Open database on Node 22+

- **WHEN** `openDb('/tmp/x.db')` is called on Node 22 or newer with `node:sqlite` available
- **THEN** the returned `Database` SHALL be backed by `node:sqlite`
- **AND** the same minimal queries SHALL succeed

#### Scenario: Node fallback to better-sqlite3

- **WHEN** `openDb` is called on Node and `import('node:sqlite')` throws
- **THEN** the adapter SHALL attempt to load `better-sqlite3`
- **AND** on success, return a wrapped `Database` instance
- **AND** on failure, throw an error pointing the user at `npm install better-sqlite3`

### Requirement: Supported and excluded runtimes are explicit

The package SHALL declare its runtime compatibility on JSR (via the JSR API or web UI — the field is **not configurable from `deno.json`** because Deno CLI
rejects unknown `publish` fields). Supported runtimes SHALL be: `deno`, `bun`, `node`. Explicitly excluded SHALL be: `browser`, `workerd` (Cloudflare Workers).

The README SHALL include a "Supported runtimes" section that lists the supported runtimes with their minimum versions and lists browsers / Workers as
out-of-scope with a one-line reason (filesystem + SQLite required). The desired JSR `runtimeCompat` map SHALL be documented in `design.md` so that re-applying
it after any drift is mechanical.

#### Scenario: JSR shows three compatible runtimes

- **WHEN** a user views the package page on JSR after publish
- **THEN** the "Works with" header SHALL show Deno, Bun, and Node as compatible
- **AND** SHALL show browsers and Cloudflare Workers as not compatible

### Requirement: `mod.ts` JSDoc is a substantive package overview

The top-of-file JSDoc in `mod.ts` IS the JSR package overview (driven by `publish.readmeSource: "jsdoc"` in `deno.json`, see below). It SHALL therefore function
as a self-contained landing page, not a one-line stub.

The block SHALL include:

1. A `@module` tag on its own line.
2. A first paragraph (≤ 3 sentences) stating what the package is and who it's for.
3. A second paragraph or short bulleted list summarising the public API surface organised by area (e.g. **Config**, **Database**, **Storage**, **Search**,
   **Utilities**) — mirrors the section comments already present in `mod.ts`.
4. At least **three** `@example` blocks showing real working snippets that exercise the main library APIs. At minimum: (a) loading config + saving an item, (b)
   running a search, (c) opening the DB and rebuilding the index.
5. A final “See also” sentence linking to the GitHub README and the CLI entrypoint.

Line count guidance: aim for 50–80 lines of JSDoc. Dense, scannable, code-heavy. Avoid prose padding.

#### Scenario: JSR overview shows the rewritten module doc

- **WHEN** a user opens the JSR package page after publish
- **THEN** the overview tab SHALL render the rewritten `mod.ts` JSDoc
- **AND** SHALL include at least three rendered code blocks coming from `@example` tags

#### Scenario: `deno doc mod.ts` reflects the same content

- **WHEN** a contributor runs `deno doc mod.ts`
- **THEN** the module-level documentation block SHALL appear at the top of the output
- **AND** SHALL match (modulo formatting) the JSR landing page

### Requirement: JSR overview source is configured server-side

The `readmeSource` setting on JSR SHALL be `"jsdoc"` so that the `mod.ts` module-level JSDoc renders as the package landing page. This setting is **not
configurable from `deno.json`** — the Deno CLI's `deno publish` rejects unknown fields under `publish`. It is therefore configured via the JSR API
(`PATCH /scopes/{scope}/packages/{name}`) or the JSR web UI, and SHALL be re-asserted by maintainers if it ever drifts.

The desired value SHALL be documented in `design.md` and the README so that the configuration is reproducible.

#### Scenario: JSR API reports `readmeSource: "jsdoc"`

- **WHEN** `GET https://api.jsr.io/scopes/salmidev/packages/dev-coach` is called
- **THEN** the response SHALL include `"readmeSource": "jsdoc"`
- **AND** the JSR overview tab SHALL render the rewritten `mod.ts` JSDoc

### Requirement: Both entrypoints have module documentation

Each file referenced by the `exports` field of `deno.json` SHALL begin with a JSDoc block whose tags include `@module`. For `mod.ts` the block content is
governed by the substantive-overview requirement above; for `cli.ts` the block SHALL contain at least a one-paragraph summary describing the CLI's purpose and
at least one `@example` showing an invocation (e.g. `coach ask 'how does X work'`, `coach tldr show foo`).

#### Scenario: JSR recognises module docs in cli.ts

- **WHEN** the package is published with the `./cli` entrypoint pointing at `cli.ts`
- **THEN** `cli.ts` SHALL contain a `/** ... @module ... */` block as its first non-shebang content
- **AND** the JSR score line "Has module docs in all entrypoints" SHALL report 1/1

#### Scenario: cli.ts example covers a representative subcommand

- **WHEN** a contributor reads the `cli.ts` module doc
- **THEN** the `@example` SHALL show at least one `coach <subcommand>` invocation that maps to a real registered subcommand

### Requirement: Package has a non-empty description

The `deno.json` `description` field SHALL be a non-empty, single-line, search-friendly summary of the package (≤ 120 characters, no trailing punctuation).

#### Scenario: JSR score gives the description point

- **WHEN** the package is published with a non-empty `description`
- **THEN** the JSR score line "Has a description" SHALL report 1/1
