## ADDED Requirements

### Requirement: Database location and connection

The system SHALL store the SQLite database at `{data_dir}/coach.db`. The system SHALL provide a `getDb()` function that returns a connected database instance,
creating the file if it does not exist.

#### Scenario: Database creation on first run

- **WHEN** `getDb()` is called and `coach.db` does not exist
- **THEN** the system SHALL create the database file and run all migrations

#### Scenario: Database connection on subsequent runs

- **WHEN** `getDb()` is called and `coach.db` exists
- **THEN** the system SHALL open the existing database and run any pending migrations

### Requirement: Migration system

The system SHALL track applied migrations in a `_migrations` table with columns `version` (integer) and `applied_at` (text). On startup, the system SHALL
execute any migrations with version greater than the last applied version. Migrations SHALL be forward-only (no rollback).

#### Scenario: First migration run

- **WHEN** the database has no `_migrations` table
- **THEN** the system SHALL create `_migrations` and run all defined migrations in order

#### Scenario: Pending migrations exist

- **WHEN** the database has migrations up to version 2 and code defines versions 1–4
- **THEN** the system SHALL run migrations 3 and 4 in order

#### Scenario: No pending migrations

- **WHEN** all defined migrations have been applied
- **THEN** the system SHALL skip migration execution and return the connection

### Requirement: Initial schema — sessions table

The system SHALL create a `sessions` table with columns: `id` (integer primary key), `ts` (text, ISO 8601, not null), `mode` (text, not null), `lang` (text),
`tags` (text, JSON array), `query` (text), `duration_s` (integer), `saved_as` (text).

#### Scenario: Insert a session record

- **WHEN** a session is logged with mode="ask", lang="rust", tags=["json"]
- **THEN** the record SHALL be retrievable with all fields intact including JSON-parsed tags

### Requirement: Initial schema — items table

The system SHALL create an `items` table with columns: `id` (integer primary key), `type` (text, not null), `title` (text, not null), `path` (text, not null),
`lang` (text), `tags` (text, JSON array), `created` (text, not null), `updated` (text), `source_session` (integer, foreign key to sessions.id).

#### Scenario: Insert and retrieve an item

- **WHEN** an item is inserted with type="snippet", title="JSON Parse", lang="rust"
- **THEN** the record SHALL be retrievable by id, type, or lang

### Requirement: Initial schema — profile table

The system SHALL create a `profile` table with columns: `key` (text primary key), `value` (text, JSON). This stores computed profile data as key-value pairs.

#### Scenario: Store and retrieve profile data

- **WHEN** profile key "primary_languages" is set to `["typescript","rust"]`
- **THEN** `value` SHALL be retrievable and parseable as a JSON string array

### Requirement: FTS5 full-text search index

The system SHALL create an FTS5 virtual table `items_fts` on the `items` table, indexing the `title` and `tags` columns.

#### Scenario: Full-text search finds matching items

- **WHEN** an item with title "Parse JSON with Serde" exists
- **THEN** a FTS query for "serde" SHALL return that item

#### Scenario: Full-text search returns no results for non-matching query

- **WHEN** no items contain the word "kubernetes"
- **THEN** a FTS query for "kubernetes" SHALL return an empty result set
