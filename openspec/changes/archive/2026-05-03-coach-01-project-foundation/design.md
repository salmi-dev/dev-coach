## Context

Dev Coach is a greenfield Deno CLI application. There is no existing codebase — only a README describing the coaching concept and 6 PROMPT.md files outlining
the change pipeline. This design covers the foundational layer: project structure, configuration, database, path resolution, and CLI routing that all future
skills (changes 02–06) will build upon.

The target user is a developer who installs `coach` globally via Deno/JSR and uses it from any directory. State is stored centrally (XDG paths), not
per-project.

## Goals / Non-Goals

**Goals:**

- Establish a clean, modular Deno project structure publishable to JSR
- Provide XDG-compliant path resolution across macOS, Linux, and Windows
- Deliver a typed YAML config system with interactive setup
- Set up SQLite with migration system and initial schema (sessions, items, profile, FTS5)
- Build CLI router with subcommand dispatch and global flags
- Provide core utils: clipboard, ASCII art, platform detection
- All skill subcommands registered as stubs for future changes

**Non-Goals:**

- Implementing any actual skill logic (ask, sandbox, etc.) — that's changes 03–06
- Storage layer CRUD for library items — that's change 02
- Pi skill definitions or custom tools — that's change 06
- Publishing to JSR — that's change 06; we just ensure the config supports it

## Decisions

### 1. Deno as runtime + JSR as registry

**Choice**: Deno 2.x with `jsr:@ssal/dev-coach`

**Alternatives considered**:

- Node.js + npm: More ecosystem familiarity, but requires build step for TypeScript, `node_modules` overhead
- Bun: Fast but less mature, smaller ecosystem for CLI tooling

**Rationale**: Deno gives native TypeScript, built-in tooling (`deno fmt`, `deno lint`, `deno test`), `deno install -g` for global CLI, and full npm compat when
needed. JSR is the natural registry for Deno packages.

### 2. XDG Base Directory Specification

**Choice**: Follow XDG strictly for config/data; library path is configurable (default `~/dev-coach`)

**Rationale**:

- Config → `$XDG_CONFIG_HOME/dev-coach/` (default `~/.config/dev-coach/`)
- Data (DB) → `$XDG_DATA_HOME/dev-coach/` (default `~/.local/share/dev-coach/`)
- Library → user-configured, default `~/dev-coach/` (visible, not hidden)

On macOS where XDG isn't standard, we still use `~/.config` and `~/.local/share` as defaults — this is the convention for CLI tools on macOS. On Windows, fall
back to `%APPDATA%` and `%LOCALAPPDATA%`.

### 3. SQLite via `jsr:@db/sqlite`

**Choice**: `jsr:@db/sqlite` (Deno FFI-based SQLite binding)

**Alternatives considered**:

- `Deno.openKv`: Built-in but KV-only, no SQL queries, no FTS
- JSON/JSONL files: Simpler but no indexing, no FTS5, aggregation painful
- `npm:better-sqlite3`: Node-native, requires Node compat layer

**Rationale**: `@db/sqlite` is the standard SQLite library for Deno, uses FFI for native performance, supports FTS5, and has a synchronous API matching SQLite's
nature. The DB file lives at `$XDG_DATA_HOME/dev-coach/coach.db`.

### 4. Migration system — simple versioned SQL files

**Choice**: Embed migration SQL as string arrays in code, track version in a `_migrations` table.

**Rationale**: For a personal CLI tool, a lightweight approach beats a migration framework. Each migration is a numbered function. On startup, run any pending
migrations. No rollback — forward-only (this is a local tool, not a production database).

### 5. Config format — YAML with typed validation

**Choice**: YAML config at `~/.config/dev-coach/config.yaml`, validated with a TypeScript schema.

**Alternatives considered**:

- TOML: Good for config but no `@std/toml` in Deno std
- JSON: Verbose, no comments
- Environment variables: Not suitable for structured config

**Rationale**: YAML is human-readable, supports comments, and `@std/yaml` is in Deno's standard library.

### 6. CLI parsing — `@std/cli` + manual router

**Choice**: Use `@std/cli` for flag parsing, manual subcommand dispatch.

**Alternatives considered**:

- `npm:commander` / `npm:yargs`: Heavy for our needs, Node-oriented
- `cliffy`: Good Deno CLI framework but adds a large dependency

**Rationale**: Our CLI surface is simple — 9 subcommands with minimal flags each. `@std/cli` handles flag parsing; a switch statement routes subcommands. This
keeps dependencies minimal and control maximal.

### 7. Interactive prompts — `@anthropic-ai/claude-code` or simple stdin

**Choice**: Simple stdin-based prompts for `coach init`. Read lines, display options with numbers.

**Rationale**: We avoid heavy prompt libraries. The init flow is run once; it doesn't need fancy multi-select widgets. Simple numbered lists with stdin input
are sufficient and dependency-free.

## Risks / Trade-offs

- **[Risk] `jsr:@db/sqlite` FFI requires `--unstable-ffi` flag** → Mitigation: Deno 2.x has stabilized FFI; verify at implementation time. If needed, add
  `--allow-ffi` to install command.
- **[Risk] XDG paths on macOS aren't standard** → Mitigation: `~/.config` and `~/.local/share` are widely adopted by CLI tools on macOS (e.g., `bat`, `fd`,
  `starship`). Acceptable convention.
- **[Risk] SQLite FTS5 may not be compiled into all SQLite builds** → Mitigation: `@db/sqlite` bundles its own SQLite with FTS5 enabled.
- **[Trade-off] Simple stdin prompts vs rich TUI for init** → Acceptable: init runs once; rich TUI can be added later if wanted.
- **[Trade-off] No rollback migrations** → Acceptable: local dev tool, not production. If schema breaks, delete `coach.db` and re-init.
