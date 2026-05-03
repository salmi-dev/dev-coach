/**
 * Cross-runtime: detectRuntime() against synthetic globals.
 *
 * The live runtime test in `runtime.test.ts` only ever exercises one
 * branch of detectRuntime() (whichever host is running the test). This
 * file injects synthetic globalThis-shaped objects so all four code paths
 * (deno / bun / node / unknown) are covered on every host.
 *
 * @module
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { detectRuntime } from '../../src/utils/runtime/detect.ts';

test('detectRuntime returns "deno" when globalThis.Deno.version.deno is a string', () => {
  assert.equal(detectRuntime({ Deno: { version: { deno: '2.0.0' } } }), 'deno');
});

test('detectRuntime returns "bun" when globalThis.Bun.version is a string', () => {
  assert.equal(detectRuntime({ Bun: { version: '1.3.0' } }), 'bun');
});

test('detectRuntime returns "node" when globalThis.process.versions.node is a string', () => {
  assert.equal(detectRuntime({ process: { versions: { node: '22.0.0' } } }), 'node');
});

test('detectRuntime prefers deno when multiple globals are present', () => {
  assert.equal(
    detectRuntime({
      Deno: { version: { deno: '2.0.0' } },
      Bun: { version: '1.3.0' },
      process: { versions: { node: '22.0.0' } },
    }),
    'deno',
  );
});

test('detectRuntime prefers bun over node', () => {
  assert.equal(
    detectRuntime({
      Bun: { version: '1.3.0' },
      process: { versions: { node: '22.0.0' } },
    }),
    'bun',
  );
});

test('detectRuntime throws when no runtime markers are present', () => {
  assert.throws(() => detectRuntime({}), /Unsupported runtime/);
});

test('detectRuntime throws when Deno marker is malformed', () => {
  assert.throws(() => detectRuntime({ Deno: {} }), /Unsupported runtime/);
});

test('detectRuntime throws when Bun version is not a string', () => {
  assert.throws(() => detectRuntime({ Bun: { version: 1 } }), /Unsupported runtime/);
});

test('detectRuntime throws when process.versions.node is missing', () => {
  assert.throws(() => detectRuntime({ process: { versions: {} } }), /Unsupported runtime/);
});

test('detectRuntime default invocation returns one of the three names', () => {
  const name = detectRuntime();
  assert.ok(['deno', 'bun', 'node'].includes(name), `got ${name}`);
});
