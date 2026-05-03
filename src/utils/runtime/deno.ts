/**
 * Runtime adapter — Deno implementation.
 *
 * Maps every {@link Runtime} method to its `Deno.*` counterpart. This module
 * is only imported on Deno (see `./index.ts`); on Bun and Node it is never
 * evaluated, so `Deno.*` references here are safe.
 *
 * @module
 */

import type { CommandResult, DirEntry, FileStat, OSPlatform, RunCommandOpts, Runtime } from './index.ts';

function osPlatform(): OSPlatform {
  switch (Deno.build.os) {
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    case 'windows':
      return 'windows';
    case 'freebsd':
      return 'freebsd';
    default:
      return 'other';
  }
}

function homedir(): string {
  if (Deno.build.os === 'windows') {
    const userProfile = Deno.env.get('USERPROFILE');
    if (userProfile) return userProfile;
  }
  const home = Deno.env.get('HOME');
  if (home) return home;
  throw new Error(
    'Unable to determine home directory: neither HOME nor USERPROFILE is set',
  );
}

function consoleSize(): { columns: number; rows: number } {
  try {
    const size = Deno.consoleSize();
    if (size && size.columns > 0 && size.rows > 0) return size;
  } catch {
    // not a TTY or insufficient permission
  }
  return { columns: 80, rows: 24 };
}

async function stat(path: string): Promise<FileStat> {
  const info = await Deno.stat(path);
  return {
    isFile: info.isFile,
    isDirectory: info.isDirectory,
    size: info.size,
    mtime: info.mtime,
  };
}

async function* readDir(path: string): AsyncIterable<DirEntry> {
  for await (const entry of Deno.readDir(path)) {
    yield {
      name: entry.name,
      isFile: entry.isFile,
      isDirectory: entry.isDirectory,
    };
  }
}

async function runCommand(
  cmd: string,
  args: string[],
  opts: RunCommandOpts = {},
): Promise<CommandResult> {
  const stdinMode = opts.stdinInherit ? 'inherit' : opts.stdin !== undefined ? 'piped' : 'null';
  const stdoutMode = opts.stdoutInherit ? 'inherit' : 'piped';
  const stderrMode = opts.stderrInherit ? 'inherit' : 'piped';

  const command = new Deno.Command(cmd, {
    args,
    stdin: stdinMode,
    stdout: stdoutMode,
    stderr: stderrMode,
  });
  const child = command.spawn();
  if (opts.stdin !== undefined && !opts.stdinInherit) {
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(opts.stdin));
    await writer.close();
  }
  const out = await child.output();
  return {
    code: out.code,
    stdout: opts.stdoutInherit ? '' : new TextDecoder().decode(out.stdout),
    stderr: opts.stderrInherit ? '' : new TextDecoder().decode(out.stderr),
  };
}

/** The Deno-backed runtime adapter instance. */
export const runtime: Runtime = Object.freeze({
  name: 'deno' as const,
  args: Object.freeze([...Deno.args]),
  env: {
    get: (k: string) => Deno.env.get(k),
    set: (k: string, v: string) => Deno.env.set(k, v),
  },
  exit: (code?: number): never => Deno.exit(code),
  cwd: () => Deno.cwd(),
  homedir,
  osPlatform,
  consoleSize,
  stdin: {
    isTerminal: () => {
      try {
        return Deno.stdin.isTerminal();
      } catch {
        return false;
      }
    },
  },
  stdout: {
    isTerminal: () => {
      try {
        return Deno.stdout.isTerminal();
      } catch {
        return false;
      }
    },
    write: async (data: Uint8Array): Promise<void> => {
      await Deno.stdout.write(data);
    },
  },
  readTextFile: (path: string) => Deno.readTextFile(path),
  writeTextFile: (path: string, data: string) => Deno.writeTextFile(path, data),
  mkdir: (path: string, opts?: { recursive?: boolean }) => Deno.mkdir(path, opts),
  stat,
  readDir,
  remove: (path: string, opts?: { recursive?: boolean }) => Deno.remove(path, opts),
  runCommand,
  errors: {
    isNotFound: (e: unknown): boolean => e instanceof Deno.errors.NotFound,
  },
});
