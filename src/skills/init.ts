/**
 * coach init — Interactive first-run setup.
 */

import { parseArgs } from '@std/cli/parse-args';
import { join } from '@std/path';
import { runtime } from '../utils/runtime/index.ts';
import { readPromptLine } from '../utils/prompt.ts';
import { getConfigPath, saveConfig } from '../config/config.ts';
import { closeDb, getDb } from '../db/connection.ts';
import { getLibraryPath } from '../utils/xdg.ts';
import { isInteractive } from '../utils/platform.ts';
import { renderBox, renderWelcomeBanner } from '../utils/ascii.ts';
import { CoachConfig, DEFAULT_CONFIG, ResponseStyle, VALID_RESPONSE_STYLES } from '../config/schema.ts';

const COMMON_LANGUAGES = [
  'typescript',
  'javascript',
  'rust',
  'python',
  'go',
  'java',
  'shell',
  'c',
  'cpp',
  'ruby',
  'kotlin',
  'swift',
];

/** Run the init command. */
export async function runInit(args: string[], configOverride?: string): Promise<void> {
  const parsed = parseArgs(args, { boolean: ['force'] });
  const force = parsed.force;

  // Welcome banner
  console.log(renderWelcomeBanner());
  console.log();

  // Re-init guard
  const configPath = getConfigPath(configOverride);
  if (!force) {
    try {
      await runtime.stat(configPath);
      // Config exists
      console.log('⚠️  Config already exists at:', configPath);
      const answer = await readPromptLine('Overwrite? [y/N] ');
      if (answer?.toLowerCase() !== 'y') {
        console.log('Aborted.');
        return;
      }
    } catch (e) {
      if (!runtime.errors.isNotFound(e)) throw e;
      // No config — proceed
    }
  }

  let config: CoachConfig;

  if (isInteractive()) {
    config = await interactiveSetup();
  } else {
    // Non-interactive: use defaults
    config = { ...DEFAULT_CONFIG };
  }

  // Save config
  await saveConfig(config, configOverride);
  console.log(`\n✅ Config written to ${configPath}`);

  // Create database (triggers migrations)
  await getDb();
  closeDb();
  console.log('✅ Database created');

  // Scaffold library directories
  const libraryPath = getLibraryPath(config.library_path);
  const dirs = ['snippets', 'tldr', 'projects'];
  for (const dir of dirs) {
    await runtime.mkdir(join(libraryPath, dir), { recursive: true });
  }
  console.log(`✅ Library initialized at ${libraryPath}`);

  // Write initial README dashboard
  await writeInitialDashboard(libraryPath);
  console.log('✅ Dashboard README created');

  // Optional: install shell aliases.
  const aliasesInstalled = await maybeInstallAliases();

  // Summary
  console.log();
  console.log(
    renderBox('🎓 Setup Complete!', [
      '',
      `  Config:   ${configPath}`,
      `  Library:  ${libraryPath}`,
      ...(aliasesInstalled ? [`  Aliases:  c-tldr, c-snip installed (${aliasesInstalled})`] : []),
      '',
      '  Try: coach ask "how do I ..."',
      '',
    ]),
  );
}

/**
 * Decide whether the user accepted the alias install prompt.
 *
 * Pure function so it can be unit-tested without TTY/subprocess plumbing.
 *
 * @param answer Raw answer string from the prompt, or `null` when stdin returned EOF.
 * @param interactive Whether the current session is interactive (TTY).
 * @returns `true` when aliases should be installed, `false` otherwise.
 */
export function shouldInstallAliases(answer: string | null, interactive: boolean): boolean {
  if (!interactive) return false;
  if (answer === null) return false;
  const trimmed = answer.trim().toLowerCase();
  // Default (Enter) is yes; explicit 'n'/'no' is no.
  if (trimmed === 'n' || trimmed === 'no') return false;
  return true;
}
/**
 * Optionally prompt the user to install shell aliases (`c-tldr`, `c-snip`).
 *
 * Skipped silently in non-interactive mode. Returns the rc path that was modified, or
 * `null` when no install happened.
 */
async function maybeInstallAliases(): Promise<string | null> {
  if (!isInteractive()) return null;

  const answer = await readPromptLine(
    '\nInstall shell aliases (c-tldr, c-snip)? [Y/n] ',
  );
  if (!shouldInstallAliases(answer, true)) return null;

  try {
    const { installAliases, printSourceHint } = await import('../utils/shell-aliases.ts');
    const res = await installAliases();
    if (res.changed) {
      console.log(`✅ Installed shell aliases in ${res.rcPath}`);
      printSourceHint(res.rcPath);
    } else {
      console.log(`ℹ️  Shell aliases already up to date in ${res.rcPath}`);
    }
    return res.rcPath;
  } catch (e) {
    console.log(`⚠️  Skipped alias install: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Interactive prompts for setup. */
async function interactiveSetup(): Promise<CoachConfig> {
  console.log('Select your primary languages (comma-separated numbers):');
  COMMON_LANGUAGES.forEach((lang, i) => console.log(`  ${i + 1}. ${lang}`));
  console.log(`  ${COMMON_LANGUAGES.length + 1}. Other (type manually)`);

  const langInput = await readPromptLine('\nLanguages [e.g., 1,2,6]: ');
  const languages = parseLangSelection(langInput || '');

  const fwInput = await readPromptLine('\nFrameworks/tools (comma-separated): ');
  const frameworks = (fwInput || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log('\nResponse style:');
  VALID_RESPONSE_STYLES.forEach((style, i) => console.log(`  ${i + 1}. ${style}`));
  const styleInput = await readPromptLine('\nStyle [1]: ');
  const styleIdx = parseInt(styleInput || '1') - 1;
  const responseStyle: ResponseStyle = VALID_RESPONSE_STYLES[styleIdx] || 'concise';

  const libInput = await readPromptLine('\nLibrary path [~/dev-coach]: ');
  const libraryPath = libInput?.trim() || '~/dev-coach';

  return {
    library_path: libraryPath,
    primary_languages: languages,
    frameworks,
    response_style: responseStyle,
    os: runtime.osPlatform(),
  };
}

/**
 * Parse a comma-separated language selection from the init prompt.
 *
 * Numbers are looked up in {@link COMMON_LANGUAGES}; non-numeric tokens are kept as manual
 * language names (lower-cased). Out-of-range numbers are silently ignored.
 *
 * @param input Raw user input from the languages prompt.
 * @returns Array of resolved language names (may be empty).
 *
 * @example
 * ```ts
 * parseLangSelection('1,2,go'); // ['typescript', 'javascript', 'go']
 * ```
 */
export function parseLangSelection(input: string): string[] {
  const parts = input.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  const languages: string[] = [];

  for (const part of parts) {
    const num = parseInt(part);
    if (!isNaN(num) && num >= 1 && num <= COMMON_LANGUAGES.length) {
      languages.push(COMMON_LANGUAGES[num - 1]);
    } else if (isNaN(num)) {
      // Treat as manual language name
      languages.push(part.toLowerCase());
    }
  }

  return languages;
}

/** Write the initial README.md dashboard to the library root. */
async function writeInitialDashboard(libraryPath: string): Promise<void> {
  const readme = `# 🎓 Dev Coach — My Knowledge Base

## 📊 Stats
- Total sessions: 0
- Snippets: 0 | TLDRs: 0 | Projects: 0

## 📝 Recent Snippets
_No snippets yet. Try \`coach sandbox "topic"\` to start collecting!_

## 📖 TLDRs
_No TLDRs yet. Try \`coach ask "question"\` and save the answer!_

## 🏗️ Projects
_No projects yet. Try \`coach project "idea"\` to build something!_

---
_Generated by Dev Coach. Updated automatically._
`;
  await runtime.writeTextFile(join(libraryPath, 'README.md'), readme);
}
