## MODIFIED Requirements

### Requirement: Database location and connection

The system SHALL store the SQLite database at `{data_dir}/coach.db`. The system SHALL provide a `getDb()` function that returns a connected `Database` instance
from the runtime-agnostic SQLite adapter (see `runtime-compat`), creating the file if it does not exist.

The returned `Database` SHALL conform to the adapter's interface (`prepare`, `run`, `all`, `get`, `transaction`, `close`) regardless of the underlying driver
(`@db/sqlite` on Deno, `bun:sqlite` on Bun, `node:sqlite` or `better-sqlite3` on Node).

#### Scenario: Database creation on first run

- **WHEN** `getDb()` is called and `coach.db` does not exist
- **THEN** the system SHALL create the database file and run all migrations

#### Scenario: Database connection on subsequent runs

- **WHEN** `getDb()` is called and `coach.db` exists
- **THEN** the system SHALL open the existing database and run any pending migrations

#### Scenario: Same call signature on every supported runtime

- **WHEN** `getDb()` is called on Deno, Bun, or Node
- **THEN** the returned object SHALL implement the adapter interface
- **AND** the rest of the codebase SHALL NOT need runtime-specific branching to use it
