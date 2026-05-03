/**
 * coach:ask — Quick Q&A skill.
 */

import { SKILL_ICONS } from '../utils/ascii.ts';
import type { SessionContext, Skill, SkillResult } from './base.ts';

// Common language keywords for detection
const LANG_KEYWORDS: Record<string, string[]> = {
  python: ['python', 'pip', 'django', 'flask', 'pandas', 'numpy', 'pytest'],
  rust: ['rust', 'cargo', 'crate', 'rustc', 'tokio', 'serde'],
  typescript: ['typescript', 'ts', 'deno', 'tsx', 'tsc'],
  javascript: ['javascript', 'js', 'node', 'npm', 'react', 'vue', 'svelte'],
  go: ['golang', 'go ', 'goroutine', 'go mod'],
  java: ['java ', 'jvm', 'maven', 'gradle', 'spring'],
  shell: ['bash', 'shell', 'zsh', 'sh ', 'terminal', 'command line'],
  kotlin: ['kotlin', 'ktor', 'gradle'],
  swift: ['swift', 'xcode', 'ios', 'swiftui'],
  ruby: ['ruby', 'rails', 'gem ', 'bundler'],
  c: [' c ', 'gcc', 'clang', 'malloc', 'stdio'],
  cpp: ['c++', 'cpp', 'g++', 'iostream'],
  sql: ['sql', 'mysql', 'postgres', 'sqlite', 'query'],
  docker: ['docker', 'container', 'dockerfile', 'compose'],
  git: ['git ', 'github', 'gitlab', 'commit', 'branch', 'merge', 'rebase'],
};

/** Detect language from text. */
export function detectLanguage(text: string): string | undefined {
  const lower = text.toLowerCase();
  let bestMatch: string | undefined;
  let bestScore = 0;

  for (const [lang, keywords] of Object.entries(LANG_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = lang;
    }
  }

  return bestScore > 0 ? bestMatch : undefined;
}

/** Generate a title from a question. */
export function generateTitle(question: string): string {
  // Remove question marks and common prefixes
  let title = question
    .replace(/^\s*(how\s+(do|can|to)\s+I?\s*)/i, '')
    .replace(/^\s*(what\s+(is|are)\s+)/i, '')
    .replace(/^\s*(why\s+(does|do|is)\s+)/i, '')
    .replace(/^\s*(when\s+(should|do)\s+)/i, '')
    .replace(/\?+\s*$/, '')
    .trim();

  // Title case
  title = title
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Truncate if too long
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }

  return title || 'Quick Answer';
}

/**
 * `coach:ask` skill — quick Q&A with optional language detection.
 *
 * @example
 * ```ts
 * await runSkill(askSkill, 'how to reverse a list in python', context);
 * ```
 */
export const askSkill: Skill = {
  id: 'ask',
  icon: SKILL_ICONS.ask,
  name: 'coach:ask',

  run(input: string, context: SessionContext): Promise<SkillResult> {
    const lang = detectLanguage(input);
    const tags = lang ? [lang] : [];
    const style = context.config.response_style;

    // Build the formatted prompt/response structure
    const response = formatAskResponse(input, style, lang, context.config.primary_languages);

    return Promise.resolve({
      response,
      lang,
      tags,
      suggestedTitle: generateTitle(input),
      suggestedType: 'tldr',
    });
  },
};

function formatAskResponse(
  question: string,
  style: string,
  lang: string | undefined,
  primaryLanguages: string[],
): string {
  const langHint = lang ? ` [${lang}]` : '';
  const styleHint = style === 'examples-first'
    ? 'Lead with a code example, then explain.'
    : style === 'detailed'
    ? 'Provide a thorough explanation.'
    : 'Be concise and direct.';

  const langPref = primaryLanguages.length > 0 ? `Prefer examples in: ${primaryLanguages.join(', ')}.` : '';

  return [
    `${SKILL_ICONS.ask}  coach:ask${langHint}`,
    '',
    `> ${question}`,
    '',
    `[Style: ${styleHint}${langPref ? ' ' + langPref : ''}]`,
    '',
    '---',
    '',
    `_Awaiting response for: "${question}"_`,
    '',
    '_This is a prompt template. In pi agent mode, the agent generates the answer._',
  ].join('\n');
}
