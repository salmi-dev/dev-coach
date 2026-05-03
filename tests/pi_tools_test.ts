import './_db_warmup.ts';
/**
 * Tests for pi custom tools (`coachSave`, `coachSearch`, `coachLog`, `coachCopy`).
 *
 * Each tool gets/closes its own DB connection internally, so tests use isolated XDG_DATA_HOME
 * so the production database is never touched.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import { join } from '@std/path';
import { coachSave } from '../src/pi/tools/coach-save.ts';
import { coachSearch } from '../src/pi/tools/coach-search.ts';
import { coachLog } from '../src/pi/tools/coach-log.ts';
import { coachCopy } from '../src/pi/tools/coach-copy.ts';

async function setupIsolatedEnv(): Promise<{ lib: string; cleanup: () => Promise<void> }> {
  const root = await Deno.makeTempDir({ prefix: 'coach-pi-tools-' });
  const lib = join(root, 'library');
  const dataDir = join(root, 'data');
  const configDir = join(root, 'config');

  await Deno.mkdir(join(lib, 'tldr'), { recursive: true });
  await Deno.mkdir(join(lib, 'snippets'), { recursive: true });
  await Deno.mkdir(dataDir, { recursive: true });
  await Deno.mkdir(join(configDir, 'dev-coach'), { recursive: true });

  await Deno.writeTextFile(
    join(configDir, 'dev-coach', 'config.yaml'),
    `library_path: ${lib}\nprimary_languages: []\nframeworks: []\nresponse_style: concise\nos: linux\n`,
  );

  Deno.env.set('XDG_DATA_HOME', dataDir);
  Deno.env.set('XDG_CONFIG_HOME', configDir);

  return {
    lib,
    cleanup: async () => {
      Deno.env.delete('XDG_DATA_HOME');
      Deno.env.delete('XDG_CONFIG_HOME');
      try {
        await Deno.remove(root, { recursive: true });
      } catch { /* ignore */ }
    },
  };
}

Deno.test('coachSave: writes a TLDR and returns its relative path', async () => {
  const env = await setupIsolatedEnv();
  try {
    const res = await coachSave({
      type: 'tldr',
      title: 'Pi Tool Test',
      content: '# body\n\nsome content',
      tags: ['pi', 'demo'],
    });
    assertStringIncludes(res.path, 'tldr/');
    assertStringIncludes(res.path, 'pi-tool-test');
  } finally {
    await env.cleanup();
  }
});

Deno.test('coachSearch: returns the saved item via FTS', async () => {
  const env = await setupIsolatedEnv();
  try {
    await coachSave({
      type: 'tldr',
      title: 'Searchable Title',
      content: 'mention of redis here',
      tags: ['search'],
    });
    // Search by type only (no query) — ensures the row was indexed.
    const hits = await coachSearch({ type: 'tldr' });
    assertEquals(hits.length >= 1, true);
    assertStringIncludes(hits[0].title, 'Searchable');
  } finally {
    await env.cleanup();
  }
});

Deno.test('coachLog: appends a session row and returns its id', async () => {
  const env = await setupIsolatedEnv();
  try {
    const res = await coachLog({ mode: 'ask', lang: 'python', query: 'hi' });
    assertEquals(typeof res.sessionId, 'number');
    assertEquals(res.sessionId > 0, true);
  } finally {
    await env.cleanup();
  }
});

Deno.test('coachCopy: returns success boolean (skipped if no clipboard tool)', async () => {
  const res = await coachCopy({ text: 'hello' });
  // We can't guarantee clipboard availability in all CI environments, but the call must complete.
  assertEquals(typeof res.success, 'boolean');
});
