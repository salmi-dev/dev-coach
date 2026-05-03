## 1. Deno Project Scaffold

- [x] 1.1 Create `deno.json` with tasks (dev, build, install, test), imports map, JSR publish config (`jsr:@ssal/dev-coach`)
- [x] 1.2 Create `cli.ts` entry point with shebang and basic arg parsing
- [x] 1.3 Create `mod.ts` library entry point exporting public API
- [x] 1.4 Create directory structure: `src/utils/`, `src/config/`, `src/db/`, `src/skills/`

## 2. Platform & XDG Utilities

- [x] 2.1 Implement `src/utils/platform.ts` — `getOS()`, `getHomeDir()`, `isInteractive()` functions
- [x] 2.2 Implement `src/utils/xdg.ts` — `getConfigDir()`, `getDataDir()`, `getLibraryPath(config)` with XDG resolution, tilde expansion, and Windows fallbacks
- [x] 2.3 Write tests for XDG path resolution (set/unset env vars, OS variants)

## 3. Config System

- [x] 3.1 Define config TypeScript interface and defaults in `src/config/schema.ts`
- [x] 3.2 Implement `src/config/config.ts` — `loadConfig()`, `saveConfig()`, `validateConfig()` with YAML parse/serialize and default merging
- [x] 3.3 Write tests for config load (existing file, missing file, partial config, invalid values)

## 4. SQLite Database

- [x] 4.1 Implement `src/db/connection.ts` — `getDb()` function that opens/creates `coach.db` at data dir
- [x] 4.2 Implement `src/db/migrations.ts` — migration runner with `_migrations` table tracking, forward-only versioned execution
- [x] 4.3 Create migration v1: `sessions` table (id, ts, mode, lang, tags, query, duration_s, saved_as)
- [x] 4.4 Create migration v2: `items` table (id, type, title, path, lang, tags, created, updated, source_session FK)
- [x] 4.5 Create migration v3: `profile` table (key PK, value JSON)
- [x] 4.6 Create migration v4: `items_fts` FTS5 virtual table on items (title, tags)
- [x] 4.7 Write tests for migration system (fresh db, pending migrations, idempotent re-run)

## 5. Core Utils

- [x] 5.1 Implement `src/utils/clipboard.ts` — `detectClipboardTool()` and `copyToClipboard(text)` with OS-aware command selection
- [x] 5.2 Implement `src/utils/ascii.ts` — `renderBox(title, lines)` with box-drawing characters, `SKILL_ICONS` constant map for all 7 modes
- [x] 5.3 Write tests for clipboard detection (mock command availability) and ASCII box rendering

## 6. CLI Router

- [x] 6.1 Implement CLI argument parsing in `cli.ts` — extract subcommand, global flags (`--help`, `--version`, `--config`)
- [x] 6.2 Implement subcommand dispatch — route to handler functions for: init, ask, explain, compare, sandbox, review, project, stats
- [x] 6.3 Implement stub handlers for all skill commands (print icon + "not yet implemented")
- [x] 6.4 Implement `--version` (read from `deno.json`), `--help` (list subcommands with descriptions), unknown command error
- [x] 6.5 Write tests for CLI routing (valid command, unknown command, no args, flags)

## 7. Coach Init Command

- [x] 7.1 Implement interactive prompts in `src/skills/init.ts` — language multi-select, frameworks input, style choice, library path input
- [x] 7.2 Implement directory scaffolding — create config dir, data dir, library dir with `snippets/`, `tldr/`, `projects/`
- [x] 7.3 Implement initial `README.md` dashboard template generation in library root
- [x] 7.4 Implement ASCII welcome banner and completion summary
- [x] 7.5 Implement re-init guard — detect existing config, prompt for confirmation, support `--force` flag
- [x] 7.6 Wire init command: prompts → saveConfig → getDb (triggers migrations) → scaffold dirs → write README → print summary
- [x] 7.7 Write tests for init (directory creation, config writing, re-init guard)

## 8. Integration & Verification

- [x] 8.1 Verify `deno task dev` runs the CLI successfully
- [x] 8.2 Verify `coach init` end-to-end: creates config.yaml, coach.db, library dirs, README.md
- [x] 8.3 Verify `coach --version` and `coach --help` output correctly
- [x] 8.4 Verify all stub commands print their icon and "not yet implemented"
- [x] 8.5 Run full test suite: `deno test`
