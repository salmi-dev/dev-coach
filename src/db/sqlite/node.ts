/**
 * SQLite adapter — Node.js implementation (placeholder).
 *
 * Stub so `deno check` can resolve the dynamic import in `./index.ts`. The
 * full implementation lands in Track B Group 5 (task 5.2): tries
 * `node:sqlite` (Node ≥ 22.5) first, falls back to `npm:better-sqlite3` with
 * a clear error if both fail.
 *
 * @module
 */

import type { Database } from './index.ts';

export function openDb(_path: string): Database {
  throw new Error(
    'SQLite adapter for Node is not yet implemented. ' +
      'This will be added in Track B (Group 5) of the boost-jsr-score-and-runtime-compat change. ' +
      'Until then, run dev-coach on Deno.',
  );
}
