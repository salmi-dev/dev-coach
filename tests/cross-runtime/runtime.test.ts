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

test('runtime.readDir yields entries with name + isFile + isDirectory', async () => {
  const base = runtime.env.get('TMPDIR') ?? runtime.env.get('TEMP') ?? '/tmp';
  const dir = `${base}/dev-coach-readdir-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await runtime.mkdir(dir, { recursive: true });
  try {
    await runtime.writeTextFile(`${dir}/a.txt`, 'a');
    await runtime.writeTextFile(`${dir}/b.txt`, 'b');
    await runtime.mkdir(`${dir}/sub`, { recursive: false });

    const names = new Set<string>();
    let sawFile = false;
    let sawDir = false;
    for await (const entry of runtime.readDir(dir)) {
      names.add(entry.name);
      if (entry.isFile) sawFile = true;
      if (entry.isDirectory) sawDir = true;
    }
    if (!names.has('a.txt') || !names.has('b.txt') || !names.has('sub')) {
      throw new Error(`readDir missing entries: ${[...names].join(',')}`);
    }
    if (!sawFile) throw new Error('readDir never reported a file');
    if (!sawDir) throw new Error('readDir never reported a directory');
  } finally {
    await runtime.remove(dir, { recursive: true });
  }
});

test('runtime.env.set then env.get round-trips', () => {
  const key = `__DEV_COACH_ENV_TEST_${Date.now()}__`;
  runtime.env.set(key, 'hello');
  const got = runtime.env.get(key);
  if (got !== 'hello') throw new Error(`env round-trip failed: ${got}`);
});

test('runtime.errors.isNotFound recognises ENOENT-shaped errors', () => {
  // Deno's adapter checks `instanceof Deno.errors.NotFound` rather than the
  // `.code` property, so synthetic-shape recognition only applies on the
  // Node-compat adapter (Bun + Node).
  if (runtime.name === 'deno') return;
  const enoent = { code: 'ENOENT' };
  if (!runtime.errors.isNotFound(enoent)) {
    throw new Error('isNotFound did not match a {code: "ENOENT"} object');
  }
  if (runtime.errors.isNotFound({ code: 'EACCES' })) {
    throw new Error('isNotFound matched EACCES (should be false)');
  }
  if (runtime.errors.isNotFound({})) {
    throw new Error('isNotFound matched plain object (should be false)');
  }
  if (runtime.errors.isNotFound(null)) {
    throw new Error('isNotFound matched null (should be false)');
  }
  if (runtime.errors.isNotFound('not an error')) {
    throw new Error('isNotFound matched string (should be false)');
  }
});

test('runtime.errors.isNotFound returns true for a real fs miss', async () => {
  try {
    await runtime.stat('/this-path/should/not/exist/dev-coach-test');
    throw new Error('stat() unexpectedly succeeded on a missing path');
  } catch (e) {
    if (!runtime.errors.isNotFound(e)) {
      throw new Error(`isNotFound did not recognise the live fs error: ${String(e)}`);
    }
  }
});

test('runtime.stdout.write accepts a Uint8Array', async () => {
  // Empty payload — we just want to exercise the write codepath without
  // polluting the test reporter's output.
  await runtime.stdout.write(new Uint8Array(0));
});

test('runtime.stdin.isTerminal returns a boolean', () => {
  const v = runtime.stdin.isTerminal();
  if (typeof v !== 'boolean') throw new Error(`isTerminal returned ${typeof v}`);
});

test('runtime.stdout.isTerminal returns a boolean', () => {
  const v = runtime.stdout.isTerminal();
  if (typeof v !== 'boolean') throw new Error(`isTerminal returned ${typeof v}`);
});

test('runtime.runCommand runs a child process and captures stdout', async () => {
  // Use `node -e` because every CI runner we target has Node available even
  // when the test host is Bun. (Bun ships its own runtime but the matrix
  // includes Node as PATH dependency for the cross-runtime job.)
  const result = await runtime.runCommand('node', ['-e', "process.stdout.write('hi')"]);
  if (result.code !== 0) {
    throw new Error(`runCommand exit ${result.code}: ${result.stderr}`);
  }
  if (result.stdout !== 'hi') {
    throw new Error(`runCommand stdout = ${JSON.stringify(result.stdout)}`);
  }
});

test('runtime.runCommand reports non-zero exit code', async () => {
  const result = await runtime.runCommand('node', ['-e', 'process.exit(7)']);
  if (result.code !== 7) {
    throw new Error(`expected exit 7, got ${result.code}`);
  }
});

test('runtime.runCommand captures stderr', async () => {
  const result = await runtime.runCommand('node', ['-e', "process.stderr.write('boom')"]);
  if (!result.stderr.includes('boom')) {
    throw new Error(`stderr did not include "boom": ${JSON.stringify(result.stderr)}`);
  }
});

test('runtime.runCommand feeds stdin when opts.stdin is provided', async () => {
  const result = await runtime.runCommand(
    'node',
    ['-e', 'process.stdin.on("data", (b) => process.stdout.write(b))'],
    { stdin: 'piped-input' },
  );
  if (result.code !== 0) {
    throw new Error(`runCommand exit ${result.code}: ${result.stderr}`);
  }
  if (!result.stdout.includes('piped-input')) {
    throw new Error(`stdout did not echo stdin: ${JSON.stringify(result.stdout)}`);
  }
});
