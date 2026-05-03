/**
 * Library manager — CRUD for snippets, TLDRs, and projects.
 */

import { join, dirname } from "@std/path";
import { Database } from "@db/sqlite";
import { serializeFrontmatter, parseFrontmatter, type BaseFrontmatter } from "./frontmatter.ts";
import { indexItem, removeIndex } from "./sync.ts";
import { regenerateDashboard } from "./dashboard.ts";
import { getLibraryPath } from "../utils/xdg.ts";
import { loadConfig } from "../config/config.ts";

export type ItemType = "snippet" | "tldr" | "project";

export interface SaveItemOptions {
  title: string;
  tags: string[];
  lang?: string;
  source: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  sessionId?: number;
}

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
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get a unique slug by appending -2, -3, etc. if file exists.
 */
export async function uniqueSlug(baseSlug: string, dir: string, ext = ".md"): Promise<string> {
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
    case "snippet": {
      const lang = options.lang || "misc";
      const dir = join(libraryPath, "snippets", lang);
      const unique = await uniqueSlug(slug, dir);
      return `snippets/${lang}/${unique}.md`;
    }
    case "tldr": {
      const dir = join(libraryPath, "tldr");
      const unique = await uniqueSlug(slug, dir);
      return `tldr/${unique}.md`;
    }
    case "project": {
      const dir = join(libraryPath, "projects");
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
    created: new Date().toISOString().split("T")[0],
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

/**
 * List all items of a given type (or all items) from the DB.
 */
export function listItems(
  db: Database,
  type?: ItemType,
): Array<{ id: number; type: string; title: string; path: string; lang: string | null; tags: string[]; created: string }> {
  let sql = "SELECT id, type, title, path, lang, tags, created FROM items";
  const params: (string | number | null)[] = [];

  if (type) {
    sql += " WHERE type = ?";
    params.push(type);
  }
  sql += " ORDER BY created DESC";

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
