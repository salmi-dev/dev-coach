/**
 * Tests for the interactive picker (numeric fallback path).
 *
 * `__setFzfAvailableForTesting(false)` pins the picker to the deterministic numeric path so
 * tests don't spawn `fzf` even when it's installed locally.
 *
 * `__setReadLineForTesting(fn)` injects a deterministic input source instead of reading
 * from real stdin — keeps the suite cross-runtime and side-effect free.
 */

import { assertEquals } from '@std/assert';
import { __setFzfAvailableForTesting, __setReadLineForTesting, pick } from '../src/utils/picker.ts';

/** Run `fn` with a stubbed line reader that returns the given input on first call (then EOF). */
async function withInput<T>(input: string | null, fn: () => Promise<T>): Promise<T> {
  __setReadLineForTesting(() => Promise.resolve(input));
  try {
    return await fn();
  } finally {
    __setReadLineForTesting(null);
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
  const res = await withInput('2', () => pick(items, (s) => s));
  assertEquals(res.index, 1);
  assertEquals(res.item, 'beta');
});

Deno.test('pick: numeric fallback returns null on empty input', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta'];
  const res = await withInput('', () => pick(items, (s) => s));
  assertEquals(res.item, null);
  assertEquals(res.index, -1);
});

Deno.test('pick: numeric fallback returns null on EOF / abort', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta'];
  const res = await withInput(null, () => pick(items, (s) => s));
  assertEquals(res.item, null);
  assertEquals(res.index, -1);
});

Deno.test('pick: numeric fallback rejects out-of-range numbers', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta'];
  const res = await withInput('99', () => pick(items, (s) => s));
  assertEquals(res.item, null);
});

Deno.test('pick: numeric fallback rejects non-numeric input', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta'];
  const res = await withInput('foo', () => pick(items, (s) => s));
  assertEquals(res.item, null);
});

Deno.test('pick: selects first item with input "1"', async () => {
  __setFzfAvailableForTesting(false);
  const items = ['alpha', 'beta', 'gamma'];
  const res = await withInput('1', () => pick(items, (s) => s));
  assertEquals(res.index, 0);
  assertEquals(res.item, 'alpha');
});
