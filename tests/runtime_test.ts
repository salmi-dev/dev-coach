import { assert, assertEquals, assertRejects, assertThrows } from '@std/assert';
import { detectRuntime } from '../src/utils/runtime/detect.ts';
import { runtime } from '../src/utils/runtime/index.ts';

// ---------- Detection (task 2.6 + 3.5 stub) ----------

Deno.test('detectRuntime identifies the host as Deno', () => {
  assertEquals(detectRuntime(), 'deno');
});

Deno.test('detectRuntime throws when no runtime globals are present', () => {
  // Stub globalThis to look like none of the supported runtimes
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  const savedDeno = g.Deno;
  const savedBun = g.Bun;
  const savedProcess = g.process;
  try {
    delete g.Deno;
    delete g.Bun;
    delete g.process;
    assertThrows(() => detectRuntime(), Error, 'Unsupported runtime');
  } finally {
    g.Deno = savedDeno;
    g.Bun = savedBun;
    g.process = savedProcess;
  }
});

Deno.test('detectRuntime returns "bun" when only globalThis.Bun is present', () => {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  const savedDeno = g.Deno;
  const savedBun = g.Bun;
  const savedProcess = g.process;
  try {
    delete g.Deno;
    delete g.process;
    g.Bun = { version: '1.0.0' };
    assertEquals(detectRuntime(), 'bun');
  } finally {
    g.Deno = savedDeno;
    g.Bun = savedBun;
    g.process = savedProcess;
  }
});

Deno.test('detectRuntime returns "node" when only globalThis.process is present', () => {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  const savedDeno = g.Deno;
  const savedBun = g.Bun;
  const savedProcess = g.process;
  try {
    delete g.Deno;
    delete g.Bun;
    g.process = { versions: { node: '22.0.0' } };
    assertEquals(detectRuntime(), 'node');
  } finally {
    g.Deno = savedDeno;
    g.Bun = savedBun;
    g.process = savedProcess;
  }
});

// ---------- Runtime surface — Deno implementation ----------

Deno.test('runtime.name is "deno" on this host', () => {
  assertEquals(runtime.name, 'deno');
});

Deno.test('runtime.args is a frozen readonly array', () => {
  assert(Array.isArray(runtime.args));
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    (runtime.args as any).push('x');
  });
});

Deno.test('runtime.env round-trips a value', () => {
  const KEY = 'COACH_TEST_RUNTIME_ENV';
  runtime.env.set(KEY, 'hello');
  assertEquals(runtime.env.get(KEY), 'hello');
});

Deno.test('runtime.cwd returns a non-empty path', () => {
  const cwd = runtime.cwd();
  assert(cwd.length > 0);
});

Deno.test('runtime.homedir returns a non-empty path', () => {
  const home = runtime.homedir();
  assert(home.length > 0);
});

Deno.test('runtime.osPlatform returns one of the documented values', () => {
  const p = runtime.osPlatform();
  assert(['darwin', 'linux', 'windows', 'freebsd', 'other'].includes(p));
});

Deno.test('runtime.consoleSize returns a positive size or the documented fallback', () => {
  const size = runtime.consoleSize();
  assert(size.columns > 0);
  assert(size.rows > 0);
});

Deno.test('runtime.stdin / runtime.stdout expose isTerminal', () => {
  // We don't assert truthiness — value depends on how the test runs.
  assertEquals(typeof runtime.stdin.isTerminal(), 'boolean');
  assertEquals(typeof runtime.stdout.isTerminal(), 'boolean');
});

Deno.test('runtime.{readTextFile,writeTextFile} round-trip a file', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'coach-runtime-test-' });
  const path = `${dir}/sample.txt`;
  await runtime.writeTextFile(path, 'hello, runtime');
  assertEquals(await runtime.readTextFile(path), 'hello, runtime');
  await runtime.remove(dir, { recursive: true });
});

Deno.test('runtime.mkdir + stat + readDir + remove cooperate', async () => {
  const root = await Deno.makeTempDir({ prefix: 'coach-runtime-test-' });
  const sub = `${root}/a/b/c`;
  await runtime.mkdir(sub, { recursive: true });

  const subStat = await runtime.stat(sub);
  assert(subStat.isDirectory);
  assert(!subStat.isFile);

  await runtime.writeTextFile(`${sub}/x.txt`, 'x');
  await runtime.writeTextFile(`${sub}/y.txt`, 'yy');

  const names: string[] = [];
  for await (const entry of runtime.readDir(sub)) {
    if (entry.isFile) names.push(entry.name);
  }
  names.sort();
  assertEquals(names, ['x.txt', 'y.txt']);

  await runtime.remove(root, { recursive: true });
  await assertRejects(() => runtime.stat(root));
});

Deno.test('runtime.runCommand captures stdout from a portable echo-like command', async () => {
  // Use Deno itself — guaranteed to exist on this host and produce predictable output.
  const result = await runtime.runCommand(Deno.execPath(), ['eval', 'console.log("ok")']);
  assertEquals(result.code, 0);
  assertEquals(result.stdout.trim(), 'ok');
});

Deno.test('runtime.runCommand feeds stdin when provided', async () => {
  const result = await runtime.runCommand(
    Deno.execPath(),
    [
      'eval',
      'const buf = new Uint8Array(1024); const n = await Deno.stdin.read(buf) ?? 0; await Deno.stdout.write(buf.subarray(0, n));',
    ],
    { stdin: 'piped-input' },
  );
  assertEquals(result.code, 0);
  assertEquals(result.stdout, 'piped-input');
});
