/**
 * SQLite adapter — Deno implementation.
 *
 * Wraps `jsr:@db/sqlite`'s `Database` to match the {@link Database}
 * interface from `./index.ts`. Every method is a thin pass-through; the only
 * non-trivial bit is {@link DenoDatabase.transaction}, implemented as
 * `BEGIN / COMMIT / ROLLBACK` via `exec` (matching how `src/db/migrations.ts`
 * already does it today).
 *
 * This module is only loaded when {@link runtime.name} is `"deno"`.
 *
 * @module
 */

import { Database as SqliteDatabase } from '@db/sqlite';
import type { Database, RunResult, Statement } from './index.ts';

class DenoStatement implements Statement {
  // deno-lint-ignore no-explicit-any
  private readonly stmt: any;

  // deno-lint-ignore no-explicit-any
  constructor(stmt: any) {
    this.stmt = stmt;
  }

  run(...params: unknown[]): RunResult {
    const result = this.stmt.run(...params);
    // @db/sqlite's run() returns the number of changes directly.
    return {
      changes: typeof result === 'number' ? result : 0,
      lastInsertRowid: 0,
    };
  }

  all<T = unknown>(...params: unknown[]): T[] {
    return this.stmt.all(...params) as T[];
  }

  get<T = unknown>(...params: unknown[]): T | undefined {
    return this.stmt.get(...params) as T | undefined;
  }
}

class DenoDatabase implements Database {
  private readonly db: SqliteDatabase;

  constructor(path: string) {
    this.db = new SqliteDatabase(path);
  }

  prepare(sql: string): Statement {
    return new DenoStatement(this.db.prepare(sql));
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, ...params: unknown[]): RunResult {
    const changes = this.db.run(sql, ...(params as never[]));
    return {
      changes: typeof changes === 'number' ? changes : 0,
      lastInsertRowid: this.db.lastInsertRowId,
    };
  }

  all<T = unknown>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...(params as never[])) as T[];
  }

  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...(params as never[])) as T | undefined;
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

/** Open a SQLite database on Deno using `jsr:@db/sqlite`. */
export function openDb(path: string): Database {
  return new DenoDatabase(path);
}
