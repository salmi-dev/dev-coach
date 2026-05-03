/**
 * Runtime adapter — public surface.
 *
 * A single explicit object that wraps the host runtime's standard library so
 * the rest of the codebase can be runtime-agnostic. Exactly one implementation
 * is loaded at startup based on {@link detectRuntime}; see `./deno.ts`,
 * `./bun.ts`, `./node.ts` for per-host implementations.
 *
 * @module
 *
 * @example Read an env var and a file
 * ```ts
 * import { runtime } from "./runtime/index.ts";
 * const home = runtime.env.get("HOME");
 * const data = await runtime.readTextFile(`${home}/.config/coach/config.toml`);
 * ```
 */

import { detectRuntime } from './detect.ts';

/** Names of the runtimes this adapter supports. */
export type RuntimeName = 'deno' | 'bun' | 'node';

/** Operating-system family, as reported by the runtime. */
export type OSPlatform = 'darwin' | 'linux' | 'windows' | 'freebsd' | 'other';

/** A single directory entry from {@link Runtime.readDir}. */
export interface DirEntry {
  /** Filename, not including parent directory components. */
  name: string;
  /** True if this entry is a regular file. */
  isFile: boolean;
  /** True if this entry is a directory. */
  isDirectory: boolean;
}

/** Result of running a child process via {@link Runtime.runCommand}. */
export interface CommandResult {
  /** Process exit code; `0` on success. */
  code: number;
  /** Captured stdout (UTF-8 decoded). Empty string when `stdoutInherit` is true. */
  stdout: string;
  /** Captured stderr (UTF-8 decoded). Empty string when `stderrInherit` is true. */
  stderr: string;
}

/** Options accepted by {@link Runtime.runCommand}. */
export interface RunCommandOpts {
  /** Text to feed to the child's stdin (closed after). Mutually exclusive with `stdinInherit`. */
  stdin?: string;
  /** Inherit the parent's stdin (interactive). Mutually exclusive with `stdin`. */
  stdinInherit?: boolean;
  /** Inherit the parent's stdout instead of capturing. */
  stdoutInherit?: boolean;
  /** Inherit the parent's stderr instead of capturing. */
  stderrInherit?: boolean;
}

/** File metadata subset returned by {@link Runtime.stat}. */
export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  /** Last-modification time, or `null` when not available from the host. */
  mtime: Date | null;
}

/**
 * The runtime adapter surface.
 *
 * Members map 1:1 to the original `Deno.*` calls used in the codebase before
 * Track B; the same surface is implemented atop `bun:*` and `node:*` in the
 * Bun and Node adapters. Keep this surface minimal — anything more specific
 * belongs in a higher-level helper.
 */
export interface Runtime {
  /** Name of the host runtime. */
  readonly name: RuntimeName;
  /** Command-line arguments after the script name (matches `Deno.args`). */
  readonly args: readonly string[];
  /** Environment-variable accessors. */
  readonly env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
  /** Terminate the process with the given exit code (default 0). */
  exit(code?: number): never;
  /** Current working directory. */
  cwd(): string;
  /** User's home directory. Throws if not derivable from env. */
  homedir(): string;
  /** Operating-system family (mapped to a stable set). */
  osPlatform(): OSPlatform;
  /**
   * Console size in columns × rows. Falls back to `{ columns: 80, rows: 24 }`
   * when stdout is not a TTY or the runtime cannot report a size.
   */
  consoleSize(): { columns: number; rows: number };
  /** stdin-related queries. */
  readonly stdin: { isTerminal(): boolean };
  /** stdout-related operations. */
  readonly stdout: {
    isTerminal(): boolean;
    write(data: Uint8Array): Promise<void>;
  };
  /** Read a UTF-8 text file. */
  readTextFile(path: string): Promise<string>;
  /** Write a UTF-8 text file (creates or replaces). */
  writeTextFile(path: string, data: string): Promise<void>;
  /** Create a directory. With `recursive: true`, creates parents and ignores existing. */
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  /** Stat a path. Throws if it does not exist. */
  stat(path: string): Promise<FileStat>;
  /** Iterate the entries of a directory. */
  readDir(path: string): AsyncIterable<DirEntry>;
  /** Remove a file or directory. With `recursive: true`, removes contents too. */
  remove(path: string, opts?: { recursive?: boolean }): Promise<void>;
  /**
   * Run a child process to completion, capturing stdout/stderr as text by
   * default. Use the `*Inherit` flags to inherit one or more parent streams
   * (for editors, pagers, fzf-style TUIs).
   * `opts.stdin`, if given, is fed to the child's stdin and stdin is closed.
   */
  runCommand(
    cmd: string,
    args: string[],
    opts?: RunCommandOpts,
  ): Promise<CommandResult>;
  /**
   * Predicates for cross-runtime error checks. Use these instead of
   * `e instanceof Deno.errors.X`, since on Bun and Node filesystem errors
   * surface as plain `Error` objects with a `code` property.
   */
  readonly errors: {
    /** True iff `e` is a "file/dir not found" error from any host. */
    isNotFound(e: unknown): boolean;
  };
}

/**
 * The active runtime adapter. Resolved once at module load by dynamic-importing
 * the per-runtime implementation, so non-host modules (`./bun.ts`, `./node.ts`)
 * are never evaluated on hosts that cannot parse them.
 *
 * Top-level `await` is intentional: the adapter MUST be ready before any
 * caller uses it, and dynamic `import()` is async.
 */
export const runtime: Runtime = await loadRuntime();

async function loadRuntime(): Promise<Runtime> {
  const name = detectRuntime();
  switch (name) {
    case 'deno': {
      const mod = await import('./deno.ts');
      return mod.runtime;
    }
    case 'bun': {
      const mod = await import('./bun.ts');
      return mod.runtime;
    }
    case 'node': {
      const mod = await import('./node.ts');
      return mod.runtime;
    }
  }
}
