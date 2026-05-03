/**
 * Cross-runtime SQLite-adapter test entry-point — Bun and Node.
 *
 * Uses `node:test`, the standard Node test runner. Bun ≥ 1.1 supports
 * `node:test` natively, so this single file runs on both:
 *
 * ```bash
 * # On Node ≥ 22 (use --experimental-sqlite for node:sqlite on 22.x):
 * node --test --experimental-strip-types tests/cross-runtime/db_sqlite.test.ts
 *
 * # On Bun:
 * bun test tests/cross-runtime/db_sqlite.test.ts
 * ```
 *
 * The Group 7 CI matrix wires both up. The test logic itself lives in
 * `../_db_sqlite_cases.ts` (runtime-agnostic); this file only registers each
 * case with the host's test runner.
 *
 * @module
 */

import { test } from 'node:test';
import { cases } from '../_db_sqlite_cases.ts';

for (const c of cases) {
  test(c.name, c.fn);
}
