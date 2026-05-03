/**
 * coach:explain — Deep-dive structured explanation.
 */

import { SKILL_ICONS } from "../utils/ascii.ts";
import { detectLanguage } from "./ask.ts";
import type { Skill, SkillResult, SessionContext } from "./base.ts";

/** Extract tags from a concept for cross-reference search. */
export function conceptToTags(concept: string): string[] {
  return concept
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);
}

/** Format cross-reference section from search results. */
export function formatRelatedSection(
  items: Array<{ title: string; path: string }>,
): string {
  if (items.length === 0) {
    return "No related items in your library yet.";
  }
  return items.map((i) => `- [${i.title}](${i.path})`).join("\n");
}

export const explainSkill: Skill = {
  id: "explain",
  icon: SKILL_ICONS.explain,
  name: "coach:explain",

  async run(input: string, context: SessionContext): Promise<SkillResult> {
    const lang = detectLanguage(input);
    const tags = conceptToTags(input);
    const prefLang = context.config.primary_languages[0] || "typescript";

    // Search library for related items
    const related = context.searchLibrary({ tags, limit: 5 });
    const relatedSection = formatRelatedSection(related);

    const response = [
      `${SKILL_ICONS.explain}  coach:explain`,
      "",
      `> ${input}`,
      "",
      "---",
      "",
      "## 1. One-liner",
      `_ELI5 summary of "${input}"_`,
      "",
      "## 2. Core Concept",
      `_One paragraph explanation of ${input}_`,
      "",
      "## 3. How It Works",
      "_Step-by-step with ASCII diagram if applicable_",
      "",
      "## 4. Example",
      `\`\`\`${prefLang}`,
      `// Working example in ${prefLang}`,
      "```",
      "",
      "## 5. Gotchas",
      "_Common mistakes and misconceptions_",
      "",
      "## 6. Related",
      relatedSection,
      "",
      "---",
      "",
      "_This is a prompt template. In pi agent mode, the agent fills in each section._",
    ].join("\n");

    // Title case the concept
    const title = input
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      response,
      lang,
      tags,
      suggestedTitle: title,
      suggestedType: "tldr",
    };
  },
};
