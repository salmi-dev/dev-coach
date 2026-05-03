/**
 * Tests for the interactive picker (numeric fallback path).
 *
 * `__setFzfAvailableForTesting(false)` pins the picker to the deterministic numeric path so
 * tests don't spawn `fzf` even when it's installed locally.
 */

import { assertEquals } from '@std/assert';
import { __setFzfAvailableForTesting, pick } from '../src/utils/picker.ts';

/** Stub `Deno.stdin.readSync` and `Deno.stdout.writeSync` for the duration of `fn`. */
async function withStubbedIO<T>(input: string, fn: () => Promise<T> | T): Promise<T> {
  const origRead = Deno.stdin.readSync.bind(Deno.stdin);
  const origWrite = Deno.stdout.writeSync.bind(Deno.stdout);

  const encoder = new TextEncoder();
  const queue = encoder.encode(input);
  let pos = 0;

  // deno-lint-ignore no-explicit-any
  (Deno.stdin as any).readSync = (buf: Uint8Array): number | null => {
    if (pos >= queue.length) return null;
    const remaining = queue.length - pos;
    const n = Math.min(buf.length, remaining);
    buf.set(queue.subarray(pos, pos + n));
    pos += n;
    return n;
  };
  // Swallow writes (the prompt output is irrelevant to assertions).
  // deno-lint-ignore no-explicit-any
  (Deno.stdout as any).writeSync = (chunk: Uint8Array): number => chunk.length;

  try {
    return await fn();
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno.stdin as any).readSync = origRead;
    // deno-lint-ignore no-explicit-any
    (Deno.stdout as any).writeSync = origWrite;
  }
}

Deno.test('pick: empty list returns null', async () => {
  __setFzfAvailableForTesting(false);
  const res = await pick<string>([], (s) => s);
  assertEquals(res.item, null);
  assertEquals(res.index, -1);
});

Deno.test('pick: single item is auto-selected (no prompt)', async () => {
  __setFzfAvailableForTesting(false);
  const res = await pick(['only'], (s) => s);
  assertEquals(res.item, 'only');
  assertEquals(res.index, 0);
});

Deno.test('pick: numeric fallback selects by index', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta', 'gamma'];
  const res = await withStubbedIO('2\n', () => pick(items, (s) => s));
  assertEquals(res.index, 1);
  assertEquals(res.item, 'beta');
});

Deno.test('pick: numeric fallback returns null on empty input', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta'];
  const res = await withStubbedIO('\n', () => pick(items, (s) => s));
  assertEquals(res.item, null);
  assertEquals(res.index, -1);
});

Deno.test('pick: numeric fallback rejects out-of-range numbers', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta'];
  const res = await withStubbedIO('99\n', () => pick(items, (s) => s));
  assertEquals(res.item, null);
});

Deno.test('pick: numeric fallback rejects non-numeric input', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta'];
  const res = await withStubbedIO('foo\n', () => pick(items, (s) => s));
  assertEquals(res.item, null);
});

Deno.test('pick: selects first item with input "1"', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta', 'gamma'];
  const res = await withStubbedIO('1\n', () => pick(items, (s) => s));
  assertEquals(res.index, 0);
  assertEquals(res.item, 'alpha');
});
