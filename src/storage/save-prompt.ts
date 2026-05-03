/**
 * Save prompt flow — interactive save UX for skills.
 */

import { Database } from "@db/sqlite";
import { copyToClipboard, detectClipboardTool } from "../utils/clipboard.ts";
import { saveItem, type ItemType, type SaveItemOptions } from "./library.ts";

export interface SavePromptResult {
  saved: boolean;
  path?: string;
  copied?: boolean;
}

/**
 * Interactive save prompt. Asks user to confirm save, edit title/tags, then optionally copy to clipboard.
 * Returns null if user declines.
 */
export async function savePrompt(
  db: Database,
  type: ItemType,
  suggestedTitle: string,
  suggestedTags: string[],
  content: string,
  options: {
    source: string;
    lang?: string;
    sessionId?: number;
    libraryPath?: string;
  },
): Promise<SavePromptResult> {
  // Ask to save
  const saveAnswer = await prompt(`💾 Save as ${type}? [Y/n] `);
  if (saveAnswer?.toLowerCase() === "n") {
    return { saved: false };
  }

  // Title
  const titleAnswer = await prompt(`Title [${suggestedTitle}]: `);
  const title = titleAnswer?.trim() || suggestedTitle;

  // Tags
  const tagsStr = suggestedTags.join(", ");
  const tagsAnswer = await prompt(`Tags [${tagsStr}]: `);
  const tags = tagsAnswer?.trim()
    ? tagsAnswer.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
    : suggestedTags;

  // Difficulty (snippets only)
  let difficulty: "beginner" | "intermediate" | "advanced" | undefined;
  if (type === "snippet") {
    const diffAnswer = await prompt("Difficulty [1=beginner, 2=intermediate, 3=advanced]: ");
    const diffMap = { "1": "beginner", "2": "intermediate", "3": "advanced" } as const;
    difficulty = diffMap[diffAnswer?.trim() as keyof typeof diffMap];
  }

  // Save
  const saveOpts: SaveItemOptions = {
    title,
    tags,
    source: options.source,
    lang: options.lang,
    difficulty,
    sessionId: options.sessionId,
  };

  const path = await saveItem(db, type, content, saveOpts, options.libraryPath);
  console.log(`✅ Saved to ${path}`);

  // Clipboard
  let copied = false;
  const clipTool = await detectClipboardTool();
  if (clipTool) {
    const copyAnswer = await prompt("📋 Copy to clipboard? [Y/n] ");
    if (copyAnswer?.toLowerCase() !== "n") {
      copied = await copyToClipboard(content);
      if (copied) {
        console.log("📋 Copied to clipboard!");
      } else {
        console.log("⚠️  Clipboard not available");
      }
    }
  }

  return { saved: true, path, copied };
}

/** Read a line from stdin. */
function prompt(message: string): Promise<string | null> {
  const buf = new Uint8Array(1024);
  Deno.stdout.writeSync(new TextEncoder().encode(message));
  try {
    const n = Deno.stdin.readSync(buf);
    if (n === null) return Promise.resolve(null);
    return Promise.resolve(new TextDecoder().decode(buf.subarray(0, n)).trim());
  } catch {
    return Promise.resolve(null);
  }
}
