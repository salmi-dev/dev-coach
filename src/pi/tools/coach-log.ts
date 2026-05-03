/**
 * coach-log — Pi custom tool for logging sessions.
 */

import { closeDb, getDb } from '../../db/connection.ts';
import { logSession } from '../../db/logger.ts';

/**
 * Append a session row for an agent-driven skill invocation.
 *
 * @param params Session metadata (mode, lang, tags, query, duration, saved path).
 * @returns `{ sessionId }` — the new row's primary key.
 */
export function coachLog(params: {
  mode: string;
  lang?: string;
  tags?: string[];
  query?: string;
  duration_s?: number;
  saved_as?: string;
}): { sessionId: number } {
  const db = getDb();
  try {
    const sessionId = logSession(db, params);
    return { sessionId };
  } finally {
    closeDb();
  }
}
