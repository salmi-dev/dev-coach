import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { exists } from '@std/fs';
import { Database } from '@db/sqlite';
import { runMigrations } from '../src/db/migrations.ts';
import { deleteItem, listItems, readItem, saveItem, toSlug } from '../src/storage/library.ts';
import { rebuildIndex } from '../src/storage/sync.ts';
import { search } from '../src/storage/search.ts';
import { logSession } from '../src/db/logger.ts';
import { regenerateDashboard } from '../src/storage/dashboard.ts';
import { serializeFrontmatter } from '../src/storage/frontmatter.ts';

// Setup: temp dir + in-memory DB
const TEST_LIB = await Deno.makeTempDir({ prefix: 'coach-storage-test-' });
await Deno.mkdir(join(TEST_LIB, 'snippets'), { recursive: true });
await Deno.mkdir(join(TEST_LIB, 'tldr'), { recursive: true });
await Deno.mkdir(join(TEST_LIB, 'projects'), { recursive: true });

function freshDb(): Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

// ── Slug Tests ─────────────────────────────────────────────────

Deno.test('toSlug converts title to kebab-case', () => {
  assertEquals(toSlug('Parse JSON with Serde'), 'parse-json-with-serde');
});

Deno.test('toSlug strips special characters', () => {
  assertEquals(toSlug("What's a closure?"), 'whats-a-closure');
});

Deno.test('toSlug collapses multiple hyphens', () => {
  assertEquals(toSlug('hello---world'), 'hello-world');
});

// ── Save / Read / Delete Tests ─────────────────────────────────

Deno.test('saveItem creates snippet file with frontmatter', async () => {
  const db = freshDb();
  const path = await saveItem(db, 'snippet', '# JSON Parse\n\nCode here.', {
    title: 'JSON Parse',
    tags: ['json', 'serde'],
    lang: 'rust',
    source: 'coach:sandbox',
  }, TEST_LIB);

  assertEquals(path, 'snippets/rust/json-parse.md');
  assertEquals(await exists(join(TEST_LIB, path)), true);

  // Verify DB index
  const items = listItems(db, 'snippet');
  assertEquals(items.length, 1);
  assertEquals(items[0].title, 'JSON Parse');

  db.close();
});

Deno.test('saveItem creates tldr file', async () => {
  const db = freshDb();
  const path = await saveItem(db, 'tldr', 'Docker basics info.', {
    title: 'Docker Basics',
    tags: ['docker'],
    source: 'coach:ask',
  }, TEST_LIB);

  assertEquals(path, 'tldr/docker-basics.md');
  assertEquals(await exists(join(TEST_LIB, path)), true);
  db.close();
});

Deno.test('readItem returns metadata and content', async () => {
  const item = await readItem('snippets/rust/json-parse.md', TEST_LIB);
  assertEquals(item.metadata.title, 'JSON Parse');
  assertEquals(item.content.includes('Code here'), true);
});

Deno.test('deleteItem removes file and DB entry', async () => {
  const db = freshDb();
  // Save first
  const path = await saveItem(db, 'snippet', 'Temp content', {
    title: 'Temp Item',
    tags: ['temp'],
    lang: 'python',
    source: 'test',
  }, TEST_LIB);

  assertEquals(await exists(join(TEST_LIB, path)), true);

  // Delete
  await deleteItem(db, path, TEST_LIB);
  assertEquals(await exists(join(TEST_LIB, path)), false);

  const items = listItems(db, 'snippet');
  const found = items.find((i) => i.path === path);
  assertEquals(found, undefined);

  db.close();
});

Deno.test('slug dedup appends -2 for existing files', async () => {
  const db = freshDb();

  // First save
  await saveItem(db, 'tldr', 'First', {
    title: 'Unique Test',
    tags: [],
    source: 'test',
  }, TEST_LIB);

  // Second save with same title
  const path2 = await saveItem(db, 'tldr', 'Second', {
    title: 'Unique Test',
    tags: [],
    source: 'test',
  }, TEST_LIB);

  assertEquals(path2, 'tldr/unique-test-2.md');
  db.close();
});

// ── Search Tests ───────────────────────────────────────────────

Deno.test('search by FTS text finds matching items', () => {
  const db = freshDb();

  // Insert test data
  db.prepare(
    'INSERT INTO items (type, title, path, lang, tags, created) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('snippet', 'Parse JSON with Serde', 'snippets/rust/json.md', 'rust', '["json","serde"]', '2026-04-30');

  db.prepare(
    'INSERT INTO items (type, title, path, lang, tags, created) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('snippet', 'Error Handling', 'snippets/rust/errors.md', 'rust', '["errors"]', '2026-04-30');

  db.prepare(
    'INSERT INTO items (type, title, path, lang, tags, created) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('tldr', 'Docker Guide', 'tldr/docker.md', null, '["docker"]', '2026-04-30');

  const results = search(db, { query: 'serde' });
  assertEquals(results.length, 1);
  assertEquals(results[0].title, 'Parse JSON with Serde');

  db.close();
});

Deno.test('search by type filters correctly', () => {
  const db = freshDb();

  db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('snippet', 'S1', 's1.md', '[]', '2026-04-30');
  db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('tldr', 'T1', 't1.md', '[]', '2026-04-30');
  db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('snippet', 'S2', 's2.md', '[]', '2026-04-30');

  const results = search(db, { type: 'snippet' });
  assertEquals(results.length, 2);

  db.close();
});

Deno.test('search by lang filters correctly', () => {
  const db = freshDb();

  db.prepare('INSERT INTO items (type, title, path, lang, tags, created) VALUES (?, ?, ?, ?, ?, ?)').run('snippet', 'R1', 'r1.md', 'rust', '[]', '2026-04-30');
  db.prepare('INSERT INTO items (type, title, path, lang, tags, created) VALUES (?, ?, ?, ?, ?, ?)').run(
    'snippet',
    'P1',
    'p1.md',
    'python',
    '[]',
    '2026-04-30',
  );

  const results = search(db, { lang: 'rust' });
  assertEquals(results.length, 1);
  assertEquals(results[0].title, 'R1');

  db.close();
});

Deno.test('search by tags matches any', () => {
  const db = freshDb();

  db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('snippet', 'A', 'a.md', '["json","parsing"]', '2026-04-30');
  db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('snippet', 'B', 'b.md', '["xml"]', '2026-04-30');

  const results = search(db, { tags: ['json'] });
  assertEquals(results.length, 1);
  assertEquals(results[0].title, 'A');

  db.close();
});

Deno.test('search with limit', () => {
  const db = freshDb();

  for (let i = 0; i < 10; i++) {
    db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('snippet', `Item ${i}`, `i${i}.md`, '[]', '2026-04-30');
  }

  const results = search(db, { limit: 5 });
  assertEquals(results.length, 5);

  db.close();
});

Deno.test('search with no matches returns empty', () => {
  const db = freshDb();
  const results = search(db, { query: 'nonexistent' });
  assertEquals(results.length, 0);
  db.close();
});

// ── Session Logger Tests ───────────────────────────────────────

Deno.test('logSession inserts and returns ID', () => {
  const db = freshDb();

  const id = logSession(db, {
    mode: 'ask',
    lang: 'rust',
    tags: ['json'],
    query: 'how to parse json',
    duration_s: 30,
  });

  assertEquals(typeof id, 'number');
  assertEquals(id > 0, true);

  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown>;
  assertEquals(row.mode, 'ask');
  assertEquals(row.lang, 'rust');

  db.close();
});

Deno.test('logSession handles optional fields', () => {
  const db = freshDb();

  const id = logSession(db, { mode: 'sandbox' });
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown>;
  assertEquals(row.mode, 'sandbox');
  assertEquals(row.lang, null);
  assertEquals(row.tags, null);

  db.close();
});

// ── Rebuild Index Tests ────────────────────────────────────────

Deno.test('rebuildIndex reconstructs DB from files', async () => {
  const db = freshDb();
  const tempLib = await Deno.makeTempDir({ prefix: 'coach-rebuild-' });
  await Deno.mkdir(join(tempLib, 'snippets', 'rust'), { recursive: true });
  await Deno.mkdir(join(tempLib, 'tldr'), { recursive: true });

  // Write files manually
  await Deno.writeTextFile(
    join(tempLib, 'snippets', 'rust', 'test.md'),
    serializeFrontmatter({ title: 'Test Snippet', tags: ['test'], lang: 'rust', created: '2026-04-30', source: 'test' }, 'Content'),
  );
  await Deno.writeTextFile(
    join(tempLib, 'tldr', 'test.md'),
    serializeFrontmatter({ title: 'Test TLDR', tags: ['test'], created: '2026-04-30', source: 'test' }, 'TLDR content'),
  );

  const count = await rebuildIndex(db, tempLib);
  assertEquals(count, 2);

  const items = listItems(db);
  assertEquals(items.length, 2);

  await Deno.remove(tempLib, { recursive: true });
  db.close();
});

// ── Dashboard Tests ────────────────────────────────────────────

Deno.test('regenerateDashboard creates README with content', async () => {
  const db = freshDb();
  const tempLib = await Deno.makeTempDir({ prefix: 'coach-dash-' });

  // Add some data
  db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('snippet', 'S1', 'snippets/s1.md', '[]', '2026-04-30');
  db.prepare('INSERT INTO items (type, title, path, tags, created) VALUES (?, ?, ?, ?, ?)').run('tldr', 'T1', 'tldr/t1.md', '[]', '2026-04-30');
  logSession(db, { mode: 'ask', lang: 'rust' });
  logSession(db, { mode: 'sandbox', lang: 'python' });

  await regenerateDashboard(db, tempLib);

  const readme = await Deno.readTextFile(join(tempLib, 'README.md'));
  assertEquals(readme.includes('Dev Coach'), true);
  assertEquals(readme.includes('Total sessions: 2'), true);
  assertEquals(readme.includes('Snippets: 1'), true);
  assertEquals(readme.includes('[S1]'), true);
  assertEquals(readme.includes('[T1]'), true);

  await Deno.remove(tempLib, { recursive: true });
  db.close();
});

Deno.test('regenerateDashboard handles empty library', async () => {
  const db = freshDb();
  const tempLib = await Deno.makeTempDir({ prefix: 'coach-dash-empty-' });

  await regenerateDashboard(db, tempLib);

  const readme = await Deno.readTextFile(join(tempLib, 'README.md'));
  assertEquals(readme.includes('Total sessions: 0'), true);
  assertEquals(readme.includes('No snippets yet'), true);

  await Deno.remove(tempLib, { recursive: true });
  db.close();
});

// ── Non-interactive save (task 7.4) ────────────────────────────

Deno.test('direct saveItem works without prompts', async () => {
  const db = freshDb();
  const tempLib = await Deno.makeTempDir({ prefix: 'coach-direct-' });
  await Deno.mkdir(join(tempLib, 'snippets', 'go'), { recursive: true });

  const path = await saveItem(db, 'snippet', 'Go code here', {
    title: 'Go Channels',
    tags: ['go', 'concurrency'],
    lang: 'go',
    source: 'coach:sandbox',
  }, tempLib);

  assertEquals(path, 'snippets/go/go-channels.md');
  assertEquals(await exists(join(tempLib, path)), true);

  // Verify dashboard was regenerated
  assertEquals(await exists(join(tempLib, 'README.md')), true);

  await Deno.remove(tempLib, { recursive: true });
  db.close();
});

// Cleanup
addEventListener('unload', () => {
  try {
    Deno.removeSync(TEST_LIB, { recursive: true });
  } catch { /* ignore */ }
});
