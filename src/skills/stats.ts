/**
 * coach:stats — ASCII dashboard and stats views.
 */

import { Database } from '@db/sqlite';
import { renderBox, SKILL_ICONS } from '../utils/ascii.ts';
import { calculateStreak, getProfile, monthOverMonthDelta, rebuildProfile } from '../db/profile.ts';
import { regenerateDashboard } from '../storage/dashboard.ts';
import type { SessionContext, Skill, SkillResult } from './base.ts';

// ── Bar Chart Rendering ────────────────────────────────────────

const BAR_WIDTH = 15;
const FULL_BLOCK = '█';
const EMPTY_BLOCK = '░';

/** Render a unicode progress bar from a 0..1 ratio, fixed width. */
export function renderBar(ratio: number): string {
  const filled = Math.round(ratio * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return FULL_BLOCK.repeat(filled) + EMPTY_BLOCK.repeat(empty);
}

/** Render up to 5 language usage bars (top by count) for the dashboard. */
export function renderLanguageBars(
  langs: Array<{ lang: string; count: number }>,
  total: number,
): string[] {
  return langs.slice(0, 5).map((l) => {
    const pct = total > 0 ? Math.round((l.count / total) * 100) : 0;
    const bar = renderBar(l.count / Math.max(total, 1));
    return `  ${bar} ${l.lang.padEnd(12)} ${pct}%`;
  });
}

// ── Stats Views ────────────────────────────────────────────────

function getMonthName(): string {
  return new Date().toLocaleString('en', { month: 'long', year: 'numeric' });
}

/** Build the monthly dashboard string (sessions + streak + per-mode breakdown). */
export function renderMonthlyDashboard(db: Database): string {
  const mom = monthOverMonthDelta(db);
  const streak = calculateStreak(db);
  const deltaStr = mom.delta >= 0 ? `↑${mom.delta}` : `↓${Math.abs(mom.delta)}`;

  // Mode breakdown
  const modes = db.prepare(
    "SELECT mode, COUNT(*) as c FROM sessions WHERE strftime('%Y-%m', ts) = strftime('%Y-%m', 'now') GROUP BY mode ORDER BY c DESC",
  ).all() as Array<{ mode: string; c: number }>;
  const modeStr = modes.map((m) => `${m.mode}: ${m.c}`).join('  ');

  // Language bars
  const langRows = db.prepare(
    "SELECT lang, COUNT(*) as count FROM sessions WHERE lang IS NOT NULL AND strftime('%Y-%m', ts) = strftime('%Y-%m', 'now') GROUP BY lang ORDER BY count DESC",
  ).all() as Array<{ lang: string; count: number }>;
  const totalLang = langRows.reduce((s, r) => s + r.count, 0);
  const bars = renderLanguageBars(langRows, totalLang);

  // Library counts
  const snippets = (db.prepare("SELECT COUNT(*) as c FROM items WHERE type='snippet'").get() as { c: number }).c;
  const tldrs = (db.prepare("SELECT COUNT(*) as c FROM items WHERE type='tldr'").get() as { c: number }).c;
  const projects = (db.prepare("SELECT COUNT(*) as c FROM items WHERE type='project'").get() as { c: number }).c;

  // Most active day
  const dayRow = db.prepare(
    "SELECT strftime('%w', ts) as dow, COUNT(*) as c FROM sessions GROUP BY dow ORDER BY c DESC LIMIT 1",
  ).get() as { dow: string; c: number } | undefined;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const activeDay = dayRow ? days[parseInt(dayRow.dow)] : 'N/A';

  const lines = [
    '',
    `Sessions: ${mom.current} total (${deltaStr} vs last month)`,
    '',
    `By mode:`,
    `  ${modeStr || 'none yet'}`,
    '',
    'Languages:',
    ...(bars.length > 0 ? bars : ['  No language data yet']),
    '',
    'Library:',
    `  📝 ${snippets} snippets  📖 ${tldrs} tldrs`,
    `  🏗️  ${projects} projects`,
    '',
    `🔥 Streak: ${streak} day${streak !== 1 ? 's' : ''}`,
    `📈 Most active: ${activeDay}`,
    '',
  ];

  if (mom.current === 0 && modes.length === 0) {
    return renderBox(`📊 Dev Coach Stats — ${getMonthName()}`, [
      '',
      '  No sessions yet. Start with `coach ask`!',
      '',
    ]);
  }

  return renderBox(`📊 Dev Coach Stats — ${getMonthName()}`, lines);
}

function renderWeekly(db: Database): string {
  const rows = db.prepare(
    "SELECT mode, COUNT(*) as c FROM sessions WHERE ts >= datetime('now', '-7 days') GROUP BY mode ORDER BY c DESC",
  ).all() as Array<{ mode: string; c: number }>;
  const total = rows.reduce((s, r) => s + r.c, 0);

  const lines = [
    '',
    `Sessions this week: ${total}`,
    '',
    ...rows.map((r) => `  ${r.mode}: ${r.c}`),
    '',
  ];
  return renderBox('📊 Weekly Stats', total > 0 ? lines : ['', '  No sessions this week.', '']);
}

function renderLangStats(db: Database, lang: string): string {
  const count = (db.prepare(
    'SELECT COUNT(*) as c FROM sessions WHERE lang = ?',
  ).get(lang) as { c: number }).c;

  const items = db.prepare(
    'SELECT title, path FROM items WHERE lang = ? ORDER BY created DESC LIMIT 5',
  ).all(lang) as Array<{ title: string; path: string }>;

  const lines = [
    '',
    `Sessions: ${count}`,
    '',
    'Recent items:',
    ...(items.length > 0 ? items.map((i) => `  - ${i.title}`) : ['  None yet']),
    '',
  ];
  return renderBox(`📊 ${lang} Stats`, lines);
}

function renderTopics(db: Database): string {
  const rows = db.prepare('SELECT tags FROM sessions WHERE tags IS NOT NULL').all() as Array<{ tags: string }>;
  const tagCounts = new Map<string, number>();
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags) as string[];
      for (const t of tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    } catch { /* skip */ }
  }
  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const lines = [
    '',
    ...sorted.map(([tag, count]) => `  ${tag.padEnd(20)} ${count}`),
    ...(sorted.length === 0 ? ['  No topics yet.'] : []),
    '',
  ];
  return renderBox('📊 Top Topics', lines);
}

function renderProfileView(db: Database): string {
  rebuildProfile(db);
  const langs = (getProfile(db, 'primary_languages') as string[]) || [];
  const hours = (getProfile(db, 'peak_hours') as number[]) || [];
  const modes = (getProfile(db, 'favorite_modes') as string[]) || [];
  const topics = (getProfile(db, 'recent_topics') as string[]) || [];

  const lines = [
    '',
    'Languages: ' + (langs.join(', ') || 'none'),
    'Peak hours: ' + (hours.map((h) => `${h}:00`).join(', ') || 'N/A'),
    'Favorite modes: ' + (modes.join(', ') || 'none'),
    'Recent topics: ' + (topics.slice(0, 5).join(', ') || 'none'),
    '',
  ];
  return renderBox('📊 Your Profile', lines);
}

// ── Stats Skill ────────────────────────────────────────────────

/**
 * `coach:stats` skill — render learning dashboards (monthly / weekly / language / topics / profile).
 *
 * @example
 * ```ts
 * await runSkill(statsSkill, '', context);
 * ```
 */
export const statsSkill: Skill = {
  id: 'stats',
  icon: SKILL_ICONS.stats,
  name: 'coach:stats',

  async run(input: string, context: SessionContext): Promise<SkillResult> {
    const args = input.trim().split(/\s+/).filter(Boolean);
    const subcommand = args[0];

    let response: string;

    switch (subcommand) {
      case 'weekly':
        response = renderWeekly(context.db);
        break;
      case 'lang':
        response = args[1] ? renderLangStats(context.db, args[1]) : 'Usage: coach stats lang <language>';
        break;
      case 'topics':
        response = renderTopics(context.db);
        break;
      case 'profile':
        response = renderProfileView(context.db);
        break;
      default:
        response = renderMonthlyDashboard(context.db);
        break;
    }

    // Regenerate dashboard
    await regenerateDashboard(context.db, context.libraryPath);

    return { response };
  },
};
