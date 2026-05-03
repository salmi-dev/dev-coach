/**
 * Runtime detection — capability sniff (D1).
 *
 * Order matters: Deno is checked first (it ships its own `globalThis.Deno`),
 * then Bun (`globalThis.Bun`), then Node (`globalThis.process` with a Node
 * release). We deliberately avoid sniffing user-agent strings or
 * `process.versions` keys that other runtimes might mimic for compatibility.
 *
 * @module
 */

import type { RuntimeName } from './index.ts';

/**
 * Detect which runtime this code is executing on.
 *
 * @throws if the host cannot be identified as Deno, Bun, or Node — we do not
 * attempt graceful fallback because every code path downstream assumes one of
 * these three (filesystem + SQLite). Browsers and Cloudflare Workers are
 * explicitly out of scope (see openspec runtime-compat capability).
 */
export function detectRuntime(): RuntimeName {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;

  if (typeof g.Deno !== 'undefined' && typeof g.Deno.version?.deno === 'string') {
    return 'deno';
  }
  if (typeof g.Bun !== 'undefined' && typeof g.Bun.version === 'string') {
    return 'bun';
  }
  if (
    typeof g.process !== 'undefined' &&
    typeof g.process.versions?.node === 'string'
  ) {
    return 'node';
  }

  throw new Error(
    'Unsupported runtime: expected Deno, Bun, or Node.js. ' +
      'Browsers and Cloudflare Workers are not supported (filesystem + SQLite required).',
  );
}
