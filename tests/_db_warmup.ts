/**
 * Test-only helper: pre-warm the SQLite FFI dylib at module load.
 *
 * `@db/sqlite` loads `libsqlite3` via Deno FFI on first use. Loading the
 * dylib during a test trips Deno's resource sanitizer (it stays loaded
 * process-wide and can't be unloaded). Since we now route all DB access
 * through {@link openDb} (which dynamic-imports the per-runtime adapter),
 * the very first test to call `getDb()` / `openDb()` triggers the load
 * inside the test and fails.
 *
 * Importing this module from a test file forces the dylib load during
 * module evaluation — *before* the first test starts — so subsequent
 * test bodies don't see the load as a leak.
 *
 * Use:
 * ```ts
 * import './_db_warmup.ts';
 * ```
 *
 * @module
 */

import { openDb } from '../src/db/sqlite/index.ts';

const _warmup = await openDb(':memory:');
_warmup.close();
