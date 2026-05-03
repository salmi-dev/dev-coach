/**
 * Tests for shell-aliases install/uninstall using a temp rc file.
 */

import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert';
import { ALIAS_BLOCK_END, ALIAS_BLOCK_START, buildAliasBlock, installAliases, uninstallAliases } from '../src/utils/shell-aliases.ts';

async function makeRc(initial = ''): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: 'coach-rc-' });
  const rc = `${dir}/.zshrc`;
  if (initial) await Deno.writeTextFile(rc, initial);
  return rc;
}

Deno.test('installAliases on missing rc creates file with block', async () => {
  const rc = await makeRc();
  const res = await installAliases(rc, 'zsh');
  assertEquals(res.changed, true);
  const content = await Deno.readTextFile(rc);
  assertStringIncludes(content, ALIAS_BLOCK_START);
  assertStringIncludes(content, "alias c-tldr='coach tldr'");
  assertStringIncludes(content, "alias c-snip='coach snippet'");
  assertStringIncludes(content, ALIAS_BLOCK_END);
});

Deno.test('installAliases on empty file appends block', async () => {
  const rc = await makeRc('');
  const res = await installAliases(rc, 'zsh');
  assertEquals(res.changed, true);
  const content = await Deno.readTextFile(rc);
  assertStringIncludes(content, buildAliasBlock());
});

Deno.test('installAliases preserves surrounding lines', async () => {
  const rc = await makeRc('export FOO=bar\nalias l=ls\n');
  await installAliases(rc, 'zsh');
  const content = await Deno.readTextFile(rc);
  assertStringIncludes(content, 'export FOO=bar');
  assertStringIncludes(content, 'alias l=ls');
  assertStringIncludes(content, ALIAS_BLOCK_START);
});

Deno.test('installAliases is idempotent (no duplication)', async () => {
  const rc = await makeRc();
  await installAliases(rc, 'zsh');
  await installAliases(rc, 'zsh');
  const content = await Deno.readTextFile(rc);
  const occurrences = content.split(ALIAS_BLOCK_START).length - 1;
  assertEquals(occurrences, 1);
});

Deno.test('installAliases replaces existing block contents', async () => {
  const rc = await makeRc(`pre\n${ALIAS_BLOCK_START}\nalias old='echo old'\n${ALIAS_BLOCK_END}\npost\n`);
  const res = await installAliases(rc, 'zsh');
  assertEquals(res.changed, true);
  const content = await Deno.readTextFile(rc);
  assertStringIncludes(content, 'pre');
  assertStringIncludes(content, 'post');
  assertStringIncludes(content, "alias c-tldr='coach tldr'");
  // Old alias must be gone.
  assertEquals(content.includes("alias old='echo old'"), false);
});

Deno.test('uninstallAliases removes the block only', async () => {
  const rc = await makeRc(`keep-before\n${ALIAS_BLOCK_START}\nalias c-tldr='coach tldr'\n${ALIAS_BLOCK_END}\nkeep-after\n`);
  const res = await uninstallAliases(rc, 'zsh');
  assertEquals(res.changed, true);
  const content = await Deno.readTextFile(rc);
  assertStringIncludes(content, 'keep-before');
  assertStringIncludes(content, 'keep-after');
  assertEquals(content.includes(ALIAS_BLOCK_START), false);
});

Deno.test('uninstallAliases on absent block is a no-op', async () => {
  const rc = await makeRc('export FOO=bar\n');
  const res = await uninstallAliases(rc, 'zsh');
  assertEquals(res.changed, false);
  const content = await Deno.readTextFile(rc);
  assertEquals(content, 'export FOO=bar\n');
});

Deno.test('uninstallAliases on missing file is a no-op', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'coach-rc-missing-' });
  const rc = `${dir}/nope.zshrc`;
  const res = await uninstallAliases(rc, 'zsh');
  assertEquals(res.changed, false);
});

Deno.test('install throws on unsupported shell when no override given', async () => {
  const original = Deno.env.get('SHELL');
  Deno.env.set('SHELL', '/usr/bin/fish');
  try {
    await assertRejects(() => installAliases(), Error, 'Unsupported shell');
  } finally {
    if (original !== undefined) Deno.env.set('SHELL', original);
    else Deno.env.delete('SHELL');
  }
});
