# Coach 02 — Storage Layer

## What
Build the shared storage layer that all skills use to save, search, and index content in the user's library.

## Scope

### Library Manager (`src/storage/library.ts`)
- CRUD operations for library items (snippets, tldrs, projects)
- Create language subdirectories on demand (`snippets/rust/`, `snippets/typescript/`)
- Slug generation from titles (kebab-case, dedup)
- File path resolution relative to configured `library_path`
- Ensure parent dirs exist before writing

### Frontmatter (`src/storage/frontmatter.ts`)
- Parse YAML frontmatter from markdown files
- Serialize frontmatter + content to markdown
- Typed interfaces for each item type:
  ```typescript
  interface SnippetFrontmatter {
    title: string;
    tags: string[];
    created: string; // ISO date
    source: string;  // which skill created it
    difficulty?: "beginner" | "intermediate" | "advanced";
    lang: string;
  }
  ```
- Similar for TLDR, Project frontmatter

### DB Index Sync (`src/storage/sync.ts`)
- After saving a file, upsert its metadata into `items` table
- After deleting, remove from `items`
- `rebuildIndex()` — scan library tree, rebuild `items` table from frontmatter
- Keep FTS index in sync

### Search (`src/storage/search.ts`)
- Search by tags: `searchByTags(["rust", "json"])`
- Search by text (FTS5): `searchText("parse json")`
- Search by type: `searchByType("snippet")`
- Search by language: `searchByLang("rust")`
- Combined filters
- Returns typed results with file paths

### Session Logger (`src/db/logger.ts`)
- `logSession(mode, lang, tags, query, duration_s, saved_as?)` — insert into `sessions`
- Called by every skill at end of interaction
- Auto-detect language from content/context

### Dashboard Generator (`src/storage/dashboard.ts`)
- Regenerate `library/README.md` from DB data
- Sections: Stats summary, Recent snippets, TLDRs, Projects
- Called after any save operation
- ASCII art header with stats

### Save Prompt Flow (`src/storage/save-prompt.ts`)
- Reusable "💾 Save as {type}? [Y/n]" prompt
- If yes: ask for title (suggest one), tags (suggest from content), difficulty
- Write file + update index
- "📋 Copy to clipboard? [Y/n]" for commands

## Dependencies
- Requires: `coach-01-project-foundation` (config, db, xdg, utils)

## Acceptance
- Can save a snippet to `~/dev-coach/snippets/rust/json-parse.md` with proper frontmatter
- Can search snippets by tag, text, language
- `library/README.md` updates after save
- Session logging works
- `rebuildIndex()` reconstructs DB from files
- Tests: frontmatter round-trip, search queries, slug generation, dashboard generation
