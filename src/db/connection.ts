/**
 * SQLite database connection management.
 */

import { Database } from "@db/sqlite";
import { join } from "@std/path";
import { getDataDir } from "../utils/xdg.ts";
import { runMigrations } from "./migrations.ts";

const DB_FILENAME = "coach.db";

let _db: Database | null = null;

/** Get or create the database connection. Runs migrations on first connect. */
export function getDb(dataDir?: string): Database {
  if (_db) return _db;

  const dir = dataDir ?? getDataDir();
  Deno.mkdirSync(dir, { recursive: true });

  const dbPath = join(dir, DB_FILENAME);
  _db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  _db.exec("PRAGMA journal_mode=WAL");

  runMigrations(_db);
  return _db;
}

/** Close the database connection. */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
