/**
 * Database migration system.
 * Forward-only, versioned SQL migrations tracked in _migrations table.
 */

import { Database } from "@db/sqlite";

interface Migration {
  version: number;
  description: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Create sessions table",
    sql: `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        mode TEXT NOT NULL,
        lang TEXT,
        tags TEXT,
        query TEXT,
        duration_s INTEGER,
        saved_as TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(mode);
      CREATE INDEX IF NOT EXISTS idx_sessions_lang ON sessions(lang);
      CREATE INDEX IF NOT EXISTS idx_sessions_ts ON sessions(ts);
    `,
  },
  {
    version: 2,
    description: "Create items table",
    sql: `
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        lang TEXT,
        tags TEXT,
        created TEXT NOT NULL,
        updated TEXT,
        source_session INTEGER REFERENCES sessions(id)
      );
      CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
      CREATE INDEX IF NOT EXISTS idx_items_lang ON items(lang);
    `,
  },
  {
    version: 3,
    description: "Create profile table",
    sql: `
      CREATE TABLE IF NOT EXISTS profile (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `,
  },
  {
    version: 4,
    description: "Create FTS5 index on items",
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
        title,
        tags,
        content=items,
        content_rowid=id
      );

      CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
        INSERT INTO items_fts(rowid, title, tags) VALUES (new.id, new.title, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, title, tags) VALUES('delete', old.id, old.title, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, title, tags) VALUES('delete', old.id, old.title, old.tags);
        INSERT INTO items_fts(rowid, title, tags) VALUES (new.id, new.title, new.tags);
      END;
    `,
  },
];

/** Run all pending migrations. */
export function runMigrations(db: Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  // Get current version
  const row = db.prepare("SELECT MAX(version) as v FROM _migrations").get() as
    | { v: number | null }
    | undefined;
  const currentVersion = row?.v ?? 0;

  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.exec("BEGIN");
      try {
        db.exec(migration.sql);
        db.prepare("INSERT INTO _migrations (version, applied_at) VALUES (?, ?)").run(
          migration.version,
          new Date().toISOString(),
        );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw new Error(`Migration v${migration.version} (${migration.description}) failed: ${e}`);
      }
    }
  }
}

/** Get the list of defined migrations (for testing). */
export function getMigrations(): Migration[] {
  return [...MIGRATIONS];
}
