/**
 * SQLite adapter — public surface.
 *
 * Wraps the per-runtime SQLite driver behind a single, minimal interface
 * matching exactly the surface dev-coach uses today:
 *
 * ```text
 * Database:  prepare, exec, run, all, get, transaction, close
 * Statement: run, all, get
 * ```
 *
 * Per-runtime drivers (loaded lazily by {@link openDb}):
 *
 * | Runtime | Driver                       | Notes                      |
 * | ------- | ---------------------------- | -------------------------- |
 * | Deno    | `jsr:@db/sqlite`             | Track B Group 4 (this PR)  |
 * | Bun     | `bun:sqlite` (built-in)      | Track B Group 5            |
 * | Node    | `node:sqlite` (≥ 22.5)       | Track B Group 5            |
 * | Node    | `npm:better-sqlite3` (older) | Track B Group 5 (fallback) |
 *
 * The interface is synchronous — every host driver listed above has a sync
 * API, and dev-coach uses SQLite synchronously today (see `src/db/`).
 *
 * @module
 */

import { runtime } from '../../utils/runtime/index.ts';

/**
 * Result of an INSERT / UPDATE / DELETE / DDL execution.
 *
 * `lastInsertRowid` is `number | bigint` because each runtime driver picks a
 * different default — `@db/sqlite` and `bun:sqlite` return `number`,
 * `better-sqlite3` returns `number` for safe-integer rowids and `bigint`
 * beyond. Callers should narrow with `Number()` if they need a plain number.
 */
export interface RunResult {
  /** Number of rows affected by the statement. */
  changes: number;
  /** ROWID of the last inserted row (zero for non-INSERT statements). */
  lastInsertRowid: number | bigint;
}

/**
 * A prepared SQL statement, bound to a {@link Database}. Reusable across many
 * executions with different parameters.
 */
export interface Statement {
  /** Execute the statement (INSERT / UPDATE / DELETE / DDL). */
  run(...params: unknown[]): RunResult;
  /** Execute and return every result row as a typed object. */
  all<T = unknown>(...params: unknown[]): T[];
  /**
   * Execute and return the first result row as a typed object, or `undefined`
   * if the query returned no rows.
   */
  get<T = unknown>(...params: unknown[]): T | undefined;
}

/**
 * A SQLite database connection. Construct via {@link openDb}; all method
 * signatures are sync because every host driver is sync.
 */
export interface Database {
  /**
   * Compile a SQL string into a reusable {@link Statement}. Use this when the
   * same SQL is executed multiple times with different parameters.
   */
  prepare(sql: string): Statement;
  /**
   * Execute one or more SQL statements that return no rows. Used for PRAGMA,
   * DDL, and the `BEGIN/COMMIT/ROLLBACK` wrappers in {@link Database.transaction}.
   */
  exec(sql: string): void;
  /** One-shot version of `prepare(sql).run(...params)`. */
  run(sql: string, ...params: unknown[]): RunResult;
  /** One-shot version of `prepare(sql).all(...params)`. */
  all<T = unknown>(sql: string, ...params: unknown[]): T[];
  /** One-shot version of `prepare(sql).get(...params)`. */
  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined;
  /**
   * Run `fn` inside a transaction. Commits on return; rolls back if `fn`
   * throws. Returns whatever `fn` returns.
   *
   * @example
   * ```ts
   * db.transaction(() => {
   *   db.run("INSERT INTO items (name) VALUES (?)", "a");
   *   db.run("INSERT INTO items (name) VALUES (?)", "b");
   * });
   * ```
   */
  transaction<T>(fn: () => T): T;
  /** Close the connection and release the file lock. */
  close(): void;
}

/**
 * Open (or create) a SQLite database at `path`. Pass `":memory:"` for an
 * in-memory database. The host driver is selected at call time based on
 * {@link runtime.name}.
 *
 * @example
 * ```ts
 * import { openDb } from "./db/sqlite/index.ts";
 *
 * const db = openDb(":memory:");
 * db.exec("CREATE TABLE t(id INTEGER PRIMARY KEY, name TEXT)");
 * db.run("INSERT INTO t (name) VALUES (?)", "alice");
 * const row = db.get<{ id: number; name: string }>("SELECT * FROM t WHERE name = ?", "alice");
 * db.close();
 * ```
 */
export async function openDb(path: string): Promise<Database> {
  switch (runtime.name) {
    case 'deno': {
      const mod = await import('./deno.ts');
      return mod.openDb(path);
    }
    case 'bun': {
      const mod = await import('./bun.ts');
      return mod.openDb(path);
    }
    case 'node': {
      const mod = await import('./node.ts');
      return mod.openDb(path);
    }
  }
}
