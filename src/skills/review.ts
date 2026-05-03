/**
 * coach:review — Structured code review skill.
 */

import { SKILL_ICONS } from "../utils/ascii.ts";
import { isInteractive } from "../utils/platform.ts";
import type { Skill, SkillResult, SessionContext } from "./base.ts";

// ── Language Detection ─────────────────────────────────────────

const EXTENSION_MAP: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".rs": "rust", ".py": "python", ".go": "go", ".java": "java", ".kt": "kotlin",
  ".swift": "swift", ".rb": "ruby", ".sh": "shell", ".bash": "shell",
  ".c": "c", ".h": "c", ".cpp": "cpp", ".hpp": "cpp",
  ".sql": "sql", ".html": "html", ".css": "css", ".yaml": "yaml", ".yml": "yaml",
  ".json": "json", ".toml": "toml", ".md": "markdown",
};

const KEYWORD_HEURISTICS: Array<{ lang: string; patterns: RegExp[] }> = [
  { lang: "rust", patterns: [/\bfn\s+\w+/, /\blet\s+mut\b/, /\bimpl\b/, /\buse\s+\w+::/] },
  { lang: "python", patterns: [/\bdef\s+\w+/, /\bimport\s+\w+/, /\bclass\s+\w+.*:$/m] },
  { lang: "typescript", patterns: [/\binterface\s+\w+/, /:\s*(string|number|boolean)/, /\bconst\s+\w+:\s/] },
  { lang: "javascript", patterns: [/\bconst\s+\w+\s*=/, /\bfunction\s+\w+/, /=>\s*{/] },
  { lang: "go", patterns: [/\bfunc\s+\w+/, /\bpackage\s+\w+/, /\bgo\s+\w+/] },
  { lang: "java", patterns: [/\bpublic\s+class\b/, /\bSystem\.out\b/, /\bvoid\s+\w+/] },
  { lang: "shell", patterns: [/^#!/m, /\becho\s+/, /\bif\s+\[/] },
];

export function detectLanguageFromExtension(filePath: string): string | undefined {
  const ext = filePath.match(/\.[a-zA-Z0-9]+$/)?.[0]?.toLowerCase();
  return ext ? EXTENSION_MAP[ext] : undefined;
}

export function detectLanguageFromContent(code: string): string | undefined {
  let bestLang: string | undefined;
  let bestScore = 0;

  for (const { lang, patterns } of KEYWORD_HEURISTICS) {
    let score = 0;
    for (const p of patterns) {
      if (p.test(code)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestScore > 0 ? bestLang : undefined;
}

// ── Input Resolution ───────────────────────────────────────────

export interface ResolvedInput {
  code: string;
  lang?: string;
  source: string; // "file", "stdin", "inline"
}

export async function resolveInput(args: string[]): Promise<ResolvedInput> {
  const input = args.join(" ").trim();

  // 1. Check if it's a file path
  if (input && !input.includes("\n")) {
    try {
      const stat = await Deno.stat(input);
      if (stat.isFile) {
        const code = await Deno.readTextFile(input);
        const lang = detectLanguageFromExtension(input) || detectLanguageFromContent(code);
        return { code, lang, source: "file" };
      }
    } catch {
      // Not a file, continue
    }
  }

  // 2. Check stdin
  if (!isInteractive()) {
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    for await (const chunk of Deno.stdin.readable) {
      chunks.push(decoder.decode(chunk));
    }
    const code = chunks.join("");
    if (code.trim()) {
      const lang = detectLanguageFromContent(code);
      return { code, lang, source: "stdin" };
    }
  }

  // 3. Treat as inline code
  if (input) {
    const lang = detectLanguageFromContent(input);
    return { code: input, lang, source: "inline" };
  }

  return { code: "", lang: undefined, source: "inline" };
}

// ── Review Skill ───────────────────────────────────────────────

export const reviewSkill: Skill = {
  id: "review",
  icon: SKILL_ICONS.review,
  name: "coach:review",

  async run(input: string, context: SessionContext): Promise<SkillResult> {
    const resolved = await resolveInput(input ? input.split(" ") : []);
    const lang = resolved.lang;

    const response = [
      `${SKILL_ICONS.review}  coach:review [${lang || "auto-detect"}] (from ${resolved.source})`,
      "",
      "```" + (lang || ""),
      resolved.code.length > 500 ? resolved.code.substring(0, 500) + "\n// ... (truncated)" : resolved.code,
      "```",
      "",
      "---",
      "",
      "## 🐛 Bugs",
      "_Potential bugs and runtime errors_",
      "",
      "## 🎨 Style",
      "_Naming, formatting, idiomatic patterns_",
      "",
      "## ⚡ Performance",
      "_Inefficiencies, unnecessary allocations_",
      "",
      "## 🔒 Security",
      "_Injection, leaks, unsafe patterns_",
      "",
      "## 📐 Architecture",
      "_Structure, separation of concerns_",
      "",
      "## ✨ Refactored Version",
      "```" + (lang || ""),
      "// Improved version with comments",
      "```",
      "",
      "## 📊 Score: _/10",
      "_Brief rationale_",
      "",
      "---",
      "",
      "_This is a prompt template. In pi agent mode, the agent fills in each review section._",
    ].join("\n");

    const title = `Code Review${lang ? ` (${lang})` : ""}`;

    return {
      response,
      lang,
      tags: lang ? [lang, "review"] : ["review"],
      suggestedTitle: title,
      suggestedType: "tldr",
    };
  },
};
