/**
 * Platform detection utilities.
 *
 * Thin wrappers over the {@link runtime} adapter that translate the adapter's
 * canonical names into the dev-coach-specific {@link OS} tag. Prefer using
 * `runtime.*` directly in new code; this module exists so legacy callers keep
 * working while we phase out the `Deno.*` references.
 */

import { runtime } from './runtime/index.ts';

/** Operating-system tags used internally. */
export type OS = 'macos' | 'linux' | 'windows';

/** Detect the current operating system. */
export function getOS(): OS {
  switch (runtime.osPlatform()) {
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    case 'windows':
      return 'windows';
    default:
      return 'linux'; // fallback
  }
}

/** Get the user's home directory. */
export function getHomeDir(): string {
  return runtime.homedir();
}

/** Check whether stdin is an interactive TTY. */
export function isInteractive(): boolean {
  return runtime.stdin.isTerminal();
}
