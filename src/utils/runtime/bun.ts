/**
 * Runtime adapter — Bun implementation.
 *
 * Most of the surface is shared with Node via {@link buildNodeCompatRuntime}
 * (Bun fully supports the `node:` module namespace and the `process` global).
 * The Bun-specific bit is `runCommand`, which uses `Bun.spawn` for parity
 * with Bun's own ergonomics (faster startup than spawning a child shell).
 *
 * This module is only loaded when {@link detectRuntime} returns `"bun"`; on
 * Deno and Node hosts it is never evaluated.
 *
 * @module
 */

import type { CommandResult, Runtime } from './index.ts';
import { buildNodeCompatRuntime } from './_node-compat.ts';

// Bun's globalThis.Bun is not declared in the @types/node we have available
// in CI. Cast at the boundary; downstream code uses the typed Runtime.
// deno-lint-ignore no-explicit-any
const BunGlobal: any = (globalThis as any).Bun;

async function bunRunCommand(
  cmd: string,
  args: string[],
  opts: { stdin?: string } = {},
): Promise<CommandResult> {
  const proc = BunGlobal.spawn([cmd, ...args], {
    stdin: opts.stdin !== undefined ? new TextEncoder().encode(opts.stdin) : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code: number = await proc.exited;
  return { code, stdout, stderr };
}

/** The Bun-backed runtime adapter instance. */
export const runtime: Runtime = buildNodeCompatRuntime('bun', bunRunCommand);
