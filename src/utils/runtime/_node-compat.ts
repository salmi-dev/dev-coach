/**
 * Internal — shared Node-compatible adapter pieces used by both `./bun.ts`
 * and `./node.ts`.
 *
 * Bun and Node both expose `process.*` and the `node:` module namespace, so
 * filesystem, env, exit, cwd, homedir, osPlatform, consoleSize, stdin and
 * stdout map to identical implementations on both. The two host-specific
 * pieces — `runCommand` and the `name` tag — are passed in from each adapter.
 *
 * @module
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import process from 'node:process';
import type { CommandResult, DirEntry, FileStat, OSPlatform, RunCommandOpts, Runtime, RuntimeName } from './index.ts';

/**
 * Map a Node-style `process.platform` value to our {@link OSPlatform} enum.
 * Exported so it can be unit-tested with synthetic platform strings without
 * having to mock `node:process` itself.
 *
 * @param platform Value of `process.platform` (defaults to live process).
 */
export function osPlatform(platform: string = process.platform): OSPlatform {
  switch (platform) {
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
    case 'freebsd':
      return 'freebsd';
    default:
      return 'other';
  }
}

function homedir(): string {
  // Prefer the OS-supplied homedir (handles Windows USERPROFILE consistently)
  // and fall back to env vars for parity with the Deno adapter.
  const home = os.homedir();
  if (home) return home;
  const env = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
  if (env) return env;
  throw new Error(
    'Unable to determine home directory: neither HOME nor USERPROFILE is set',
  );
}

function consoleSize(): { columns: number; rows: number } {
  try {
    // process.stdout.getWindowSize() returns [columns, rows] on Node and Bun.
    const size = (process.stdout as { getWindowSize?: () => [number, number] })
      .getWindowSize?.();
    if (size && size[0] > 0 && size[1] > 0) {
      return { columns: size[0], rows: size[1] };
    }
  } catch {
    // not a TTY
  }
  return { columns: 80, rows: 24 };
}

async function stat(path: string): Promise<FileStat> {
  const info = await fs.stat(path);
  return {
    isFile: info.isFile(),
    isDirectory: info.isDirectory(),
    size: info.size,
    mtime: info.mtime ?? null,
  };
}

async function* readDir(path: string): AsyncIterable<DirEntry> {
  const entries = await fs.readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    yield {
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
    };
  }
}

async function mkdir(
  path: string,
  opts?: { recursive?: boolean },
): Promise<void> {
  await fs.mkdir(path, { recursive: opts?.recursive ?? false });
}

async function remove(
  path: string,
  opts?: { recursive?: boolean },
): Promise<void> {
  await fs.rm(path, { recursive: opts?.recursive ?? false, force: false });
}

async function stdoutWrite(data: Uint8Array): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(data, (err) => (err ? reject(err) : resolve()));
  });
}

function isNotFound(e: unknown): boolean {
  // On Bun and Node, filesystem errors surface as Error objects with a `code`
  // property like 'ENOENT'. We match that here for parity with the Deno
  // adapter's `e instanceof Deno.errors.NotFound`.
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: unknown }).code === 'ENOENT'
  );
}

/**
 * Build a {@link Runtime} backed by the Node-compatible APIs available on
 * both Bun and Node. The caller provides the `name` and the host-specific
 * `runCommand` (Bun uses `Bun.spawn`; Node uses `node:child_process`).
 */
export function buildNodeCompatRuntime(
  name: RuntimeName,
  runCommand: (
    cmd: string,
    args: string[],
    opts?: RunCommandOpts,
  ) => Promise<CommandResult>,
): Runtime {
  return Object.freeze({
    name,
    args: Object.freeze([...process.argv.slice(2)]),
    env: {
      get: (k: string) => process.env[k],
      set: (k: string, v: string) => {
        process.env[k] = v;
      },
    },
    exit: (code?: number): never => process.exit(code) as never,
    cwd: () => process.cwd(),
    homedir,
    osPlatform,
    consoleSize,
    stdin: {
      isTerminal: () => Boolean(process.stdin.isTTY),
    },
    stdout: {
      isTerminal: () => Boolean(process.stdout.isTTY),
      write: stdoutWrite,
    },
    readTextFile: (path: string) => fs.readFile(path, 'utf-8'),
    writeTextFile: (path: string, data: string) => fs.writeFile(path, data, 'utf-8'),
    mkdir,
    stat,
    readDir,
    remove,
    runCommand,
    errors: {
      isNotFound,
    },
  });
}
