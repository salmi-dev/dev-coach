/**
 * Library manager — CRUD for snippets, TLDRs, and projects.
 */

import { dirname, join } from '@std/path';
import { Database } from '@db/sqlite';
import { type BaseFrontmatter, parseFrontmatter, serializeFrontmatter } from './frontmatter.ts';
import { indexItem, removeIndex } from './sync.ts';
import { regenerateDashboard } from './dashboard.ts';
import { getLibraryPath } from '../utils/xdg.ts';
import { loadConfig } from '../config/config.ts';

/** All supported library item types. */
export type ItemType = 'snippet' | 'tldr' | 'project';

/** Options accepted by {@link saveItem}. */
export interface SaveItemOptions {
  title: string;
  tags: string[];
  lang?: string;
  source: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  sessionId?: number;
}

/** A library item read from disk: parsed metadata + body + path. */
export interface LibraryItem {
  metadata: Record<string, unknown>;
  content: string;
  relativePath: string;
}

// ── Slug Generation ────────────────────────────────────────────

/**
 * Convert a title to a kebab-case slug.
 * Strips non-alphanumeric chars, collapses hyphens.
 */
export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get a unique slug by appending -2, -3, etc. if file exists.
 */
export async function uniqueSlug(baseSlug: string, dir: string, ext = '.md'): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    try {
      await Deno.stat(join(dir, `${slug}${ext}`));
      counter++;
      slug = `${baseSlug}-${counter}`;
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) return slug;
      throw e;
    }
  }
}

// ── Path Resolution ────────────────────────────────────────────

/**
 * Get the file path for an item relative to the library root.
 */
export async function getItemPath(
  type: ItemType,
  options: SaveItemOptions,
  libraryPath: string,
): Promise<string> {
  const slug = toSlug(options.title);

  switch (type) {
    case 'snippet': {
      const lang = options.lang || 'misc';
      const dir = join(libraryPath, 'snippets', lang);
      const unique = await uniqueSlug(slug, dir);
      return `snippets/${lang}/${unique}.md`;
    }
    case 'tldr': {
      const dir = join(libraryPath, 'tldr');
      const unique = await uniqueSlug(slug, dir);
      return `tldr/${unique}.md`;
    }
    case 'project': {
      const dir = join(libraryPath, 'projects');
      // For projects, check directory existence
      let projSlug = slug;
      let counter = 1;
      while (true) {
        try {
          await Deno.stat(join(dir, projSlug));
          counter++;
          projSlug = `${slug}-${counter}`;
        } catch (e) {
          if (e instanceof Deno.errors.NotFound) break;
          throw e;
        }
      }
      return `projects/${projSlug}/README.md`;
    }
  }
}

// ── CRUD Operations ────────────────────────────────────────────

/**
 * Save a library item: write markdown file + update DB index + regenerate dashboard.
 */
export async function saveItem(
  db: Database,
  type: ItemType,
  content: string,
  options: SaveItemOptions,
  libraryPath?: string,
): Promise<string> {
  const libPath = libraryPath ?? getLibraryPath((await loadConfig()).library_path);
  const relativePath = await getItemPath(type, options, libPath);
  const fullPath = join(libPath, relativePath);

  // Build frontmatter metadata
  const metadata: Record<string, unknown> = {
    title: options.title,
    tags: options.tags,
    created: new Date().toISOString().split('T')[0],
    source: options.source,
  };
  if (options.lang) metadata.lang = options.lang;
  if (options.difficulty) metadata.difficulty = options.difficulty;

  // Ensure parent directory exists
  await Deno.mkdir(dirname(fullPath), { recursive: true });

  // Write file
  const fileContent = serializeFrontmatter(metadata, content);
  await Deno.writeTextFile(fullPath, fileContent);

  // Update DB index
  indexItem(db, type, metadata as BaseFrontmatter & Record<string, unknown>, relativePath, options.sessionId);

  // Regenerate dashboard
  await regenerateDashboard(db, libPath);

  return relativePath;
}

/**
 * Read a library item by relative path.
 */
export async function readItem(relativePath: string, libraryPath?: string): Promise<LibraryItem> {
  const libPath = libraryPath ?? getLibraryPath((await loadConfig()).library_path);
  const fullPath = join(libPath, relativePath);
  const raw = await Deno.readTextFile(fullPath);
  const { metadata, body } = parseFrontmatter(raw);
  return { metadata, content: body, relativePath };
}

/**
 * Delete a library item by relative path.
 */
export async function deleteItem(
  db: Database,
  relativePath: string,
  libraryPath?: string,
): Promise<void> {
  const libPath = libraryPath ?? getLibraryPath((await loadConfig()).library_path);
  const fullPath = join(libPath, relativePath);

  await Deno.remove(fullPath);
  removeIndex(db, relativePath);
  await regenerateDashboard(db, libPath);
}

// ── Slug Resolution ──────────────────────────────────

/** A slug match returned by {@link resolveSlug}. */
export interface SlugMatch {
  /** Slug as stored on disk (basename without `.md`). */
  slug: string;
  /** Path relative to the library root (e.g. `tldr/foo.md` or `snippets/python/foo.md`). */
  relativePath: string;
  /** Absolute filesystem path. */
  absolutePath: string;
  /** Language subfolder for snippets, otherwise `null`. */
  lang: string | null;
}

/**
 * Resolve a slug to one or more library items of the given type by walking the filesystem.
 *
 * Resolution order:
 * 1. Exact slug match (basename without `.md`).
 * 2. Case-insensitive prefix match — returned alone only when uniquely identifying.
 * 3. Substring match — may return multiple candidates for the caller to disambiguate.
 *
 * For snippets the search spans every `<lang>/` subdirectory; for tldrs and projects only
 * their respective top-level folders are scanned.
 *
 * @param type Item type to scope the search to.
 * @param query Slug or partial slug entered by the user.
 * @param libraryPath Absolute path to the library root.
 * @returns Array of matches. Empty array when nothing matches; length 1 when uniquely
 *          resolved; length > 1 when ambiguous (caller should present a picker).
 *
 * @example
 * ```ts
 * const matches = await resolveSlug('tldr', 'reverse', '/home/me/dev-coach');
 * if (matches.length === 1) console.log(matches[0].absolutePath);
 * ```
 */
export async function resolveSlug(type: ItemType, query: string, libraryPath: string): Promise<SlugMatch[]> {
  const all = await listSlugs(type, libraryPath);
  if (all.length === 0) return [];

  // 1. Exact match.
  const exact = all.filter((m) => m.slug === query);
  if (exact.length > 0) return exact;

  const lower = query.toLowerCase();

  // 2. Case-insensitive prefix match.
  const prefix = all.filter((m) => m.slug.toLowerCase().startsWith(lower));
  if (prefix.length === 1) return prefix;

  // 3. Substring match.
  const substring = all.filter((m) => m.slug.toLowerCase().includes(lower));
  // Prefer prefix matches when both overlap.
  if (prefix.length > 1) return prefix;
  return substring;
}

/**
 * Walk the library and return every item of the given type as a {@link SlugMatch}.
 *
 * @param type Item type.
 * @param libraryPath Absolute path to the library root.
 * @returns All matching items, sorted by slug.
 */
export async function listSlugs(type: ItemType, libraryPath: string): Promise<SlugMatch[]> {
  const matches: SlugMatch[] = [];

  if (type === 'snippet') {
    const root = join(libraryPath, 'snippets');
    try {
      for await (const entry of Deno.readDir(root)) {
        if (!entry.isDirectory) continue;
        const langDir = join(root, entry.name);
        for await (const file of Deno.readDir(langDir)) {
          if (!file.isFile || !file.name.endsWith('.md')) continue;
          const slug = file.name.replace(/\.md$/, '');
          matches.push({
            slug,
            relativePath: `snippets/${entry.name}/${file.name}`,
            absolutePath: join(langDir, file.name),
            lang: entry.name,
          });
        }
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  } else if (type === 'tldr') {
    const dir = join(libraryPath, 'tldr');
    try {
      for await (const file of Deno.readDir(dir)) {
        if (!file.isFile || !file.name.endsWith('.md')) continue;
        const slug = file.name.replace(/\.md$/, '');
        matches.push({
          slug,
          relativePath: `tldr/${file.name}`,
          absolutePath: join(dir, file.name),
          lang: null,
        });
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  } else if (type === 'project') {
    const dir = join(libraryPath, 'projects');
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (!entry.isDirectory) continue;
        matches.push({
          slug: entry.name,
          relativePath: `projects/${entry.name}/README.md`,
          absolutePath: join(dir, entry.name, 'README.md'),
          lang: null,
        });
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }

  matches.sort((a, b) => a.slug.localeCompare(b.slug));
  return matches;
}

/**
 * List all items of a given type (or all items) from the DB.
 */
export function listItems(
  db: Database,
  type?: ItemType,
): Array<{ id: number; type: string; title: string; path: string; lang: string | null; tags: string[]; created: string }> {
  let sql = 'SELECT id, type, title, path, lang, tags, created FROM items';
  const params: (string | number | null)[] = [];

  if (type) {
    sql += ' WHERE type = ?';
    params.push(type);
  }
  sql += ' ORDER BY created DESC';

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number;
    type: string;
    title: string;
    path: string;
    lang: string | null;
    tags: string;
    created: string;
  }>;

  return rows.map((r) => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : [],
  }));
}
