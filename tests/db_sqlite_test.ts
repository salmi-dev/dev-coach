/**
 * Deno entry-point for the cross-runtime SQLite-adapter tests.
 *
 * The test logic itself lives in `./_db_sqlite_cases.ts` (runtime-agnostic);
 * this file only registers each case with `Deno.test` and applies the
 * sanitizer overrides needed by `@db/sqlite`'s FFI driver.
 *
 * The Bun + Node entry point is `./cross-runtime/db_sqlite.test.ts`.
 */

import { cases } from './_db_sqlite_cases.ts';

// `@db/sqlite` loads libsqlite3 via Deno FFI; the dylib stays loaded
// process-wide which the resource sanitizer treats as a leak. Disable per
// test rather than holding a single shared connection — we want to actually
// exercise close().
const noSanitize = { sanitizeResources: false, sanitizeOps: false } as const;

for (const c of cases) {
  Deno.test({ ...noSanitize, name: c.name, fn: c.fn });
}

// Smoke-test the contract: Bun and Node entry-points both export an `openDb`
// function the dispatcher can call. The actual end-to-end behaviour is
// exercised by `tests/cross-runtime/db_sqlite.test.ts` under `bun test` and
// `node --test` in the Group 7 CI matrix.
Deno.test('Bun and Node SQLite modules export openDb()', async () => {
  const bun = await import('../src/db/sqlite/bun.ts');
  const node = await import('../src/db/sqlite/node.ts');
  if (typeof bun.openDb !== 'function') throw new Error('bun.openDb missing');
  if (typeof node.openDb !== 'function') throw new Error('node.openDb missing');
});
