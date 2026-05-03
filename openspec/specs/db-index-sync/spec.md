## ADDED Requirements

### Requirement: Upsert item to DB after save

The system SHALL insert or update the `items` table row whenever a library item is saved to disk. The row SHALL include type, title, path (relative to library),
lang, tags (JSON), created, updated, and source_session.

#### Scenario: New item indexed on save

- **WHEN** a new snippet is saved to disk
- **THEN** a corresponding row SHALL exist in the `items` table with matching title, path, and tags

#### Scenario: Updated item re-indexed

- **WHEN** an existing snippet is overwritten with new tags
- **THEN** the `items` row SHALL reflect the updated tags and `updated` timestamp

### Requirement: Remove item from DB after delete

The system SHALL delete the `items` table row when a library item is deleted from disk.

#### Scenario: Deleted item removed from index

- **WHEN** a snippet file is deleted via `deleteItem()`
- **THEN** no row for that path SHALL exist in the `items` table

### Requirement: Rebuild index from filesystem

The system SHALL provide a `rebuildIndex()` function that scans all markdown files in the library, parses their frontmatter, and reconstructs the `items` table.
Existing rows SHALL be cleared before rebuild.

#### Scenario: Rebuild after manual file changes

- **WHEN** a user manually adds a snippet file and runs `rebuildIndex()`
- **THEN** the new file SHALL appear in the `items` table

#### Scenario: Rebuild removes stale entries

- **WHEN** a user manually deletes a snippet file and runs `rebuildIndex()`
- **THEN** the stale row SHALL no longer exist in the `items` table

### Requirement: FTS index stays in sync

The FTS5 virtual table `items_fts` SHALL be updated automatically via SQLite triggers when `items` rows are inserted, updated, or deleted.

#### Scenario: FTS reflects new item

- **WHEN** an item with title "Parse JSON" is saved
- **THEN** a FTS query for "json" SHALL return that item
