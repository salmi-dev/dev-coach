/**
 * coach-save — Pi custom tool for saving items to the library.
 */

import { closeDb, getDb } from '../../db/connection.ts';
import { type ItemType, saveItem } from '../../storage/library.ts';
import { getLibraryPath } from '../../utils/xdg.ts';
import { loadConfig } from '../../config/config.ts';

/**
 * Save a new library item from a pi agent.
 *
 * @param params Item type, title, content, optional lang, and tags.
 * @returns `{ path }` — the relative path of the written file.
 *
 * @example
 * ```ts
 * await coachSave({ type: 'tldr', title: 'X', content: '...', tags: ['x'] });
 * ```
 */
export async function coachSave(params: {
  type: ItemType;
  title: string;
  content: string;
  lang?: string;
  tags: string[];
}): Promise<{ path: string }> {
  const config = await loadConfig();
  const db = getDb();
  const libraryPath = getLibraryPath(config.library_path);

  try {
    const path = await saveItem(db, params.type, params.content, {
      title: params.title,
      tags: params.tags,
      lang: params.lang,
      source: 'pi-agent',
    }, libraryPath);
    return { path };
  } finally {
    closeDb();
  }
}
