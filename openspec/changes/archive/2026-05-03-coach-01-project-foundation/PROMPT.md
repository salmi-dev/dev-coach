# Coach 01 — Project Foundation

## What
Bootstrap the `dev-coach` Deno CLI project with all foundational infrastructure.

## Scope

### Deno Project Setup
- `deno.json` with tasks: `dev`, `build`, `install`, `test`
- Entry points: `cli.ts` (CLI), `mod.ts` (library)
- Dependencies: `jsr:@db/sqlite`, `jsr:@std/path`, `jsr:@std/yaml`, `jsr:@std/cli`
- Target: publishable to JSR as `jsr:@ssal/dev-coach`

### XDG Path Resolution (`src/utils/xdg.ts`)
- Resolve `$XDG_CONFIG_HOME` → `~/.config/dev-coach/`
- Resolve `$XDG_DATA_HOME` → `~/.local/share/dev-coach/`
- Library path: configurable, default `~/dev-coach/`
- Cross-platform: macOS, Linux, Windows fallbacks

### Config (`src/config/`)
- Schema: `config.yaml` with typed validation
- Fields: `library_path`, `primary_languages[]`, `frameworks[]`, `response_style` (concise|detailed|examples-first), `os` (auto-detected)
- Load/save/validate functions

### SQLite Database (`src/db/`)
- Connection management with `jsr:@db/sqlite`
- Migration system (versioned, auto-run on start)
- Initial schema:
  - `sessions` table (id, ts, mode, lang, tags, query, duration_s, saved_as)
  - `items` table (id, type, title, path, lang, tags, created, updated, source_session)
  - `profile` table (key, value)
  - FTS5 virtual table on `items`
- Typed query helpers

### `coach init` Command
- Interactive first-run setup:
  - Select primary languages (multi-select)
  - Enter frameworks/tools
  - Choose response style
  - Set library path (default: `~/dev-coach`)
- Creates: config file, database, library directory tree (`snippets/`, `tldr/`, `projects/`)
- Writes initial `README.md` dashboard in library
- Detects OS for clipboard support
- ASCII art welcome banner

### Core Utils
- `src/utils/clipboard.ts` — OS-aware clipboard (pbcopy/xclip/wl-copy/clip)
- `src/utils/ascii.ts` — Box drawing, banners, mode icons
- `src/utils/platform.ts` — OS detection, terminal capabilities

### CLI Router
- `cli.ts` parses subcommands: `coach init`, `coach ask`, `coach sandbox`, etc.
- Each subcommand delegates to its skill module
- Global flags: `--help`, `--version`, `--config <path>`
- Skills are stubs at this stage (just print "not yet implemented")

## Dependencies
- None (this is the foundation)

## Acceptance
- `deno task dev` runs the CLI
- `coach init` creates config + db + library structure
- `coach --version` prints version
- All stub commands respond with "not yet implemented"
- Tests pass for: XDG resolution, config load/save, DB migrations, clipboard detection
