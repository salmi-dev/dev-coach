/**
 * Base skill interface and shared runner.
 */

import { type Database } from '../db/sqlite/index.ts';
import { CoachConfig } from '../config/schema.ts';
import { search, type SearchFilters, type SearchResult } from '../storage/search.ts';
import { logSession } from '../db/logger.ts';
import { savePrompt } from '../storage/save-prompt.ts';
import { copyToClipboard, detectClipboardTool } from '../utils/clipboard.ts';
import { readPromptLine } from '../utils/prompt.ts';
import { closeDb, getDb } from '../db/connection.ts';
import { loadConfig } from '../config/config.ts';
import { getLibraryPath } from '../utils/xdg.ts';
import type { ItemType } from '../storage/library.ts';

// ── Types ──────────────────────────────────────────────────────

/** Shared runtime context handed to every skill. */
export interface SessionContext {
  db: Database;
  config: CoachConfig;
  libraryPath: string;
  searchLibrary: (filters: SearchFilters) => SearchResult[];
}

/** Result returned by a skill's `run()` method. */
export interface SkillResult {
  response: string;
  lang?: string;
  tags?: string[];
  suggestedTitle?: string;
  suggestedType?: ItemType;
}

/** A coach skill: id + display metadata + an async `run` entry point. */
export interface Skill {
  id: string;
  icon: string;
  name: string;
  run(input: string, context: SessionContext): Promise<SkillResult>;
}

// ── Context Creation ───────────────────────────────────────────

/** Build a session context (loads config, opens DB, exposes search helper). */
export async function createContext(configPath?: string): Promise<SessionContext> {
  const config = await loadConfig(configPath);
  const db = await getDb();
  const libraryPath = getLibraryPath(config.library_path);

  return {
    db,
    config,
    libraryPath,
    searchLibrary: (filters: SearchFilters) => search(db, filters),
  };
}

/** Close the shared DB connection (call at the end of a CLI command). */
export function destroyContext(): void {
  closeDb();
}

// ── Command Detection ──────────────────────────────────────────

const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const SHELL_CMD_REGEX = /^\s*\$\s+.+/gm;

/** Extract code blocks and `$ ...` shell lines from `text` (used for clipboard suggestions). */
export function detectCommands(text: string): string[] {
  const commands: string[] = [];

  // Extract code blocks
  const blocks = text.match(CODE_BLOCK_REGEX);
  if (blocks) {
    for (const block of blocks) {
      const inner = block.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim();
      if (inner) commands.push(inner);
    }
  }

  // Extract shell commands (lines starting with $)
  const shellLines = text.match(SHELL_CMD_REGEX);
  if (shellLines) {
    for (const line of shellLines) {
      const cmd = line.replace(/^\s*\$\s+/, '').trim();
      if (cmd) commands.push(cmd);
    }
  }

  return commands;
}

/** `true` when `text` contains at least one command-like block detected by {@link detectCommands}. */
export function hasCommands(text: string): boolean {
  return detectCommands(text).length > 0;
}

// ── Skill Runner ───────────────────────────────────────────────

/**
 * Run a skill end-to-end: invoke `skill.run`, print response, optionally copy commands and prompt to save.
 *
 * @param skill The skill instance to run.
 * @param input Free-form user input forwarded to the skill.
 * @param context Shared session context.
 */
export async function runSkill(
  skill: Skill,
  input: string,
  context: SessionContext,
): Promise<void> {
  const startTime = Date.now();

  // Run the skill
  const result = await skill.run(input, context);

  // Print response
  console.log();
  console.log(result.response);
  console.log();

  const durationS = Math.round((Date.now() - startTime) / 1000);

  // Detect commands for clipboard
  const commands = detectCommands(result.response);
  if (commands.length > 0) {
    const clipTool = await detectClipboardTool();
    if (clipTool) {
      const answer = (await readPromptLine('📋 Copy command? [Y/n] ')) ?? '';
      if (answer.trim().toLowerCase() !== 'n') {
        const copied = await copyToClipboard(commands[0]);
        if (copied) console.log('📋 Copied to clipboard!');
      }
    }
  }

  // Save prompt if skill suggests saving
  if (result.suggestedTitle && result.suggestedType) {
    await savePrompt(
      context.db,
      result.suggestedType,
      result.suggestedTitle,
      result.tags ?? [],
      result.response,
      {
        source: `coach:${skill.id}`,
        lang: result.lang,
        libraryPath: context.libraryPath,
      },
    );
  }

  // Log session
  logSession(context.db, {
    mode: skill.id,
    lang: result.lang,
    tags: result.tags,
    query: input,
    duration_s: durationS,
  });
}
