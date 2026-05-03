/**
 * coach-copy — Pi custom tool for copying text to clipboard.
 */

import { copyToClipboard, detectClipboardTool } from '../../utils/clipboard.ts';

/**
 * Copy `params.text` to the system clipboard.
 *
 * @param params Object with `text` to copy.
 * @returns `{ success, tool }` where `tool` is the detected clipboard backend (or `null`).
 */
export async function coachCopy(params: { text: string }): Promise<{ success: boolean; tool: string | null }> {
  const tool = await detectClipboardTool();
  if (!tool) return { success: false, tool: null };
  const success = await copyToClipboard(params.text);
  return { success, tool };
}
