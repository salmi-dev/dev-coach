/**
 * Runtime adapter — Node.js implementation.
 *
 * Most of the surface is shared with Bun via {@link buildNodeCompatRuntime}
 * (both expose `process` + the `node:` module namespace). The Node-specific
 * bit is `runCommand`, which uses `node:child_process.execFile` so we don't
 * spawn a shell and don't have to escape arguments.
 *
 * This module is only loaded when {@link detectRuntime} returns `"node"`; on
 * Deno and Bun hosts it is never evaluated.
 *
 * @module
 */

import { execFile } from 'node:child_process';
import type { CommandResult, Runtime } from './index.ts';
import { buildNodeCompatRuntime } from './_node-compat.ts';

function nodeRunCommand(
  cmd: string,
  args: string[],
  opts: { stdin?: string } = {},
): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = execFile(
      cmd,
      args,
      { encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        // execFile invokes the callback on non-zero exit AND on spawn errors.
        // We surface the exit code instead of throwing — match the Deno adapter.
        if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(err);
          return;
        }
        const code = (err as { code?: number } | null)?.code ?? 0;
        resolve({
          code: typeof code === 'number' ? code : 1,
          stdout,
          stderr,
        });
      },
    );

    if (opts.stdin !== undefined) {
      child.stdin?.end(opts.stdin);
    }
  });
}

/** The Node-backed runtime adapter instance. */
export const runtime: Runtime = buildNodeCompatRuntime('node', nodeRunCommand);
