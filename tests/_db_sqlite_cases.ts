/**
 * Shared SQLite-adapter test cases — runtime-agnostic.
 *
 * Each entry is a `{ name, fn }` pair where `fn` exercises the public adapter
 * surface (`openDb`, `Database`, `Statement`) without any runtime-specific
 * test API. Three thin entry points register these with the host's test
 * runner:
 *
 * - `tests/db_sqlite_test.ts`               — Deno (`Deno.test`)
 * - `tests/cross-runtime/db_sqlite.test.ts` — Bun + Node (`node:test`)
 *
 * Adding a case here automatically runs it on every supported runtime once
 * the CI matrix from Group 7 of boost-jsr-score-and-runtime-compat is wired
 * up. Use plain throws / `if`-checks for assertions so we don't depend on a
 * particular `assert` library.
 *
 * @module
 */

import { openDb } from '../src/db/sqlite/index.ts';

function assertEq(a: unknown, b: unknown, msg?: string) {
  if (a !== b) {
    throw new Error(
      `assertEq failed${msg ? ` (${msg})` : ''}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`,
    );
  }
}

function assertDeepEq(a: unknown, b: unknown, msg?: string) {
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  if (ja !== jb) {
    throw new Error(`assertDeepEq failed${msg ? ` (${msg})` : ''}: ${ja} !== ${jb}`);
  }
}

function assertTrue(v: unknown, msg?: string) {
  if (!v) {
    throw new Error(`assertTrue failed${msg ? ` (${msg})` : ''}`);
  }
}

async function assertThrowsAsync(
  fn: () => unknown,
  matcher: string,
  msg?: string,
): Promise<void> {
  let threw = false;
  let err: unknown;
  try {
    await fn();
  } catch (e) {
    threw = true;
    err = e;
  }
  if (!threw) {
    throw new Error(`expected to throw${msg ? ` (${msg})` : ''}, but did not`);
  }
  const m = (err instanceof Error ? err.message : String(err)) ?? '';
  if (!m.includes(matcher)) {
    throw new Error(
      `error message mismatch${msg ? ` (${msg})` : ''}: expected to include "${matcher}", got "${m}"`,
    );
  }
}

/** A single test case in the cross-runtime suite. */
export interface DbCase {
  name: string;
  fn: () => Promise<void>;
}

export const cases: DbCase[] = [
  {
    name: 'openDb opens an in-memory database and close() releases it',
    async fn() {
      const db = await openDb(':memory:');
      db.close();
    },
  },
  {
    name: 'exec creates schema; prepare/run/all/get round-trip',
    async fn() {
      const db = await openDb(':memory:');
      try {
        db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');

        const insert = db.prepare('INSERT INTO t (name) VALUES (?)');
        const r1 = insert.run('alice');
        const r2 = insert.run('bob');
        assertEq(r1.changes, 1, 'r1.changes');
        assertEq(r2.changes, 1, 'r2.changes');

        const all = db.prepare('SELECT id, name FROM t ORDER BY id').all<{
          id: number;
          name: string;
        }>();
        assertEq(all.length, 2, 'all.length');
        assertEq(all[0].name, 'alice');
        assertEq(all[1].name, 'bob');

        const one = db.prepare('SELECT name FROM t WHERE id = ?').get<{ name: string }>(1);
        assertEq(one?.name, 'alice');

        const none = db
          .prepare('SELECT name FROM t WHERE id = ?')
          .get<{ name: string }>(999);
        assertEq(none, undefined, 'none');
      } finally {
        db.close();
      }
    },
  },
  {
    name: 'one-shot db.run/all/get mirror the prepared-statement versions',
    async fn() {
      const db = await openDb(':memory:');
      try {
        db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
        db.run('INSERT INTO t (name) VALUES (?)', 'alice');
        db.run('INSERT INTO t (name) VALUES (?)', 'bob');

        const all = db.all<{ name: string }>('SELECT name FROM t ORDER BY name');
        assertDeepEq(all.map((r) => r.name), ['alice', 'bob']);

        const one = db.get<{ name: string }>('SELECT name FROM t WHERE id = ?', 2);
        assertEq(one?.name, 'bob');
      } finally {
        db.close();
      }
    },
  },
  {
    name: 'transaction commits on success and returns fn result',
    async fn() {
      const db = await openDb(':memory:');
      try {
        db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');

        const result = db.transaction(() => {
          db.run('INSERT INTO t (name) VALUES (?)', 'a');
          db.run('INSERT INTO t (name) VALUES (?)', 'b');
          return 42;
        });

        assertEq(result, 42);
        const count = db.get<{ c: number }>('SELECT COUNT(*) AS c FROM t');
        assertEq(count?.c, 2);
      } finally {
        db.close();
      }
    },
  },
  {
    name: 'transaction rolls back on throw and propagates the error',
    async fn() {
      const db = await openDb(':memory:');
      try {
        db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
        db.run('INSERT INTO t (name) VALUES (?)', 'preexisting');

        await assertThrowsAsync(
          () =>
            db.transaction(() => {
              db.run('INSERT INTO t (name) VALUES (?)', 'should-not-survive');
              throw new Error('boom');
            }),
          'boom',
        );

        const all = db.all<{ name: string }>('SELECT name FROM t');
        assertDeepEq(all.map((r) => r.name), ['preexisting']);
      } finally {
        db.close();
      }
    },
  },
  {
    name: 'openDb resolves to a usable Database with prepare()',
    async fn() {
      const db = await openDb(':memory:');
      assertTrue(typeof db.prepare === 'function');
      db.close();
    },
  },
];
