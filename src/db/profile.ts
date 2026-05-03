/**
 * Profile builder — infer user profile from session history.
 */

import { Database } from '@db/sqlite';

/**
 * Rebuild profile from sessions table. Writes computed data to profile table.
 */
export function rebuildProfile(db: Database): void {
  // Primary languages (top 5 by session count)
  const langs = db.prepare(
    `SELECT lang, COUNT(*) as c FROM sessions WHERE lang IS NOT NULL
     GROUP BY lang ORDER BY c DESC LIMIT 5`,
  ).all() as Array<{ lang: string; c: number }>;
  setProfile(db, 'primary_languages', langs.map((r) => r.lang));

  // Peak hours (top 3 by session count)
  const hours = db.prepare(
    `SELECT CAST(strftime('%H', ts) AS INTEGER) as hour, COUNT(*) as c
     FROM sessions GROUP BY hour ORDER BY c DESC LIMIT 3`,
  ).all() as Array<{ hour: number; c: number }>;
  setProfile(db, 'peak_hours', hours.map((r) => r.hour));

  // Favorite modes
  const modes = db.prepare(
    `SELECT mode, COUNT(*) as c FROM sessions GROUP BY mode ORDER BY c DESC`,
  ).all() as Array<{ mode: string; c: number }>;
  setProfile(db, 'favorite_modes', modes.map((r) => r.mode));

  // Recent topics (top 10 tags from last 30 days)
  const recentSessions = db.prepare(
    `SELECT tags FROM sessions WHERE tags IS NOT NULL
     AND ts >= datetime('now', '-30 days')`,
  ).all() as Array<{ tags: string }>;

  const tagCounts = new Map<string, number>();
  for (const row of recentSessions) {
    try {
      const tags = JSON.parse(row.tags) as string[];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    } catch { /* skip */ }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
  setProfile(db, 'recent_topics', topTags);
}

/**
 * Calculate streak — consecutive days backward from today with sessions.
 */
export function calculateStreak(db: Database): number {
  const rows = db.prepare(
    `SELECT DISTINCT date(ts) as d FROM sessions ORDER BY d DESC`,
  ).all() as Array<{ d: string }>;

  if (rows.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  if (rows[0].d !== today) return 0;

  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].d);
    const curr = new Date(rows[i].d);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (Math.round(diffDays) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Month-over-month session count delta.
 */
export function monthOverMonthDelta(db: Database): { current: number; previous: number; delta: number } {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const current = (db.prepare(
    `SELECT COUNT(*) as c FROM sessions WHERE strftime('%Y-%m', ts) = ?`,
  ).get(currentMonth) as { c: number }).c;

  const previous = (db.prepare(
    `SELECT COUNT(*) as c FROM sessions WHERE strftime('%Y-%m', ts) = ?`,
  ).get(prevMonth) as { c: number }).c;

  return { current, previous, delta: current - previous };
}

function setProfile(db: Database, key: string, value: unknown): void {
  db.prepare('INSERT OR REPLACE INTO profile (key, value) VALUES (?, ?)').run(
    key,
    JSON.stringify(value),
  );
}

/** Read a profile value by key, returning `null` when absent. */
export function getProfile(db: Database, key: string): unknown {
  const row = db.prepare('SELECT value FROM profile WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? JSON.parse(row.value) : null;
}
