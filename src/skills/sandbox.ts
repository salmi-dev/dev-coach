/**
 * coach:sandbox — Explore a topic with multiple approaches.
 */

import { SKILL_ICONS } from "../utils/ascii.ts";
import { detectLanguage } from "./ask.ts";
import { ApproachCollector, formatSummaryTable } from "./interactive.ts";
import type { Skill, SkillResult, SessionContext } from "./base.ts";

export const sandboxSkill: Skill = {
  id: "sandbox",
  icon: SKILL_ICONS.sandbox,
  name: "coach:sandbox",

  async run(input: string, context: SessionContext): Promise<SkillResult> {
    const lang = detectLanguage(input) || context.config.primary_languages[0];
    const tags = [input.toLowerCase().replace(/\s+/g, "-")];
    if (lang) tags.push(lang);

    const collector = new ApproachCollector();

    // In prompt-template mode, we prepare the structure for the agent to fill
    const response = [
      `${SKILL_ICONS.sandbox}  coach:sandbox`,
      "",
      `> Topic: ${input}`,
      lang ? `> Language preference: ${lang}` : "",
      "",
      "---",
      "",
      "## Approach 1: [Title]",
      "_Description and trade-offs_",
      "```" + (lang || ""),
      "// Code example",
      "```",
      "",
      "## Approach 2: [Title]",
      "_Description and trade-offs_",
      "```" + (lang || ""),
      "// Code example",
      "```",
      "",
      "## Approach 3: [Title]",
      "_Description and trade-offs_",
      "```" + (lang || ""),
      "// Code example",
      "```",
      "",
      "---",
      "",
      "## Summary",
      "| # | Approach | Pros | Cons | Best For |",
      "|---|----------|------|------|----------|",
      "| 1 | ...      | ...  | ...  | ...      |",
      "| 2 | ...      | ...  | ...  | ...      |",
      "| 3 | ...      | ...  | ...  | ...      |",
      "",
      "---",
      "",
      "_After reviewing, select which approaches to save as snippets._",
      "_This is a prompt template. In pi agent mode, the agent fills in approaches and uses coach-save for selected snippets._",
    ].filter(Boolean).join("\n");

    const title = input
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      response,
      lang,
      tags,
      suggestedTitle: title,
      suggestedType: "snippet",
    };
  },
};
