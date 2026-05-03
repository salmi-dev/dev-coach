/**
 * ASCII art rendering utilities.
 */

/** ASCII icons for each skill mode. */
export const SKILL_ICONS: Record<string, string> = {
  ask: "╺━╸",
  sandbox: "⧉",
  project: "⚙",
  review: "◉",
  stats: "📊",
  explain: "📖",
  compare: "⚖",
};

/** Skill display names. */
export const SKILL_NAMES: Record<string, string> = {
  ask: "coach:ask",
  sandbox: "coach:sandbox",
  project: "coach:project",
  review: "coach:review",
  stats: "coach:stats",
  explain: "coach:explain",
  compare: "coach:compare",
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

  const top = `┌─ ${title} ${"─".repeat(Math.max(0, contentWidth - title.length - 4))}┐`;
  const bottom = `└${"─".repeat(contentWidth)}┘`;

  const body = lines.map((line) => {
    const padding = contentWidth - line.length - 3;
    return `│  ${line}${" ".repeat(Math.max(0, padding))}│`;
  });

  return [top, ...body, bottom].join("\n");
}

/** Render the welcome banner for coach init. */
export function renderWelcomeBanner(): string {
  return renderBox("🎓 Dev Coach", [
    "",
    "  Welcome to Dev Coach!",
    "  AI-powered coding coach",
    "",
    "  Let's set up your profile.",
    "",
  ]);
}

/** Render a skill stub message. */
export function renderStubMessage(skill: string): string {
  const icon = SKILL_ICONS[skill] || "?";
  const name = SKILL_NAMES[skill] || skill;
  return `  ${icon}  ${name} — not yet implemented`;
}
