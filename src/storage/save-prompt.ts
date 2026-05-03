/**
 * Save prompt flow — interactive save UX for skills.
 */

import { type Database } from '../db/sqlite/index.ts';
import { copyToClipboard, detectClipboardTool } from '../utils/clipboard.ts';
import { readPromptLine } from '../utils/prompt.ts';
import { type ItemType, saveItem, type SaveItemOptions } from './library.ts';

/** Outcome of an interactive {@link savePrompt} call. */
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
  const saveAnswer = await readPromptLine(`💾 Save as ${type}? [Y/n] `);
  if (saveAnswer?.toLowerCase() === 'n') {
    return { saved: false };
  }

  // Title
  const titleAnswer = await readPromptLine(`Title [${suggestedTitle}]: `);
  const title = titleAnswer?.trim() || suggestedTitle;

  // Tags
  const tagsStr = suggestedTags.join(', ');
  const tagsAnswer = await readPromptLine(`Tags [${tagsStr}]: `);
  const tags = tagsAnswer?.trim() ? tagsAnswer.split(',').map((t) => t.trim()).filter((t) => t.length > 0) : suggestedTags;

  // Difficulty (snippets only)
  let difficulty: 'beginner' | 'intermediate' | 'advanced' | undefined;
  if (type === 'snippet') {
    const diffAnswer = await readPromptLine(
      'Difficulty [1=beginner, 2=intermediate, 3=advanced]: ',
    );
    const diffMap = { '1': 'beginner', '2': 'intermediate', '3': 'advanced' } as const;
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
    const copyAnswer = await readPromptLine('📋 Copy to clipboard? [Y/n] ');
    if (copyAnswer?.toLowerCase() !== 'n') {
      copied = await copyToClipboard(content);
      if (copied) {
        console.log('📋 Copied to clipboard!');
      } else {
        console.log('⚠️  Clipboard not available');
      }
    }
  }

  return { saved: true, path, copied };
}
