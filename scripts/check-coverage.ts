#!/usr/bin/env -S deno run --allow-read --allow-run

/**
 * check-coverage.ts — enforce a minimum overall line coverage threshold for `src/`.
 *
 * Runs `deno coverage <profile> --include=src/`, parses the "All files" summary line
 * to extract the line-coverage percentage, and exits non-zero when below {@link THRESHOLD}.
 *
 * @example
 * ```bash
 * deno test --coverage=cov_profile tests/
 * deno run --allow-read --allow-run scripts/check-coverage.ts cov_profile
 * ```
 *
 * Update {@link THRESHOLD} below to change the gate. Single source of truth for the value.
 */

/** Minimum overall line-coverage percentage required for `deno task verify` to pass. */
export const THRESHOLD = 80;

/**
 * Strip ANSI escape sequences from a string so the table can be parsed reliably.
 *
 * @param s String potentially containing ANSI codes.
 * @returns The same string with all CSI sequences removed.
 */
export function stripAnsi(s: string): string {
  // deno-lint-ignore no-control-regex
  return s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

/**
 * Parse the overall line-% from a `deno coverage` summary table.
 *
 * The "All files" row has the form: `| All files | <branch%> | <function%> | <line%> |`.
 *
 * @param raw Raw stdout from `deno coverage`.
 * @returns The line-coverage percent as a number, or `null` when the row can't be found.
 */
export function parseLinePercent(raw: string): number | null {
  const clean = stripAnsi(raw);
  const line = clean.split('\n').find((l) => /\bAll files\b/i.test(l));
  if (!line) return null;
  // Cells are separated by '|'; we take the last numeric cell before the trailing '|'.
  const cells = line.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
  // Expect: ["All files", branch, function, line]
  const last = cells[cells.length - 1];
  const num = parseFloat(last);
  return isNaN(num) ? null : num;
}

/**
 * Run the coverage check.
 *
 * @param profileDir Path to the coverage profile directory (e.g. `cov_profile`).
 * @returns Exit code: 0 when ≥ {@link THRESHOLD}, 1 otherwise.
 */
export async function checkCoverage(profileDir: string): Promise<number> {
  // Verify profile dir exists and is non-empty.
  try {
    const stat = await Deno.stat(profileDir);
    if (!stat.isDirectory) {
      console.error(`Coverage profile path is not a directory: ${profileDir}`);
      return 1;
    }
    let hasAny = false;
    for await (const _ of Deno.readDir(profileDir)) {
      hasAny = true;
      break;
    }
    if (!hasAny) {
      console.error(`Coverage profile directory is empty: ${profileDir}`);
      return 1;
    }
  } catch (e) {
    console.error(`Cannot read coverage profile: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }

  const cmd = new Deno.Command('deno', {
    args: ['coverage', profileDir, '--include=src/'],
    stdout: 'piped',
    stderr: 'piped',
  });
  const { success, stdout, stderr } = await cmd.output();
  if (!success) {
    console.error('deno coverage failed:');
    console.error(new TextDecoder().decode(stderr));
    return 1;
  }

  const raw = new TextDecoder().decode(stdout);
  const pct = parseLinePercent(raw);
  if (pct === null) {
    console.error('Could not parse coverage summary; raw output:');
    console.error(raw);
    return 1;
  }

  if (pct < THRESHOLD) {
    console.error(`❌ Coverage ${pct.toFixed(1)}% is below threshold ${THRESHOLD}%`);
    return 1;
  }

  console.log(`✅ Coverage ${pct.toFixed(1)}% (≥ ${THRESHOLD}% threshold)`);
  return 0;
}

if (import.meta.main) {
  const profileDir = Deno.args[0] ?? 'cov_profile';
  Deno.exit(await checkCoverage(profileDir));
}
