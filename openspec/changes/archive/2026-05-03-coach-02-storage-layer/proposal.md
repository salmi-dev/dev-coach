## Why

Change 01 built the project foundation (config, DB, XDG, CLI), but skills have no way to persist content. Every skill needs to save snippets, TLDRs, and projects to the user's library, search existing items, log sessions, and keep the dashboard up to date. Without a shared storage layer, each skill would duplicate file I/O, frontmatter handling, and DB sync logic. This change creates the single source of truth for all content operations.

## What Changes

- **New `src/storage/` module** — Library manager for CRUD operations on snippets, TLDRs, and projects with automatic language-subfolder creation and slug generation
- **Frontmatter parser/serializer** — Parse YAML frontmatter from markdown files and serialize typed frontmatter back to markdown
- **DB index sync** — Upsert item metadata to `items` table after saves, rebuild index from filesystem, keep FTS5 in sync
- **Search engine** — Query items by tags, full-text, type, language, or combined filters via FTS5 and SQL
- **Session logger** — `logSession()` function for all skills to record activity to `sessions` table
- **Dashboard generator** — Regenerate `library/README.md` with stats, recent items, and project list from DB data
- **Save prompt flow** — Reusable interactive "Save as...?" + "Copy to clipboard?" prompt used by all skills

## Capabilities

### New Capabilities

- `library-manager`: CRUD operations for library items (snippets, TLDRs, projects) with slug generation, language subfolders, and path resolution
- `frontmatter`: YAML frontmatter parsing and serialization for markdown files with typed interfaces per item type
- `db-index-sync`: Bidirectional sync between filesystem markdown files and SQLite `items` table including FTS5 index
- `search`: Query library items by tags, full-text (FTS5), type, language, and combined filters
- `session-logger`: Record skill interactions to the `sessions` table with mode, language, tags, and duration
- `dashboard-generator`: Regenerate `library/README.md` with stats summary, recent snippets, TLDRs, and projects from DB
- `save-prompt`: Reusable interactive save flow — title suggestion, tag input, difficulty selection, clipboard copy

### Modified Capabilities

(none)

## Impact

- **New files**: `src/storage/` module (7 files), `src/db/logger.ts`
- **Dependencies**: Uses existing `src/db/`, `src/config/`, `src/utils/` from change 01
- **Database**: Reads/writes `items`, `sessions`, `items_fts` tables
- **Filesystem**: Reads/writes markdown files in `{library_path}/snippets/`, `tldr/`, `projects/`
