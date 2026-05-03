/**
 * Search library items by text, type, language, tags, and combined filters.
 */

import { Database } from "@db/sqlite";
import type { ItemType } from "./library.ts";

export interface SearchFilters {
  query?: string; // FTS5 full-text
  type?: ItemType; // snippet | tldr | project
  lang?: string;
  tags?: string[]; // match any
  limit?: number;
}

export interface SearchResult {
  id: number;
  type: string;
  title: string;
  path: string;
  lang: string | null;
  tags: string[];
  created: string;
}

/**
 * Search library items with composable filters.
 * Builds a single SQL query with optional WHERE clauses.
 */
export function search(db: Database, filters: SearchFilters): SearchResult[] {
  const conditions: string[] = [];
  const params: (string | number | null)[] = [];
  let useFts = false;

  // FTS full-text search
  if (filters.query) {
    useFts = true;
    conditions.push("items_fts MATCH ?");
    params.push(filters.query);
  }

  // Type filter
  if (filters.type) {
    conditions.push("i.type = ?");
    params.push(filters.type);
  }

  // Language filter
  if (filters.lang) {
    conditions.push("i.lang = ?");
    params.push(filters.lang);
  }

  // Tag filter (match any)
  if (filters.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map(() => "i.tags LIKE ?");
    conditions.push(`(${tagConditions.join(" OR ")})`);
    for (const tag of filters.tags) {
      params.push(`%"${tag}"%`);
    }
  }

  // Build query
  let sql: string;
  if (useFts) {
    sql = `SELECT i.id, i.type, i.title, i.path, i.lang, i.tags, i.created
           FROM items i
           JOIN items_fts ON items_fts.rowid = i.id`;
  } else {
    sql = `SELECT i.id, i.type, i.title, i.path, i.lang, i.tags, i.created
           FROM items i`;
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += " ORDER BY i.created DESC";

  if (filters.limit) {
    sql += " LIMIT ?";
    params.push(filters.limit);
  }

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
