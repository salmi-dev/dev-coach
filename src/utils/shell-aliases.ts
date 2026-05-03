/**
 * Shell alias installer for quick-access library commands (`c-tldr`, `c-snip`).
 *
 * Appends an idempotent fenced block to the user's shell rc file. Supports bash and zsh in v1.
 */

import { join } from '@std/path';
import { getHomeDir, getOS } from './platform.ts';

/** Supported shells in v1. */
export type SupportedShell = 'bash' | 'zsh';

/** Marker that begins the dev-coach alias block in the rc file. */
export const ALIAS_BLOCK_START = '# >>> dev-coach aliases >>>';
/** Marker that ends the dev-coach alias block in the rc file. */
export const ALIAS_BLOCK_END = '# <<< dev-coach aliases <<<';

/** Alias definitions written between the markers. */
const ALIAS_LINES = [
  "alias c-tldr='coach tldr'",
  "alias c-snip='coach snippet'",
];

/** A regex matching the entire fenced block (including markers and trailing newline). */
const BLOCK_RE = new RegExp(
  `\\n?${escapeRe(ALIAS_BLOCK_START)}[\\s\\S]*?${escapeRe(ALIAS_BLOCK_END)}\\n?`,
  'g',
);

/** Escape a literal string for use in a `RegExp`. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect the user's shell from `$SHELL` and return its rc file path.
 *
 * @returns `{ shell, rcPath }` for supported shells; `null` for unsupported shells (fish, csh, etc.).
 */
export function detectShellRc(): { shell: SupportedShell; rcPath: string } | null {
  const shellEnv = Deno.env.get('SHELL') ?? '';
  const home = getHomeDir();

  if (shellEnv.endsWith('/zsh') || shellEnv === 'zsh') {
    return { shell: 'zsh', rcPath: join(home, '.zshrc') };
  }
  if (shellEnv.endsWith('/bash') || shellEnv === 'bash') {
    return { shell: 'bash', rcPath: join(home, '.bashrc') };
  }
  return null;
}

/** Build the full alias block as it appears in the rc file. */
export function buildAliasBlock(): string {
  return [ALIAS_BLOCK_START, ...ALIAS_LINES, ALIAS_BLOCK_END].join('\n');
}

/** Result of an alias install/uninstall operation. */
export interface AliasOpResult {
  /** Path to the rc file that was modified (or would have been modified). */
  rcPath: string;
  /** Detected shell name. */
  shell: SupportedShell;
  /** `true` when the file was changed; `false` for no-op (already up to date / not present). */
  changed: boolean;
}

/**
 * Install the dev-coach alias block into the detected shell's rc file.
 *
 * Idempotent: if the block already exists, its contents are replaced (no duplication).
 * Creates the rc file if it doesn't exist.
 *
 * @param rcPathOverride Optional rc file path (mainly for tests). When omitted, detected from `$SHELL`.
 * @param shellOverride Optional shell name (mainly for tests).
 * @returns Operation result describing what was changed.
 * @throws Error when no supported shell is detected.
 *
 * @example
 * ```ts
 * const res = await installAliases();
 * console.log(`Updated ${res.rcPath}`);
 * ```
 */
export async function installAliases(rcPathOverride?: string, shellOverride?: SupportedShell): Promise<AliasOpResult> {
  const { shell, rcPath } = resolveTarget(rcPathOverride, shellOverride);

  let existing = '';
  try {
    existing = await Deno.readTextFile(rcPath);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }

  const block = buildAliasBlock();
  let next: string;

  if (BLOCK_RE.test(existing)) {
    // Reset lastIndex (BLOCK_RE is global) and replace.
    BLOCK_RE.lastIndex = 0;
    next = existing.replace(BLOCK_RE, `\n${block}\n`);
  } else {
    const sep = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
    next = `${existing}${sep}\n${block}\n`;
  }

  if (next === existing) {
    return { rcPath, shell, changed: false };
  }

  await Deno.writeTextFile(rcPath, next);
  return { rcPath, shell, changed: true };
}

/**
 * Remove the dev-coach alias block from the user's shell rc.
 *
 * Surrounding lines are preserved untouched. No-op when the block is absent.
 *
 * @param rcPathOverride Optional rc file path (mainly for tests).
 * @param shellOverride Optional shell name (mainly for tests).
 * @returns Operation result describing what was changed.
 * @throws Error when no supported shell is detected.
 */
export async function uninstallAliases(rcPathOverride?: string, shellOverride?: SupportedShell): Promise<AliasOpResult> {
  const { shell, rcPath } = resolveTarget(rcPathOverride, shellOverride);

  let existing = '';
  try {
    existing = await Deno.readTextFile(rcPath);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return { rcPath, shell, changed: false };
    }
    throw e;
  }

  BLOCK_RE.lastIndex = 0;
  if (!BLOCK_RE.test(existing)) {
    return { rcPath, shell, changed: false };
  }

  BLOCK_RE.lastIndex = 0;
  const next = existing.replace(BLOCK_RE, '\n');
  await Deno.writeTextFile(rcPath, next);
  return { rcPath, shell, changed: true };
}

/** Resolve install/uninstall target shell + rc file, raising on unsupported shells. */
function resolveTarget(rcPathOverride?: string, shellOverride?: SupportedShell): { shell: SupportedShell; rcPath: string } {
  if (rcPathOverride && shellOverride) {
    return { shell: shellOverride, rcPath: rcPathOverride };
  }
  const detected = detectShellRc();
  if (!detected) {
    const shellEnv = Deno.env.get('SHELL') ?? '<unset>';
    throw new Error(`Unsupported shell: ${shellEnv}. Supported: bash, zsh`);
  }
  return detected;
}

/**
 * Print a friendly hint to source the rc file (no-op on Windows where rc files don't apply).
 *
 * @param rcPath Path to the rc that was modified.
 */
export function printSourceHint(rcPath: string): void {
  if (getOS() === 'windows') return;
  console.log(`\n💡 Run \`source ${rcPath}\` (or open a new shell) to enable the aliases.`);
}
