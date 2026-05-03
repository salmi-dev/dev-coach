/**
 * Runtime adapter — Node.js implementation.
 *
 * Most of the surface is shared with Bun via {@link buildNodeCompatRuntime}
 * (both expose `process` + the `node:` module namespace). The Node-specific
 * bit is `runCommand`, which uses `node:child_process.spawn` so we get full
 * stdio control (inherit / pipe / ignore per stream) without invoking a
 * shell or having to escape arguments.
 *
 * This module is only loaded when {@link detectRuntime} returns `"node"`; on
 * Deno and Bun hosts it is never evaluated.
 *
 * @module
 */

import { spawn } from 'node:child_process';
import type { CommandResult, RunCommandOpts, Runtime } from './index.ts';
import { buildNodeCompatRuntime } from './_node-compat.ts';

function nodeRunCommand(
  cmd: string,
  args: string[],
  opts: RunCommandOpts = {},
): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve, reject) => {
    const stdinMode = opts.stdinInherit ? 'inherit' : opts.stdin !== undefined ? 'pipe' : 'ignore';
    const stdoutMode = opts.stdoutInherit ? 'inherit' : 'pipe';
    const stderrMode = opts.stderrInherit ? 'inherit' : 'pipe';

    const child = spawn(cmd, args, {
      stdio: [stdinMode, stdoutMode, stderrMode],
    });

    let stdout = '';
    let stderr = '';
    if (!opts.stdoutInherit && child.stdout) {
      child.stdout.setEncoding('utf-8');
      child.stdout.on('data', (d) => {
        stdout += d;
      });
    }
    if (!opts.stderrInherit && child.stderr) {
      child.stderr.setEncoding('utf-8');
      child.stderr.on('data', (d) => {
        stderr += d;
      });
    }

    if (opts.stdin !== undefined && !opts.stdinInherit) {
      child.stdin?.end(opts.stdin);
    }

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/** The Node-backed runtime adapter instance. */
export const runtime: Runtime = buildNodeCompatRuntime('node', nodeRunCommand);
