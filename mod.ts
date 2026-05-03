/**
 * # Dev Coach
 *
 * AI-powered coding coach: a personal library for **snippets**, **TLDRs**, and **mini-projects**
 * backed by SQLite full-text search. This module is the programmatic entry point — the CLI
 * (`coach`) is published from {@link ./cli}.
 *
 * Most users want the `coach` binary; this module is for tools, scripts, and editors that need
 * to read or extend a Dev Coach library directly.
 *
 * ## Public API
 *
 * - **Config** — {@link loadConfig}, {@link saveConfig}, {@link validateConfig}, {@link CoachConfig}
 * - **Database** — {@link getDb}, {@link closeDb}, {@link runMigrations}, {@link logSession}
 * - **Storage** — {@link saveItem}, {@link readItem}, {@link listItems}, {@link deleteItem},
 *   {@link toSlug}, {@link parseFrontmatter}, {@link serializeFrontmatter}
 * - **Search** — {@link search}, {@link rebuildIndex}, {@link regenerateDashboard}
 * - **Utilities** — {@link getHomeDir}, {@link getOS}, {@link isInteractive},
 *   {@link getConfigDir}, {@link getDataDir}, {@link getLibraryPath},
 *   {@link copyToClipboard}, {@link renderBox}, {@link SKILL_ICONS}
 *
 * Items live as Markdown files with YAML frontmatter under the user's library directory
 * (`~/.local/share/dev-coach/library/` on Linux, `~/Library/Application Support/dev-coach/library/`
 * on macOS) and are indexed in `coach.db` (SQLite + FTS5).
 *
 * @example Load config and save a snippet
 * ```ts
 * import { loadConfig, saveItem } from '@salmidev/dev-coach';
 *
 * const config = await loadConfig();
 * const path = await saveItem({
 *   type: 'snippet',
 *   title: 'Parse JSON with Serde',
 *   lang: 'rust',
 *   tags: ['serde', 'json'],
 *   content: 'use serde_json::Value;\nlet v: Value = serde_json::from_str(s)?;',
 * });
 * console.log(`saved to ${path}`);
 * ```
 *
 * @example Search the library with filters
 * ```ts
 * import { search } from '@salmidev/dev-coach';
 *
 * const results = await search('json', { type: 'snippet', lang: 'rust', limit: 10 });
 * for (const r of results) {
 *   console.log(`${r.title}  →  ${r.path}`);
 * }
 * ```
 *
 * @example Open the DB and rebuild the FTS index
 * ```ts
 * import { closeDb, getDb, rebuildIndex } from '@salmidev/dev-coach';
 *
 * const db = getDb();
 * const count = await rebuildIndex(db);
 * console.log(`indexed ${count} items`);
 * closeDb();
 * ```
 *
 * ## See also
 *
 * - GitHub README: https://github.com/salmi-dev/dev-coach#readme — installation, CLI usage,
 *   skills catalogue, and configuration.
 * - CLI entrypoint: `import '@salmidev/dev-coach/cli'` (rarely needed; prefer the `coach` binary).
 *
 * @module
 */

// Config
export { loadConfig, saveConfig, validateConfig } from './src/config/config.ts';
export type { CoachConfig } from './src/config/schema.ts';

// Database
export { closeDb, getDb } from './src/db/connection.ts';
export { runMigrations } from './src/db/migrations.ts';

// Storage
export { deleteItem, listItems, readItem, saveItem, toSlug } from './src/storage/library.ts';
export type { ItemType, SaveItemOptions } from './src/storage/library.ts';
export { parseFrontmatter, serializeFrontmatter } from './src/storage/frontmatter.ts';
export type { ProjectFrontmatter, SnippetFrontmatter, TldrFrontmatter } from './src/storage/frontmatter.ts';
export { search } from './src/storage/search.ts';
export type { SearchFilters, SearchResult } from './src/storage/search.ts';
export { rebuildIndex } from './src/storage/sync.ts';
export { regenerateDashboard } from './src/storage/dashboard.ts';
export { logSession } from './src/db/logger.ts';
export type { LogSessionParams } from './src/db/logger.ts';

// Utils
export { getHomeDir, getOS, isInteractive } from './src/utils/platform.ts';
export { getConfigDir, getDataDir, getLibraryPath } from './src/utils/xdg.ts';
export { copyToClipboard, detectClipboardTool } from './src/utils/clipboard.ts';
export { renderBox, SKILL_ICONS } from './src/utils/ascii.ts';
