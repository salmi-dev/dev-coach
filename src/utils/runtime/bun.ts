/**
 * Runtime adapter — Bun implementation (placeholder).
 *
 * This stub exists so static analysis (`deno check`, `deno doc`) can resolve
 * the dynamic import in `./index.ts`. The full implementation lands in Track
 * B Group 3 (tasks 3.1, 3.3, 3.4); see openspec change
 * `boost-jsr-score-and-runtime-compat`.
 *
 * Until then, calling `runtime` on a Bun host throws with a clear message.
 *
 * @module
 */

import type { Runtime } from './index.ts';
import { notYetImplemented } from './_stub.ts';

export const runtime: Runtime = notYetImplemented('bun');
