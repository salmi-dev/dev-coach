import { assert, assertEquals, assertThrows } from '@std/assert';
import { openDb } from '../src/db/sqlite/index.ts';

// Every test in this file opens an in-memory SQLite database via @db/sqlite.
// That driver loads libsqlite3 as a dynamic library on first use; the library
// stays loaded for the lifetime of the Deno process (this is normal FFI
// behaviour). Deno's resource sanitizer flags the dylib as a leak even after
// db.close(), so we disable the sanitizers per-test rather than holding a
// single shared connection (we want to actually test close()).

const noSanitize = { sanitizeResources: false, sanitizeOps: false } as const;

function freshDb() {
  return openDb(':memory:');
}

Deno.test({
  ...noSanitize,
  name: 'openDb opens an in-memory database and close() releases it',
  async fn() {
    const db = await freshDb();
    db.close();
  },
});

Deno.test({
  ...noSanitize,
  name: 'exec creates schema; prepare/run/all/get round-trip',
  async fn() {
    const db = await freshDb();
    try {
      db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');

      const insert = db.prepare('INSERT INTO t (name) VALUES (?)');
      const r1 = insert.run('alice');
      const r2 = insert.run('bob');
      assertEquals(r1.changes, 1);
      assertEquals(r2.changes, 1);

      const all = db
        .prepare('SELECT id, name FROM t ORDER BY id')
        .all<{ id: number; name: string }>();
      assertEquals(all.length, 2);
      assertEquals(all[0].name, 'alice');
      assertEquals(all[1].name, 'bob');

      const one = db
        .prepare('SELECT name FROM t WHERE id = ?')
        .get<{ name: string }>(1);
      assertEquals(one?.name, 'alice');

      const none = db
        .prepare('SELECT name FROM t WHERE id = ?')
        .get<{ name: string }>(999);
      assertEquals(none, undefined);
    } finally {
      db.close();
    }
  },
});

Deno.test({
  ...noSanitize,
  name: 'one-shot db.run/all/get mirror the prepared-statement versions',
  async fn() {
    const db = await freshDb();
    try {
      db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      db.run('INSERT INTO t (name) VALUES (?)', 'alice');
      db.run('INSERT INTO t (name) VALUES (?)', 'bob');

      const all = db.all<{ name: string }>('SELECT name FROM t ORDER BY name');
      assertEquals(all.map((r) => r.name), ['alice', 'bob']);

      const one = db.get<{ name: string }>(
        'SELECT name FROM t WHERE id = ?',
        2,
      );
      assertEquals(one?.name, 'bob');
    } finally {
      db.close();
    }
  },
});

Deno.test({
  ...noSanitize,
  name: 'transaction commits on success and returns fn result',
  async fn() {
    const db = await freshDb();
    try {
      db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');

      const result = db.transaction(() => {
        db.run('INSERT INTO t (name) VALUES (?)', 'a');
        db.run('INSERT INTO t (name) VALUES (?)', 'b');
        return 42;
      });

      assertEquals(result, 42);
      const count = db.get<{ c: number }>('SELECT COUNT(*) AS c FROM t');
      assertEquals(count?.c, 2);
    } finally {
      db.close();
    }
  },
});

Deno.test({
  ...noSanitize,
  name: 'transaction rolls back on throw and propagates the error',
  async fn() {
    const db = await freshDb();
    try {
      db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
      db.run('INSERT INTO t (name) VALUES (?)', 'preexisting');

      assertThrows(
        () =>
          db.transaction(() => {
            db.run('INSERT INTO t (name) VALUES (?)', 'should-not-survive');
            throw new Error('boom');
          }),
        Error,
        'boom',
      );

      const all = db.all<{ name: string }>('SELECT name FROM t');
      assertEquals(all.map((r) => r.name), ['preexisting']);
    } finally {
      db.close();
    }
  },
});

Deno.test('Bun and Node SQLite stubs throw a clear "not yet implemented" error', async () => {
  // The dispatcher in openDb() wouldn't take these branches on a Deno host,
  // but we hit the stub modules directly to lock in their public contract.
  // No FFI is loaded by the stubs themselves, so default sanitizers are fine.
  const bunStub = await import('../src/db/sqlite/bun.ts');
  assertThrows(() => bunStub.openDb(':memory:'), Error, 'not yet implemented');

  const nodeStub = await import('../src/db/sqlite/node.ts');
  assertThrows(() => nodeStub.openDb(':memory:'), Error, 'not yet implemented');
});

Deno.test({
  ...noSanitize,
  name: 'openDb resolves to a usable Database on Deno',
  async fn() {
    const db = await openDb(':memory:');
    assert(typeof db.prepare === 'function');
    db.close();
  },
});
