/**
 * coach-search — Pi custom tool for searching the library.
 */

import { closeDb, getDb } from '../../db/connection.ts';
import { search, type SearchFilters, type SearchResult } from '../../storage/search.ts';

/**
 * Search the library using composable filters.
 *
 * @param params Search filters (query, type, lang, tags, limit).
 * @returns Matching items ordered by recency.
 *
 * @example
 * ```ts
 * const hits = coachSearch({ type: 'tldr', query: 'json' });
 * ```
 */
export async function coachSearch(params: SearchFilters): Promise<SearchResult[]> {
  const db = await getDb();
  try {
    return search(db, params);
  } finally {
    closeDb();
  }
}
