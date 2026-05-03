## Context

Change 01 delivered the Deno project foundation: config system, SQLite database with migrations (sessions, items, profile, FTS5 tables), XDG paths, clipboard, and CLI routing with stubs. The database schema exists but nothing writes to it yet. The library directory structure (`snippets/`, `tldr/`, `projects/`) is scaffolded by `coach init` but has no content management logic.

This change builds the shared storage layer that sits between the database/filesystem and all future skills. Every skill (ask, sandbox, project, review, explain, compare) will use this layer to save content, search the library, log sessions, and update the dashboard.

## Goals / Non-Goals

**Goals:**
- Single, reusable API for all content operations (save, read, delete, search)
- Typed frontmatter handling for snippets, TLDRs, and projects
- Bidirectional sync between filesystem and database index
- Fast search via FTS5 with combined filters
- Consistent save UX flow across all skills
- Auto-updating dashboard README

**Non-Goals:**
- Implementing any skill logic (changes 03–06)
- Remote sync or multi-device support
- Versioning/history of content changes
- Rich TUI prompts — we use simple stdin like change 01

## Decisions

### 1. Frontmatter format — YAML between `---` fences

**Choice**: Standard YAML frontmatter (`---\n...\n---\n`) as used by Jekyll, Hugo, Obsidian.

**Alternatives considered**:
- TOML frontmatter (`+++`): Less common, less tooling support
- JSON frontmatter: Harder to hand-edit
- Separate metadata file per item: More files to manage

**Rationale**: YAML frontmatter is the de facto standard for markdown metadata. Users can edit files in any editor and the metadata remains intact. `@std/yaml` already in our imports.

### 2. Slug generation — kebab-case from title with dedup

**Choice**: Convert title to kebab-case slug. If file exists, append `-2`, `-3`, etc.

**Rationale**: Simple, predictable, human-readable filenames. No UUID noise. Dedup suffix handles collisions.

### 3. DB sync strategy — write-through + rebuild

**Choice**: On every save/delete, immediately update the `items` table and FTS index (write-through). Provide a `rebuildIndex()` function that scans the filesystem and reconstructs the DB from frontmatter (for repair/recovery).

**Alternatives considered**:
- Lazy indexing on search: Slower searches, stale results
- Filesystem watcher: Complex, Deno support inconsistent
- DB as source of truth (no frontmatter): Loses human-readable files

**Rationale**: Write-through ensures consistency with zero lag. Rebuild covers edge cases (manual file edits, corruption). The item count will stay small (personal tool), so rebuild is fast.

### 4. Search API — composable filter object

**Choice**: Single `search(filters: SearchFilters)` function with optional fields:
```typescript
interface SearchFilters {
  query?: string;    // FTS5 full-text
  type?: ItemType;   // snippet | tldr | project
  lang?: string;
  tags?: string[];   // match any
  limit?: number;
}
```

**Rationale**: One function with composable filters is simpler than many specialized functions. Builds a single SQL query with optional WHERE clauses.

### 5. Save prompt — thin interactive wrapper

**Choice**: `savePrompt()` is a thin function that asks the user and calls library manager. It suggests a title and tags extracted from content, and the user confirms or edits.

**Rationale**: Keeps the storage layer pure (no I/O in core), with the interactive layer on top. Skills can also call the library manager directly for non-interactive saves.

## Risks / Trade-offs

- **[Risk] Manual file edits desync DB** → Mitigation: `rebuildIndex()` available; could add a `coach sync` command later.
- **[Risk] FTS5 content sync triggers** → Mitigation: Already set up in migration v4 (change 01); triggers handle insert/update/delete automatically.
- **[Trade-off] No file watching** → Acceptable: manual edits are rare; rebuild is fast.
- **[Trade-off] Simple stdin prompts** → Acceptable: consistency with change 01; can upgrade to TUI later.
