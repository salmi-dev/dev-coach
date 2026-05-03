/**
 * Cross-runtime line reader for interactive CLI prompts.
 *
 * Uses `node:readline/promises` under the hood, which is supported natively
 * on Bun and Node and via Deno's node-compat layer on Deno. This avoids
 * adding a sync stdin op to the {@link runtime} adapter for what is purely
 * a CLI-prompt concern.
 *
 * The reader can be replaced via {@link __setReadLineForTesting} so unit
 * tests don't have to touch real stdin.
 *
 * @module
 */

import { createInterface } from 'node:readline/promises';
import process from 'node:process';
import { runtime } from './runtime/index.ts';

async function defaultReadLine(prompt: string): Promise<string | null> {
  // Non-interactive (piped stdin, CI, tests): readline would block forever
  // waiting for input that will never arrive. Match the old Deno.stdin.readSync
  // behaviour: return null immediately so callers can skip the prompt.
  if (!runtime.stdin.isTerminal()) return null;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(prompt);
  } catch {
    return null;
  } finally {
    rl.close();
  }
}

let impl: (prompt: string) => Promise<string | null> = defaultReadLine;

/** Read a line from stdin after writing `prompt`. Returns `null` on EOF / abort. */
export function readPromptLine(prompt: string): Promise<string | null> {
  return impl(prompt);
}

/**
 * Override the line reader. Test-only seam — pass `null` to reset.
 */
export function __setReadLineForTesting(
  fn: ((prompt: string) => Promise<string | null>) | null,
): void {
  impl = fn ?? defaultReadLine;
}
