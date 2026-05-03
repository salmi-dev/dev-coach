/**
 * Cross-runtime: branches of `osPlatform()` from `_node-compat.ts`.
 *
 * The live process can only ever report one platform value, so the live
 * `runtime.osPlatform()` call in `runtime.test.ts` covers exactly one
 * branch of the switch. This file feeds synthetic platform strings to the
 * exported helper so all five branches are covered on every host.
 *
 * @module
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { osPlatform } from '../../src/utils/runtime/_node-compat.ts';

test('osPlatform("darwin") -> "darwin"', () => {
  assert.equal(osPlatform('darwin'), 'darwin');
});

test('osPlatform("linux") -> "linux"', () => {
  assert.equal(osPlatform('linux'), 'linux');
});

test('osPlatform("win32") -> "windows"', () => {
  assert.equal(osPlatform('win32'), 'windows');
});

test('osPlatform("freebsd") -> "freebsd"', () => {
  assert.equal(osPlatform('freebsd'), 'freebsd');
});

test('osPlatform("aix") -> "other"', () => {
  assert.equal(osPlatform('aix'), 'other');
});

test('osPlatform("sunos") -> "other"', () => {
  assert.equal(osPlatform('sunos'), 'other');
});

test('osPlatform() with no arg returns a known value for the live host', () => {
  const v = osPlatform();
  assert.ok(['darwin', 'linux', 'windows', 'freebsd', 'other'].includes(v), `got ${v}`);
});
