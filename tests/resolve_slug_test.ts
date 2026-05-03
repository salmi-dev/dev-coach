/**
 * Tests for `resolveSlug` and `listSlugs` in src/storage/library.ts.
 */

import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { listSlugs, resolveSlug } from '../src/storage/library.ts';

async function makeLib(): Promise<string> {
  const lib = await Deno.makeTempDir({ prefix: 'coach-resolve-' });
  await Deno.mkdir(join(lib, 'tldr'), { recursive: true });
  await Deno.mkdir(join(lib, 'snippets', 'python'), { recursive: true });
  await Deno.mkdir(join(lib, 'snippets', 'js'), { recursive: true });

  await Deno.writeTextFile(join(lib, 'tldr', 'reverse-a-list.md'), '# x');
  await Deno.writeTextFile(join(lib, 'tldr', 'parse-json.md'), '# x');
  await Deno.writeTextFile(join(lib, 'snippets', 'python', 'parse-json.md'), '# x');
  await Deno.writeTextFile(join(lib, 'snippets', 'js', 'parse-json.md'), '# x');
  await Deno.writeTextFile(join(lib, 'snippets', 'python', 'foo-bar.md'), '# x');
  return lib;
}

Deno.test('listSlugs returns all tldrs sorted', async () => {
  const lib = await makeLib();
  const all = await listSlugs('tldr', lib);
  assertEquals(all.map((m) => m.slug), ['parse-json', 'reverse-a-list']);
  assertEquals(all[0].lang, null);
});

Deno.test('listSlugs spans snippet language subfolders', async () => {
  const lib = await makeLib();
  const all = await listSlugs('snippet', lib);
  assertEquals(all.length, 3);
  const langs = new Set(all.map((m) => m.lang));
  assertEquals(langs, new Set(['python', 'js']));
});

Deno.test('resolveSlug exact match returns single item', async () => {
  const lib = await makeLib();
  const matches = await resolveSlug('tldr', 'parse-json', lib);
  assertEquals(matches.length, 1);
  assertEquals(matches[0].slug, 'parse-json');
});

Deno.test('resolveSlug prefix uniquely identifies', async () => {
  const lib = await makeLib();
  const matches = await resolveSlug('tldr', 'reverse', lib);
  assertEquals(matches.length, 1);
  assertEquals(matches[0].slug, 'reverse-a-list');
});

Deno.test('resolveSlug ambiguous across snippet languages returns multiple', async () => {
  const lib = await makeLib();
  const matches = await resolveSlug('snippet', 'parse-json', lib);
  assertEquals(matches.length, 2);
});

Deno.test('resolveSlug substring fallback', async () => {
  const lib = await makeLib();
  const matches = await resolveSlug('snippet', 'foo', lib);
  assertEquals(matches.length, 1);
  assertEquals(matches[0].slug, 'foo-bar');
});

Deno.test('resolveSlug no match returns empty', async () => {
  const lib = await makeLib();
  const matches = await resolveSlug('tldr', 'nonexistent', lib);
  assertEquals(matches.length, 0);
});

Deno.test('listSlugs handles missing directories gracefully', async () => {
  const lib = await Deno.makeTempDir({ prefix: 'coach-resolve-empty-' });
  const all = await listSlugs('tldr', lib);
  assertEquals(all, []);
});
