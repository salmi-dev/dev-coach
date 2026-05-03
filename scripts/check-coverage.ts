#!/usr/bin/env -S deno run --allow-read --allow-run

/**
 * check-coverage.ts — enforce a minimum line-coverage threshold across runtimes.
 *
 * Two input modes, one threshold-decision codepath:
 *
 * 1. **Deno profile-dir mode** (default, positional arg). Runs `deno coverage <dir>`
 *    over `src/` (with per-runtime adapters excluded), parses the "All files" summary
 *    line, and gates on {@link THRESHOLD}.
 *
 * 2. **lcov mode** (`--lcov <path>`). Parses a standard `lcov.info` file (only `SF:`
 *    and `DA:` records), aggregates line coverage across files matching the include
 *    set, and gates on the supplied (or default) threshold. Used by the Bun and Node
 *    cross-runtime CI jobs.
 *
 * @example Deno mode
 * ```bash
 * deno test --coverage=cov_profile tests/
 * deno run --allow-read --allow-run scripts/check-coverage.ts cov_profile
 * ```
 *
 * @example lcov mode (Bun / Node)
 * ```bash
 * bun test --coverage --coverage-reporter=lcov tests/cross-runtime/
 * deno run --allow-read --allow-run scripts/check-coverage.ts \
 *   --lcov coverage/lcov.info --profile cross-runtime --threshold 80
 * ```
 *
 * The `cross-runtime` preset resolves to {@link CROSS_RUNTIME_INCLUDE} — the single
 * source of truth for "which files the cross-runtime test suite is meant to cover".
 * Adding a module to that suite means adding its glob here.
 */

import { stripAnsi } from '../src/utils/colors.ts';
export { stripAnsi };

/** Minimum overall line-coverage percentage required for `deno task verify` to pass. */
export const THRESHOLD = 80;

/**
 * Globs scoping the coverage gate for the Bun and Node cross-runtime jobs.
 *
 * The cross-runtime test suite (`tests/cross-runtime/`) only exercises the
 * runtime-portable surface of the codebase; gating on `src/` as a whole would
 * either be misleading (low %) or force us to ship cross-runtime tests for
 * unrelated modules. Keep this list aligned with what `tests/cross-runtime/`
 * actually imports.
 */
export const CROSS_RUNTIME_INCLUDE: readonly string[] = [
  'src/utils/runtime/**',
  'src/db/sqlite/**',
  'src/utils/prompt.ts',
];

/** Named scope presets that the workflow YAML can pass via `--profile <name>`. */
const PRESETS: Record<string, readonly string[]> = {
  'cross-runtime': CROSS_RUNTIME_INCLUDE,
};

// ---------------------------------------------------------------------------
// Deno profile-dir mode
// ---------------------------------------------------------------------------

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
 * Run the Deno coverage check against a profile directory.
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
    args: [
      'coverage',
      profileDir,
      '--include=src/',
      // Exclude per-runtime adapters that cannot be exercised on a Deno host.
      // The cross-runtime CI matrix (Group 7 of boost-jsr-score-and-runtime-compat)
      // exercises these on Bun + Node; combining coverage across runtimes is
      // out of scope for now.
      '--exclude=src/utils/runtime/(bun|node|_node-compat)\\.ts$',
      '--exclude=src/db/sqlite/(bun|node)\\.ts$',
    ],
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

// ---------------------------------------------------------------------------
// lcov mode
// ---------------------------------------------------------------------------

/** Aggregate line counts produced by {@link aggregateLcov}. */
export interface LcovAggregate {
  /** Total executable lines across included files. */
  linesFound: number;
  /** Total hit lines across included files. */
  linesHit: number;
  /** Files that contributed to the aggregate (post-include filter), in lcov order. */
  files: string[];
}

/**
 * Convert a glob-ish pattern (`src/foo/**`, `src/bar/*.ts`, `src/baz.ts`) into a
 * RegExp that matches an lcov `SF:` path. Supports only `**` (any depth incl. zero)
 * and `*` (any chars except `/`); literal segments otherwise. Matches paths from
 * any directory prefix (so a profile that emits absolute or `./` paths still works).
 *
 * @param glob A simple glob, posix-separated.
 * @returns A RegExp anchored at end of path, allowing any prefix.
 */
export function globToRegex(glob: string): RegExp {
  // Escape regex metacharacters except `*`.
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        // `**` — match any depth (including zero) of path chars.
        re += '.*';
        i++;
      } else {
        // `*` — match any chars except `/`.
        re += '[^/]*';
      }
    } else if ('.+?^${}()|[]\\'.includes(ch)) {
      re += '\\' + ch;
    } else {
      re += ch;
    }
  }
  // Allow any prefix (lcov may emit `src/...`, `./src/...`, or absolute paths)
  // and require the glob to match the tail of the path.
  return new RegExp(`(^|/)${re}$`);
}

/**
 * Aggregate line coverage from an lcov.info file across files whose `SF:` paths
 * match any of the supplied include patterns.
 *
 * Only `SF:` (file header) and `DA:` (line hit count) records are honored; all
 * other records (`BRDA:`, `FN:`, `LF:`, `LH:`, etc.) are ignored. This is robust
 * across Bun and Node lcov dialects.
 *
 * @param lcov Raw contents of an lcov.info file.
 * @param include One or more glob patterns. A file is included if any matches.
 * @returns Aggregate counts plus the list of contributing files.
 */
export function aggregateLcov(lcov: string, include: readonly string[]): LcovAggregate {
  const patterns = include.map(globToRegex);
  const matches = (path: string) => patterns.some((p) => p.test(path));

  let currentFile: string | null = null;
  let includeCurrent = false;
  let linesFound = 0;
  let linesHit = 0;
  const files: string[] = [];

  for (const rawLine of lcov.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('SF:')) {
      currentFile = line.slice(3);
      includeCurrent = matches(currentFile);
      if (includeCurrent) files.push(currentFile);
    } else if (line === 'end_of_record') {
      currentFile = null;
      includeCurrent = false;
    } else if (includeCurrent && line.startsWith('DA:')) {
      // Format: DA:<line>,<hits>[,<checksum>]. Reject anything without a comma.
      const body = line.slice(3);
      const comma = body.indexOf(',');
      if (comma < 0) continue;
      const hits = parseInt(body.slice(comma + 1), 10);
      if (!isNaN(hits)) {
        linesFound += 1;
        if (hits > 0) linesHit += 1;
      }
    }
  }

  return { linesFound, linesHit, files };
}

/**
 * Compute line-coverage percentage from an aggregate. Returns `null` when the
 * aggregate has no executable lines (no files matched the include set, or all
 * matched files were empty).
 *
 * @param agg Aggregate counts returned by {@link aggregateLcov}.
 * @returns Percentage (0–100), or `null` when undefined.
 */
export function aggregatePercent(agg: LcovAggregate): number | null {
  if (agg.linesFound === 0) return null;
  return (agg.linesHit / agg.linesFound) * 100;
}

/**
 * Run the lcov-mode coverage check.
 *
 * @param lcovPath Path to an `lcov.info` file produced by Bun or Node.
 * @param include Either an array of include globs, or a preset name (e.g. `cross-runtime`).
 * @param threshold Minimum line-coverage percentage; defaults to {@link THRESHOLD}.
 * @returns Exit code: 0 when ≥ threshold, 1 otherwise.
 */
export async function checkLcov(
  lcovPath: string,
  include: readonly string[] | string,
  threshold: number = THRESHOLD,
): Promise<number> {
  const includeGlobs = typeof include === 'string'
    ? (PRESETS[include] ??
      (() => {
        console.error(`Unknown coverage preset: ${include}`);
        console.error(`Known presets: ${Object.keys(PRESETS).join(', ') || '(none)'}`);
        return null;
      })())
    : include;
  if (includeGlobs === null) return 1;
  if (includeGlobs.length === 0) {
    console.error('No include globs supplied (use --include or --profile <name>).');
    return 1;
  }

  let lcov: string;
  try {
    lcov = await Deno.readTextFile(lcovPath);
  } catch (e) {
    console.error(`Cannot read lcov file: ${lcovPath}: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }

  const agg = aggregateLcov(lcov, includeGlobs);
  const pct = aggregatePercent(agg);
  if (pct === null) {
    console.error(`No lines matched include globs in ${lcovPath}.`);
    console.error(`  globs: ${includeGlobs.join(', ')}`);
    console.error(`  files in lcov: ${agg.files.length}`);
    return 1;
  }

  const fmtPct = pct.toFixed(1);
  if (pct < threshold) {
    console.error(`❌ Coverage ${fmtPct}% is below threshold ${threshold}%`);
    console.error(`  scope: ${includeGlobs.join(', ')}`);
    console.error(`  files: ${agg.files.length} (${agg.linesHit}/${agg.linesFound} lines)`);
    return 1;
  }

  console.log(`✅ Coverage ${fmtPct}% (≥ ${threshold}% threshold)`);
  console.log(`   scope: ${includeGlobs.join(', ')}`);
  console.log(`   files: ${agg.files.length} (${agg.linesHit}/${agg.linesFound} lines)`);
  return 0;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

/**
 * Parsed CLI invocation. Either `kind: 'deno'` (positional profile dir) or
 * `kind: 'lcov'` (`--lcov` plus include/profile/threshold flags).
 */
export type ParsedArgs =
  | { kind: 'deno'; profileDir: string }
  | {
    kind: 'lcov';
    lcovPath: string;
    include: readonly string[] | string;
    threshold: number;
  };

/**
 * Parse CLI argv into a {@link ParsedArgs} or `null` when the input is malformed.
 *
 * @param args Raw `Deno.args`-shaped array.
 * @returns Parsed shape, or `null` to signal a usage error (caller exits 1).
 */
export function parseArgs(args: readonly string[]): ParsedArgs | null {
  let lcovPath: string | null = null;
  let includeRaw: string | null = null;
  let profile: string | null = null;
  let threshold: number = THRESHOLD;
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => {
      const v = args[i + 1];
      if (v === undefined) return null;
      i++;
      return v;
    };
    if (a === '--lcov') {
      const v = next();
      if (v === null) return null;
      lcovPath = v;
    } else if (a === '--include') {
      const v = next();
      if (v === null) return null;
      includeRaw = v;
    } else if (a === '--profile') {
      const v = next();
      if (v === null) return null;
      profile = v;
    } else if (a === '--threshold') {
      const v = next();
      if (v === null) return null;
      const n = parseFloat(v);
      if (isNaN(n)) return null;
      threshold = n;
    } else if (a.startsWith('--')) {
      // Unknown flag.
      return null;
    } else {
      positional.push(a);
    }
  }

  if (lcovPath !== null) {
    if (includeRaw === null && profile === null) {
      // Default to cross-runtime preset when neither is supplied.
      profile = 'cross-runtime';
    }
    if (includeRaw !== null && profile !== null) {
      // Both is fine — explicit globs take precedence.
    }
    const include = includeRaw !== null ? includeRaw.split(',').map((s) => s.trim()).filter((s) => s.length > 0) : profile!;
    return { kind: 'lcov', lcovPath, include, threshold };
  }

  return { kind: 'deno', profileDir: positional[0] ?? 'cov_profile' };
}

if (import.meta.main) {
  const parsed = parseArgs(Deno.args);
  if (parsed === null) {
    console.error('Usage: check-coverage.ts <profile-dir>');
    console.error('   or: check-coverage.ts --lcov <path> [--profile <preset> | --include <globs>] [--threshold <N>]');
    Deno.exit(1);
  }
  if (parsed.kind === 'deno') {
    Deno.exit(await checkCoverage(parsed.profileDir));
  } else {
    Deno.exit(await checkLcov(parsed.lcovPath, parsed.include, parsed.threshold));
  }
}
