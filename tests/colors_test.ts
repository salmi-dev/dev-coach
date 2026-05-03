/**
 * Tests for ANSI color helpers in `src/utils/colors.ts`.
 */

import { assert, assertEquals, assertStringIncludes } from '@std/assert';
import { c, isColorEnabled, setColorEnabled, stripAnsi } from '../src/utils/colors.ts';

Deno.test('setColorEnabled toggles color output', () => {
  setColorEnabled(true);
  assertEquals(isColorEnabled(), true);
  const colored = c.green('ok');
  assertStringIncludes(colored, '\x1b[32m');
  assertStringIncludes(colored, '\x1b[39m');

  setColorEnabled(false);
  assertEquals(isColorEnabled(), false);
  assertEquals(c.green('ok'), 'ok');
});

Deno.test('semantic helpers wrap with the right basic-color codes when enabled', () => {
  setColorEnabled(true);
  try {
    assertStringIncludes(c.success('x'), '\x1b[32m'); // green
    assertStringIncludes(c.error('x'), '\x1b[31m'); // red
    assertStringIncludes(c.warn('x'), '\x1b[33m'); // yellow
    assertStringIncludes(c.info('x'), '\x1b[36m'); // cyan
    assertStringIncludes(c.accent('x'), '\x1b[35m'); // magenta
    assertStringIncludes(c.bold('x'), '\x1b[1m');
    assertStringIncludes(c.dim('x'), '\x1b[2m');
  } finally {
    setColorEnabled(false);
  }
});

Deno.test('semantic helpers return plain strings when disabled', () => {
  setColorEnabled(false);
  assertEquals(c.success('x'), 'x');
  assertEquals(c.error('x'), 'x');
  assertEquals(c.warn('x'), 'x');
  assertEquals(c.info('x'), 'x');
  assertEquals(c.accent('x'), 'x');
  assertEquals(c.bold('x'), 'x');
  assertEquals(c.dim('x'), 'x');
});

Deno.test('stripAnsi removes color codes and leaves plain text intact', () => {
  assertEquals(stripAnsi('\x1b[31mhello\x1b[0m'), 'hello');
  assertEquals(stripAnsi('plain text'), 'plain text');
  assertEquals(stripAnsi(''), '');
  // Multiple sequences in one string.
  assertEquals(stripAnsi('\x1b[1m\x1b[32mok\x1b[39m\x1b[22m'), 'ok');
});

Deno.test('stripAnsi roundtrip: stripAnsi(c.green(x)) === x', () => {
  setColorEnabled(true);
  try {
    assertEquals(stripAnsi(c.green('hello')), 'hello');
    assertEquals(stripAnsi(c.bold(c.cyan('nested'))), 'nested');
  } finally {
    setColorEnabled(false);
  }
});

Deno.test('color helpers are no-ops on empty strings', () => {
  setColorEnabled(true);
  try {
    // Wrapping empty still yields escape codes — that's fine, but stripAnsi must collapse to ''.
    assertEquals(stripAnsi(c.green('')), '');
  } finally {
    setColorEnabled(false);
  }
});

Deno.test('printBanner output (smoke test): contains skill name; falls back to single line for unknown skill', async () => {
  setColorEnabled(false);
  const { printBanner } = await import('../src/utils/ascii.ts');

  // Capture stdout.
  const origWrite = Deno.stdout.writeSync.bind(Deno.stdout);
  let captured = '';
  // deno-lint-ignore no-explicit-any
  (Deno.stdout as any).writeSync = (chunk: Uint8Array): number => {
    captured += new TextDecoder().decode(chunk);
    return chunk.length;
  };
  // console.log uses Deno.core.print → bypass capture; use a different stub.
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    captured += args.map(String).join(' ') + '\n';
  };

  try {
    printBanner('ask');
    assertStringIncludes(captured, 'coach:ask');
    assert(captured.includes('╭') || captured.includes('│'));

    captured = '';
    printBanner('madeup-skill');
    assertEquals(captured.trim(), 'coach:madeup-skill');
  } finally {
    console.log = origLog;
    // deno-lint-ignore no-explicit-any
    (Deno.stdout as any).writeSync = origWrite;
  }
});
