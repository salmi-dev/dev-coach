/**
 * SQLite adapter — Bun implementation.
 *
 * Wraps Bun's built-in `bun:sqlite` to match the {@link Database} interface
 * from `./index.ts`. Loaded only when {@link runtime.name} is `"bun"`.
 *
 * `bun:sqlite` ships with Bun (no install required) and offers a sync API
 * close to `better-sqlite3` — `prepare`/`run`/`all`/`get`/`exec`/`close` are
 * straight pass-throughs. Transactions use `BEGIN/COMMIT/ROLLBACK` via `exec`
 * for parity with the Deno adapter.
 *
 * @module
 */

import type { Database, RunResult, Statement } from './index.ts';

// `bun:sqlite` is only resolvable on Bun. On Deno's typechecker it is unknown,
// so we dynamic-import and erase types at the boundary; downstream code sees
// only the typed Database/Statement shapes.

// deno-lint-ignore no-explicit-any
type Any = any;

class BunStatement implements Statement {
  constructor(private readonly stmt: Any) {}

  run(...params: unknown[]): RunResult {
    const result = this.stmt.run(...params);
    return {
      changes: typeof result?.changes === 'number' ? result.changes : 0,
      lastInsertRowid: result?.lastInsertRowid ?? 0,
    };
  }

  all<T = unknown>(...params: unknown[]): T[] {
    return this.stmt.all(...params) as T[];
  }

  get<T = unknown>(...params: unknown[]): T | undefined {
    return this.stmt.get(...params) as T | undefined;
  }
}

class BunDatabase implements Database {
  constructor(private readonly db: Any) {}

  prepare(sql: string): Statement {
    return new BunStatement(this.db.prepare(sql));
  }

  exec(sql: string): void {
    // bun:sqlite Database has both .exec() and .run() for raw SQL; .exec() runs
    // multi-statement strings, which matches our usage (PRAGMA + DDL + triggers).
    this.db.exec(sql);
  }

  run(sql: string, ...params: unknown[]): RunResult {
    const result = this.db.prepare(sql).run(...params);
    return {
      changes: typeof result?.changes === 'number' ? result.changes : 0,
      lastInsertRowid: result?.lastInsertRowid ?? 0,
    };
  }

  all<T = unknown>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }
}

/** Open a SQLite database on Bun using `bun:sqlite`. */
export async function openDb(path: string): Promise<Database> {
  const mod = (await import('bun:sqlite' as Any)) as Any;
  // bun:sqlite's default export and named export are both the Database class.
  const Sqlite = mod.Database ?? mod.default;
  return new BunDatabase(new Sqlite(path));
}
