/**
 * SQLite adapter — Node.js implementation.
 *
 * Tries `node:sqlite` first (built-in, available in Node ≥ 22.5 behind the
 * `--experimental-sqlite` flag, stable in 24). Falls back to
 * `npm:better-sqlite3` if `node:sqlite` is missing — that is the most popular
 * native Node SQLite binding and runs on Node ≥ 18 with a prebuilt binary.
 *
 * If both fail, throws a clear message pointing the user at the install
 * command. Loaded only when {@link runtime.name} is `"node"`.
 *
 * Both drivers expose the same `prepare`/`run`/`all`/`get`/`exec`/`close`
 * surface and return `{ changes, lastInsertRowid }` from `run()`, so a single
 * wrapper class handles both. Transactions use `BEGIN/COMMIT/ROLLBACK` via
 * `exec` for parity with the other adapters.
 *
 * @module
 */

import type { Database, RunResult, Statement } from './index.ts';

// node:sqlite and better-sqlite3 are not in Deno's typechecker. Cast at the
// dynamic-import boundary; downstream code sees only the typed shapes.

// deno-lint-ignore no-explicit-any
type Any = any;

class NodeStatement implements Statement {
  private readonly stmt: Any;

  constructor(stmt: Any) {
    this.stmt = stmt;
  }

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

class NodeDatabase implements Database {
  private readonly db: Any;

  constructor(db: Any) {
    this.db = db;
  }

  prepare(sql: string): Statement {
    return new NodeStatement(this.db.prepare(sql));
  }

  exec(sql: string): void {
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

async function tryNodeSqlite(path: string): Promise<Database | null> {
  try {
    const mod = (await import('node:sqlite' as Any)) as Any;
    // The class is exported as `DatabaseSync` (per Node docs). Older drafts
    // briefly used `Database` — accept either.
    const Sqlite = mod.DatabaseSync ?? mod.Database;
    if (!Sqlite) return null;
    return new NodeDatabase(new Sqlite(path));
  } catch {
    return null;
  }
}

async function tryBetterSqlite3(path: string): Promise<Database | null> {
  try {
    const mod = (await import('better-sqlite3' as Any)) as Any;
    const Sqlite = mod.default ?? mod;
    return new NodeDatabase(new Sqlite(path));
  } catch {
    return null;
  }
}

/**
 * Open a SQLite database on Node, preferring `node:sqlite` (≥ 22.5) and
 * falling back to `better-sqlite3` if needed.
 *
 * @throws if neither driver is available, with an actionable install hint.
 */
export async function openDb(path: string): Promise<Database> {
  const fromBuiltin = await tryNodeSqlite(path);
  if (fromBuiltin) return fromBuiltin;

  const fromNpm = await tryBetterSqlite3(path);
  if (fromNpm) return fromNpm;

  throw new Error(
    'No SQLite driver available on Node. Either upgrade to Node ≥ 22.5 ' +
      '(then run with `--experimental-sqlite`, or use Node ≥ 24 where it is stable) ' +
      'or install `better-sqlite3` (`npm i better-sqlite3`).',
  );
}
