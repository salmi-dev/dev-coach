/**
 * Session logger — record skill interactions to the sessions table.
 */

import { Database } from "@db/sqlite";

export interface LogSessionParams {
  mode: string;
  lang?: string;
  tags?: string[];
  query?: string;
  duration_s?: number;
  saved_as?: string;
}

/**
 * Log a session to the `sessions` table. Returns the inserted session ID.
 */
export function logSession(db: Database, params: LogSessionParams): number {
  const stmt = db.prepare(
    `INSERT INTO sessions (ts, mode, lang, tags, query, duration_s, saved_as)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  stmt.run(
    new Date().toISOString(),
    params.mode,
    params.lang ?? null,
    params.tags ? JSON.stringify(params.tags) : null,
    params.query ?? null,
    params.duration_s ?? null,
    params.saved_as ?? null,
  );

  // Get the last inserted row ID
  const row = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };
  return row.id;
}
