/**
 * ANSI color and style helpers for CLI output.
 *
 * Colors auto-disable when:
 * - `NO_COLOR` env var is set (any non-empty value), per https://no-color.org
 * - `TERM=dumb` is set
 * - stdout is not a TTY (piped, redirected, or non-interactive)
 *
 * Use {@link setColorEnabled} for runtime overrides (e.g., `--no-color` flag, tests).
 *
 * @example
 * ```ts
 * import { c } from './colors.ts';
 * console.log(c.success('✅ All good'));
 * console.log(c.error('❌ Failed'));
 * console.log(`${c.bold('coach:ask')} ${c.dim('— pondering...')}`);
 * ```
 */

import { runtime } from './runtime/index.ts';

/** Compute the initial color-enabled state from environment + TTY. */
function detectColorSupport(): boolean {
  try {
    const noColor = runtime.env.get('NO_COLOR');
    if (noColor && noColor.length > 0) return false;
    if (runtime.env.get('TERM') === 'dumb') return false;
  } catch {
    // No env access → fall through to TTY check.
  }
  return runtime.stdout.isTerminal();
}

let colorEnabled = detectColorSupport();

/**
 * Override color-enabled state at runtime.
 *
 * Used by the `--no-color` global flag and by tests that need deterministic output.
 *
 * @param enabled `true` to enable ANSI escapes, `false` to disable.
 */
export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
}

/** Returns whether color output is currently enabled. */
export function isColorEnabled(): boolean {
  return colorEnabled;
}

/** Wrap `s` with ANSI codes when color is enabled. */
function wrap(open: string, close: string): (s: string) => string {
  return (s: string) => (colorEnabled ? `\x1b[${open}m${s}\x1b[${close}m` : s);
}

/**
 * Color and style helpers. Each helper is a `(s: string) => string` function
 * that wraps its argument with ANSI escape codes when color is enabled, and
 * returns the input unchanged otherwise.
 *
 * Semantic helpers (`success`, `error`, ...) should be preferred over raw
 * color helpers (`green`, `red`, ...) at call sites that express intent.
 *
 * @example
 * ```ts
 * c.bold('Title');               // bold
 * c.dim('detail');               // dim
 * c.success('done');             // green
 * c.error('boom');               // red
 * c.cyan('[tag]');               // cyan
 * ```
 */
export const c = {
  // Basic colors
  red: wrap('31', '39'),
  green: wrap('32', '39'),
  yellow: wrap('33', '39'),
  blue: wrap('34', '39'),
  magenta: wrap('35', '39'),
  cyan: wrap('36', '39'),
  gray: wrap('90', '39'),

  // Style modifiers
  bold: wrap('1', '22'),
  dim: wrap('2', '22'),
  italic: wrap('3', '23'),
  underline: wrap('4', '24'),

  // Semantic helpers (delegate to colors above)
  /** Green text — successful operations and confirmations. */
  success: (s: string) => wrap('32', '39')(s),
  /** Red text — errors and failures. */
  error: (s: string) => wrap('31', '39')(s),
  /** Yellow text — warnings and cautions. */
  warn: (s: string) => wrap('33', '39')(s),
  /** Cyan text — informational messages and tags. */
  info: (s: string) => wrap('36', '39')(s),
  /** Magenta text — highlights and accents. */
  accent: (s: string) => wrap('35', '39')(s),
} as const;

/**
 * Strip all ANSI escape sequences from a string.
 *
 * Canonical implementation reused by tests and {@link ./check-coverage.ts}.
 *
 * @param s Input that may contain ANSI escape sequences.
 * @returns The input with all `\x1b[...m` (and similar) escape codes removed.
 *
 * @example
 * ```ts
 * stripAnsi('\x1b[31mhello\x1b[0m'); // 'hello'
 * stripAnsi('plain');                 // 'plain'
 * ```
 */
export function stripAnsi(s: string): string {
  // Matches CSI sequences: ESC [ <params> <intermediate> <final-byte 0x40-0x7E>
  // deno-lint-ignore no-control-regex
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
