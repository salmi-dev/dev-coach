/**
 * Dev Coach — AI-powered coding coach
 * Library entry point for programmatic usage.
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
