/**
 * Cross-runtime smoke test for the runtime adapter.
 *
 * Asserts that the methods most callers depend on round-trip a sensible value
 * on whichever host executes this file. Runs under `node:test`, which works
 * natively on Bun, Node ≥ 22, and Deno (via node-compat).
 *
 * The deeper Deno-specific tests live in `tests/runtime_test.ts`; this file
 * only locks in the cross-runtime contract so we catch regressions when the
 * Group 7 CI matrix runs `bun test` and `node --test`.
 *
 * @module
 */

import { test } from 'node:test';
import { runtime } from '../../src/utils/runtime/index.ts';

test('runtime.name is one of deno/bun/node', () => {
  if (!['deno', 'bun', 'node'].includes(runtime.name)) {
    throw new Error(`unexpected runtime.name: ${runtime.name}`);
  }
});

test('runtime.cwd() returns a non-empty string', () => {
  const cwd = runtime.cwd();
  if (typeof cwd !== 'string' || cwd.length === 0) {
    throw new Error(`runtime.cwd() returned ${JSON.stringify(cwd)}`);
  }
});

test('runtime.homedir() returns a non-empty string', () => {
  const home = runtime.homedir();
  if (typeof home !== 'string' || home.length === 0) {
    throw new Error(`runtime.homedir() returned ${JSON.stringify(home)}`);
  }
});

test('runtime.osPlatform() returns a known platform', () => {
  const p = runtime.osPlatform();
  // We don't whitelist values exhaustively — we just want a non-empty string.
  // Known values include 'darwin', 'linux', 'win32', 'freebsd', etc.
  if (typeof p !== 'string' || p.length === 0) {
    throw new Error(`runtime.osPlatform() returned ${JSON.stringify(p)}`);
  }
});

test('runtime.args is an array', () => {
  if (!Array.isArray(runtime.args)) {
    throw new Error(`runtime.args is not an array: ${typeof runtime.args}`);
  }
});

test('runtime.env.get returns string | undefined', () => {
  // PATH is set on every CI runner we care about; if missing, skip silently
  // rather than failing in obscure local environments.
  const path = runtime.env.get('PATH') ?? runtime.env.get('Path');
  if (path !== undefined && typeof path !== 'string') {
    throw new Error(`env.get returned non-string: ${typeof path}`);
  }

  const missing = runtime.env.get('__DEV_COACH_DEFINITELY_MISSING__');
  if (missing !== undefined) {
    throw new Error(`expected undefined for missing env var, got ${missing}`);
  }
});

test('runtime.consoleSize() returns { columns, rows } numbers', () => {
  const size = runtime.consoleSize();
  if (typeof size.columns !== 'number' || typeof size.rows !== 'number') {
    throw new Error(`consoleSize returned ${JSON.stringify(size)}`);
  }
  if (size.columns <= 0 || size.rows <= 0) {
    throw new Error(`consoleSize returned non-positive: ${JSON.stringify(size)}`);
  }
});

test('runtime.stat / readTextFile / writeTextFile / mkdir / remove round-trip', async () => {
  // Use the host's tmp dir via the env var. Avoid runtime.* tmp helpers — we
  // didn't add one, and POSIX TMPDIR + Windows TEMP cover every CI runner.
  const base = runtime.env.get('TMPDIR') ?? runtime.env.get('TEMP') ?? '/tmp';
  const dir = `${base}/dev-coach-runtime-smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const file = `${dir}/hello.txt`;

  await runtime.mkdir(dir, { recursive: true });
  try {
    const dirStat = await runtime.stat(dir);
    if (!dirStat.isDirectory) throw new Error('mkdir target is not a directory');

    await runtime.writeTextFile(file, 'hello\n');
    const content = await runtime.readTextFile(file);
    if (content !== 'hello\n') {
      throw new Error(`readTextFile mismatch: ${JSON.stringify(content)}`);
    }

    const fileStat = await runtime.stat(file);
    if (!fileStat.isFile) throw new Error('writeTextFile target is not a file');
  } finally {
    await runtime.remove(dir, { recursive: true });
  }
});
