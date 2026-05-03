/**
 * ASCII art rendering utilities.
 */

import { c } from './colors.ts';
import { runtime } from './runtime/index.ts';

/** ASCII icons for each skill mode. */
export const SKILL_ICONS: Record<string, string> = {
  ask: '╺━╸',
  sandbox: '⧉',
  project: '⚙',
  review: '◉',
  stats: '📊',
  explain: '📖',
  compare: '⚖',
};

/** Skill display names. */
export const SKILL_NAMES: Record<string, string> = {
  ask: 'coach:ask',
  sandbox: 'coach:sandbox',
  project: 'coach:project',
  review: 'coach:review',
  stats: 'coach:stats',
  explain: 'coach:explain',
  compare: 'coach:compare',
};

/**
 * Render a bordered ASCII box with title and content lines.
 *
 * ```
 * ┌─ Title ────────────┐
 * │  Line 1             │
 * │  Line 2             │
 * └─────────────────────┘
 * ```
 */
export function renderBox(title: string, lines: string[], minWidth = 30): string {
  const contentWidth = Math.max(
    minWidth,
    title.length + 4,
    ...lines.map((l) => l.length + 4),
  );

  const top = `┌─ ${title} ${'─'.repeat(Math.max(0, contentWidth - title.length - 4))}┐`;
  const bottom = `└${'─'.repeat(contentWidth)}┘`;

  const body = lines.map((line) => {
    const padding = contentWidth - line.length - 3;
    return `│  ${line}${' '.repeat(Math.max(0, padding))}│`;
  });

  return [top, ...body, bottom].join('\n');
}

/** Render the welcome banner for coach init. */
export function renderWelcomeBanner(): string {
  return renderBox('🎓 Dev Coach', [
    '',
    '  Welcome to Dev Coach!',
    '  AI-powered coding coach',
    '',
    "  Let's set up your profile.",
    '',
  ]);
}

/** Render a skill stub message. */
export function renderStubMessage(skill: string): string {
  const icon = SKILL_ICONS[skill] || '?';
  const name = SKILL_NAMES[skill] || skill;
  return `  ${icon}  ${name} — not yet implemented`;
}

/**
 * Three-line ASCII art banners per skill, used by {@link printBanner}.
 *
 * Each entry is exactly 3 lines of fixed-width art (max 20 cols) so the
 * frame around them stays predictable.
 */
export const SKILL_BANNERS: Record<string, string[]> = {
  ask: [
    '   ___  ___ _   __',
    '  / _ |/ __| | / /',
    ' /_/ |_\\__ \\|/_/ ',
  ],
  explain: [
    '   ___      _    ',
    '  / _ \\____| |__ ',
    ' / __/___/| / _ \\',
  ],
  compare: [
    '   ___ __  __ ___ ',
    '  / __|  \\/  | _ \\',
    ' | (__| |\\/| |  _/',
  ],
  sandbox: [
    '   ___  ___  _  _ ',
    '  / __|/ _ \\| \\| |',
    '  \\__ \\ (_) | .` |',
  ],
  review: [
    '   ___  _____   __',
    '  / _ \\/ __\\ \\ / /',
    ' / , _/ _/  \\ V / ',
  ],
  project: [
    '   ___  ___  ____',
    '  / _ \\/ _ \\/_  /',
    ' / ___/ , _/ / / ',
  ],
  stats: [
    '   ____ ______ ',
    '  / __//_  __/',
    ' _\\ \\  / /   ',
  ],
};

/**
 * Print a framed ASCII banner introducing a skill session.
 *
 * Renders a corner-rounded box (`╭─...─╮` / `╰─...─╯`) containing the
 * skill's ASCII art followed by its display name (e.g. `coach:ask`).
 * Falls back to a single line `coach:<skill>` when the skill has no banner
 * art registered (no error thrown).
 *
 * Banner border is colored cyan when color is enabled.
 *
 * @param skillId Skill identifier such as `'ask'`, `'explain'`, `'compare'`,
 *   `'sandbox'`, `'review'`, `'project'`, `'stats'`.
 *
 * @example
 * ```ts
 * printBanner('ask');
 * // ╭─────────────────────────╮
 * // │   ___  ___ _   __     │
 * // │  / _ |/ __| | / /    │
 * // │ /_/ |_\__ \|/_/      │
 * // │ coach:ask             │
 * // ╰─────────────────────────╯
 * ```
 */
export function printBanner(skillId: string): void {
  const name = SKILL_NAMES[skillId] || `coach:${skillId}`;
  const art = SKILL_BANNERS[skillId];
  if (!art) {
    console.log(name);
    return;
  }

  // Determine inner width: max(art line length, name length) + 2 padding chars.
  const inner = Math.max(name.length, ...art.map((l) => l.length)) + 2;
  // Clamp to terminal width when available.
  const cols = runtime.consoleSize().columns;
  const width = Math.min(inner, Math.max(20, cols - 2));

  const horizontal = '─'.repeat(width);
  const top = c.cyan(`╭${horizontal}╮`);
  const bottom = c.cyan(`╰${horizontal}╯`);
  const side = c.cyan('│');

  const pad = (s: string, visualLen: number): string => {
    const padding = Math.max(0, width - visualLen - 1);
    return ` ${s}${' '.repeat(padding)}`;
  };

  const lines = [top];
  for (const artLine of art) lines.push(`${side}${pad(artLine, artLine.length)}${side}`);
  lines.push(`${side}${pad(c.bold(name), name.length)}${side}`);
  lines.push(bottom);
  console.log(lines.join('\n'));
}
