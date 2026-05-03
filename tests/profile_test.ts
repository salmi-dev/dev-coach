import './_db_warmup.ts';
import { assertEquals } from '@std/assert';
import { type Database, openDb } from '../src/db/sqlite/index.ts';
import { runMigrations } from '../src/db/migrations.ts';
import { calculateStreak, getProfile, monthOverMonthDelta, rebuildProfile } from '../src/db/profile.ts';

async function freshDb(): Promise<Database> {
  const db = await openDb(':memory:');
  runMigrations(db);
  return db;
}

function insertSession(db: Database, ts: string, mode: string, lang?: string, tags?: string[]) {
  db.prepare('INSERT INTO sessions (ts, mode, lang, tags) VALUES (?, ?, ?, ?)').run(
    ts,
    mode,
    lang ?? null,
    tags ? JSON.stringify(tags) : null,
  );
}

Deno.test('rebuildProfile computes primary_languages', async () => {
  const db = await freshDb();
  insertSession(db, '2026-04-30T10:00:00Z', 'ask', 'rust');
  insertSession(db, '2026-04-30T11:00:00Z', 'ask', 'rust');
  insertSession(db, '2026-04-30T12:00:00Z', 'ask', 'python');

  rebuildProfile(db);
  const langs = getProfile(db, 'primary_languages') as string[];
  assertEquals(langs[0], 'rust');
  assertEquals(langs.includes('python'), true);
  db.close();
});

Deno.test('rebuildProfile handles empty sessions', async () => {
  const db = await freshDb();
  rebuildProfile(db);
  const langs = getProfile(db, 'primary_languages') as string[];
  assertEquals(langs, []);
  db.close();
});

Deno.test('calculateStreak counts consecutive days', async () => {
  const db = await freshDb();
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString();

  insertSession(db, today, 'ask');
  insertSession(db, yesterday, 'ask');
  insertSession(db, dayBefore, 'ask');

  assertEquals(calculateStreak(db), 3);
  db.close();
});

Deno.test('calculateStreak returns 0 when no session today', async () => {
  const db = await freshDb();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  insertSession(db, yesterday, 'ask');
  assertEquals(calculateStreak(db), 0);
  db.close();
});

Deno.test('calculateStreak returns 1 for only today', async () => {
  const db = await freshDb();
  insertSession(db, new Date().toISOString(), 'ask');
  assertEquals(calculateStreak(db), 1);
  db.close();
});

Deno.test('monthOverMonthDelta computes correctly', async () => {
  const db = await freshDb();
  const now = new Date();
  const thisMonth = now.toISOString();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const prevMonth = prev.toISOString();

  insertSession(db, thisMonth, 'ask');
  insertSession(db, thisMonth, 'ask');
  insertSession(db, prevMonth, 'ask');

  const result = monthOverMonthDelta(db);
  assertEquals(result.current, 2);
  assertEquals(result.previous, 1);
  assertEquals(result.delta, 1);
  db.close();
});
