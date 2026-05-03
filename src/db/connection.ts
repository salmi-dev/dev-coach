/**
 * SQLite database connection management.
 *
 * Uses the {@link openDb} adapter from `./sqlite/index.ts` so the chosen
 * driver matches the host runtime: `@db/sqlite` on Deno, `bun:sqlite` on
 * Bun, `node:sqlite` (or `better-sqlite3` fallback) on Node. The rest of
 * the codebase only sees the {@link Database} interface; no host-specific
 * imports leak past this module.
 */

import { join } from '@std/path';
import { runtime } from '../utils/runtime/index.ts';
import { type Database, openDb } from './sqlite/index.ts';
import { getDataDir } from '../utils/xdg.ts';
import { runMigrations } from './migrations.ts';

const DB_FILENAME = 'coach.db';

let _db: Database | null = null;

/**
 * Get or create the database connection. Runs migrations on first connect.
 *
 * Async because {@link openDb} dynamic-imports the per-runtime SQLite adapter;
 * the directory creation is also async via {@link runtime.mkdir}.
 *
 * @param dataDir Optional directory override (mainly for tests). Defaults to
 *   the platform's XDG data dir.
 */
export async function getDb(dataDir?: string): Promise<Database> {
  if (_db) return _db;

  const dir = dataDir ?? getDataDir();
  await runtime.mkdir(dir, { recursive: true });

  const dbPath = join(dir, DB_FILENAME);
  _db = await openDb(dbPath);

  // Enable WAL mode for better concurrent access
  _db.exec('PRAGMA journal_mode=WAL');

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
