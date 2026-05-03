## Why

Dev Coach has no codebase yet — it's a concept described in a README. To build an AI-powered coaching CLI with 7 skills (ask, explain, compare, sandbox, review, project, stats), we need a solid foundation: a Deno project with configuration management, database, XDG-compliant paths, and core utilities. This is change 01 of 06 — everything else depends on it.

## What Changes

- **New Deno project** with `deno.json`, entry points (`cli.ts`, `mod.ts`), JSR publish config (`jsr:@ssal/dev-coach`)
- **XDG path resolution** for config (`~/.config/dev-coach/`) and data (`~/.local/share/dev-coach/`), with configurable library path (default `~/dev-coach/`)
- **Configuration system** — YAML-based config with typed schema: languages, frameworks, response style, library path, OS detection
- **SQLite database** — `coach.db` with migrations, tables for sessions, items, profile, and FTS5 full-text search
- **`coach init` command** — interactive first-run setup that creates config, database, and library directory tree
- **CLI router** — subcommand dispatch with `--help`, `--version`, `--config` flags; skill commands as stubs
- **Core utilities** — OS-aware clipboard (pbcopy/xclip/wl-copy/clip), ASCII art helpers, platform detection

## Capabilities

### New Capabilities

- `xdg-paths`: XDG Base Directory resolution for config, data, and user library paths across macOS/Linux/Windows
- `config-management`: YAML config loading, saving, validation with typed schema and defaults
- `sqlite-database`: SQLite connection management, versioned migrations, typed query helpers, FTS5 search index
- `cli-router`: Subcommand routing, global flags, version/help display, stub delegation to skill modules
- `coach-init`: Interactive first-run setup flow — language selection, framework input, style choice, directory scaffolding
- `core-utils`: Clipboard integration, ASCII art rendering, platform/OS detection utilities

### Modified Capabilities

(none — greenfield project)

## Impact

- **New files**: Entire Deno project structure under project root (`deno.json`, `cli.ts`, `mod.ts`, `src/`)
- **Dependencies**: `jsr:@db/sqlite`, `jsr:@std/path`, `jsr:@std/yaml`, `jsr:@std/cli`
- **Filesystem**: Creates `~/.config/dev-coach/`, `~/.local/share/dev-coach/`, `~/dev-coach/` on `coach init`
- **Database**: Creates `coach.db` with 3 tables + FTS virtual table
