## 1. Frontmatter Module

- [x] 1.1 Create `src/storage/frontmatter.ts` — `parseFrontmatter(content)` returning `{ metadata, body }`, handling files with and without frontmatter
- [x] 1.2 Implement `serializeFrontmatter(metadata, body)` producing `---\n...\n---\n\n{body}` format
- [x] 1.3 Define typed interfaces: `SnippetFrontmatter`, `TldrFrontmatter`, `ProjectFrontmatter`, `BaseFrontmatter`
- [x] 1.4 Write tests for frontmatter parse/serialize roundtrip, missing frontmatter, special characters in YAML

## 2. Library Manager

- [x] 2.1 Create `src/storage/library.ts` — `toSlug(title)` kebab-case converter with dedup suffix (`-2`, `-3`)
- [x] 2.2 Implement `getItemPath(type, metadata)` — resolve file path based on type (snippet→`snippets/{lang}/`, tldr→`tldr/`, project→`projects/{slug}/`)
- [x] 2.3 Implement `saveItem(type, content, metadata)` — write markdown with frontmatter, create parent dirs on demand
- [x] 2.4 Implement `readItem(relativePath)` — read file, parse frontmatter, return `{ metadata, content }`
- [x] 2.5 Implement `deleteItem(relativePath)` — remove file and DB index entry
- [x] 2.6 Implement `listItems(type?)` — query `items` table, return typed results with paths
- [x] 2.7 Write tests for slug generation (basic, dedup, special chars), saveItem, readItem, deleteItem

## 3. DB Index Sync

- [x] 3.1 Create `src/storage/sync.ts` — `indexItem(db, type, metadata, relativePath, sessionId?)` to upsert row in `items` table
- [x] 3.2 Implement `removeIndex(db, relativePath)` to delete row from `items` table
- [x] 3.3 Implement `rebuildIndex(db, libraryPath)` — scan all `.md` files in library, parse frontmatter, clear and repopulate `items` table
- [x] 3.4 Wire `indexItem` into `saveItem()` and `removeIndex` into `deleteItem()`
- [x] 3.5 Write tests for index upsert, removal, full rebuild, FTS sync verification

## 4. Search

- [x] 4.1 Create `src/storage/search.ts` — define `SearchFilters` interface and `SearchResult` type
- [x] 4.2 Implement `search(db, filters)` — build SQL query with optional WHERE clauses for type, lang, tags, FTS query, and limit
- [x] 4.3 Write tests for search by text (FTS), type filter, lang filter, tag filter, combined filters, limit, empty results

## 5. Session Logger

- [x] 5.1 Create `src/db/logger.ts` — `logSession(db, params)` inserting row into `sessions` table, returning inserted ID
- [x] 5.2 Write tests for session logging (all fields, optional fields, returned ID)

## 6. Dashboard Generator

- [x] 6.1 Create `src/storage/dashboard.ts` — `regenerateDashboard(db, libraryPath)` querying items/sessions and writing README.md
- [x] 6.2 Implement dashboard sections: ASCII header, stats summary, recent snippets (last 5), TLDRs list, projects list with relative links
- [x] 6.3 Wire dashboard regeneration into `saveItem()` (auto-regenerate after save)
- [x] 6.4 Write tests for dashboard generation (with content, empty library, stats accuracy)

## 7. Save Prompt Flow

- [x] 7.1 Create `src/storage/save-prompt.ts` — `savePrompt(type, suggestedTitle, suggestedTags, content)` with interactive Y/n, title edit, tag edit
- [x] 7.2 Implement clipboard copy prompt: "📋 Copy to clipboard? [Y/n]" using `copyToClipboard()`
- [x] 7.3 Wire together: save prompt → saveItem → indexItem → regenerateDashboard
- [x] 7.4 Write tests for non-interactive save path (direct `saveItem` without prompts)

## 8. Integration & Verification

- [x] 8.1 Verify end-to-end: save snippet → appears in DB → searchable via FTS → listed in dashboard
- [x] 8.2 Verify `rebuildIndex()` reconstructs DB from filesystem files
- [x] 8.3 Verify deleteItem removes file + DB entry + updates dashboard
- [x] 8.4 Run full test suite: `deno test`
