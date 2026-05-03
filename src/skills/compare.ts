/**
 * coach:compare — Side-by-side comparison skill.
 */

import { SKILL_ICONS } from '../utils/ascii.ts';
import { detectLanguage } from './ask.ts';
import type { SessionContext, Skill, SkillResult } from './base.ts';

/** Result of {@link parseComparisonInput}: detected items plus optional surrounding context. */
export interface ParsedComparison {
  items: string[];
  context?: string;
}

/** Parse comparison input: "X vs Y", "X or Y", "X versus Y", "X compared to Y". */
export function parseComparisonInput(input: string): ParsedComparison {
  // Try splitting by known separators
  const separators = [
    /\s+vs\.?\s+/i,
    /\s+versus\s+/i,
    /\s+compared\s+to\s+/i,
    /\s+or\s+/i,
  ];

  for (const sep of separators) {
    if (sep.test(input)) {
      const parts = input.split(sep).map((s) => s.trim()).filter((s) => s.length > 0);
      if (parts.length >= 2) {
        // Check if last part has context after "in/for/on"
        const lastPart = parts[parts.length - 1];
        const contextMatch = lastPart.match(/^(.+?)\s+(?:in|for|on|with)\s+(.+)$/i);
        if (contextMatch) {
          parts[parts.length - 1] = contextMatch[1].trim();
          return { items: parts, context: contextMatch[2].trim() };
        }
        return { items: parts };
      }
    }
  }

  // Fallback: just return the whole input as single item
  return { items: [input] };
}

/**
 * `coach:compare` skill — side-by-side comparison of two or more approaches.
 *
 * @example
 * ```ts
 * await runSkill(compareSkill, 'redis vs memcached for caching', context);
 * ```
 */
export const compareSkill: Skill = {
  id: 'compare',
  icon: SKILL_ICONS.compare,
  name: 'coach:compare',

  run(input: string, _context: SessionContext): Promise<SkillResult> {
    const parsed = parseComparisonInput(input);
    const lang = detectLanguage(input);
    const tags = parsed.items.map((i) => i.toLowerCase().replace(/\s+/g, '-'));
    if (parsed.context) tags.push(parsed.context.toLowerCase());

    const itemsHeader = parsed.items.join(' vs ');
    const ctxStr = parsed.context ? ` (${parsed.context})` : '';

    const response = [
      `${SKILL_ICONS.compare}  coach:compare`,
      '',
      `> ${itemsHeader}${ctxStr}`,
      '',
      '---',
      '',
      '## Comparison Table',
      '',
      formatComparisonTableTemplate(parsed.items),
      '',
      '## Verdict',
      `_Recommendation for when to use each approach${ctxStr}_`,
      '',
      '## Code Examples',
      ...parsed.items.map((item) =>
        [
          '',
          `### ${item}`,
          '```',
          `// ${item} example`,
          '```',
        ].join('\n')
      ),
      '',
      '---',
      '',
      '_This is a prompt template. In pi agent mode, the agent fills in the comparison._',
    ].join('\n');

    const title = parsed.items.map((i) => i.charAt(0).toUpperCase() + i.slice(1)).join(' vs ');

    return Promise.resolve({
      response,
      lang,
      tags,
      suggestedTitle: title,
      suggestedType: 'snippet',
    });
  },
};

function formatComparisonTableTemplate(items: string[]): string {
  const header = `| Dimension    | ${items.join(' | ')} |`;
  const sep = `|${'-'.repeat(14)}|${items.map(() => '-'.repeat(14)).join('|')}|`;
  const rows = ['Speed', 'Memory', 'Readability', 'Use-case'].map(
    (dim) => `| ${dim.padEnd(12)} | ${items.map(() => '             ').join('| ')}|`,
  );
  return [header, sep, ...rows].join('\n');
}
