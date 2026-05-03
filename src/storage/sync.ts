/**
 * DB index sync — keep `items` table in sync with filesystem.
 */

import { Database } from '@db/sqlite';
import { join, relative } from '@std/path';
import { walk } from '@std/fs';
import { parseFrontmatter } from './frontmatter.ts';
import type { ItemType } from './library.ts';

/**
 * Upsert an item into the `items` table.
 */
export function indexItem(
  db: Database,
  type: ItemType,
  metadata: Record<string, unknown>,
  relativePath: string,
  sessionId?: number,
): void {
  const existing = db.prepare('SELECT id FROM items WHERE path = ?').get(relativePath) as
    | { id: number }
    | undefined;

  const tags = JSON.stringify(metadata.tags ?? []);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(
      `UPDATE items SET type=?, title=?, lang=?, tags=?, updated=? WHERE id=?`,
    ).run(
      type,
      String(metadata.title ?? ''),
      metadata.lang ? String(metadata.lang) : null,
      tags,
      now,
      existing.id,
    );
  } else {
    db.prepare(
      `INSERT INTO items (type, title, path, lang, tags, created, updated, source_session)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      type,
      String(metadata.title ?? ''),
      relativePath,
      metadata.lang ? String(metadata.lang) : null,
      tags,
      String(metadata.created ?? now),
      now,
      sessionId ?? null,
    );
  }
}

/**
 * Remove an item from the `items` table by path.
 */
export function removeIndex(db: Database, relativePath: string): void {
  db.prepare('DELETE FROM items WHERE path = ?').run(relativePath);
}

/**
 * Rebuild the entire `items` table from filesystem.
 * Clears existing rows and re-scans all .md files in the library.
 */
export async function rebuildIndex(db: Database, libraryPath: string): Promise<number> {
  // Clear existing items (triggers will clean FTS)
  db.exec('DELETE FROM items');

  let count = 0;

  for (const dir of ['snippets', 'tldr', 'projects']) {
    const dirPath = join(libraryPath, dir);

    try {
      await Deno.stat(dirPath);
    } catch {
      continue; // Directory doesn't exist, skip
    }

    for await (const entry of walk(dirPath, { exts: ['.md'], includeDirs: false })) {
      try {
        const content = await Deno.readTextFile(entry.path);
        const { metadata } = parseFrontmatter(content);

        const relativePath = relative(libraryPath, entry.path);
        const type = inferType(dir);

        indexItem(db, type, metadata, relativePath);
        count++;
      } catch {
        // Skip files that can't be parsed
        continue;
      }
    }
  }

  return count;
}

/** Infer item type from directory name. */
function inferType(dir: string): ItemType {
  switch (dir) {
    case 'snippets':
      return 'snippet';
    case 'tldr':
      return 'tldr';
    case 'projects':
      return 'project';
    default:
      return 'snippet';
  }
}
