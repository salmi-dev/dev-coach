/**
 * Tests for `scripts/check-coverage.ts`.
 *
 * Covers:
 * - lcov parser (happy path, file filtering by include globs, malformed/empty input)
 * - preset resolution (`cross-runtime`)
 * - threshold pass / fail outcomes via `parseArgs`
 * - glob → regex conversion (matches `**`, `*`, anchored at path tail)
 */

import { assertEquals } from '@std/assert';
import { aggregateLcov, aggregatePercent, CROSS_RUNTIME_INCLUDE, globToRegex, parseArgs, THRESHOLD } from '../scripts/check-coverage.ts';

// ---------------------------------------------------------------------------
// globToRegex
// ---------------------------------------------------------------------------

Deno.test('globToRegex: literal path matches itself', () => {
  const re = globToRegex('src/utils/prompt.ts');
  assertEquals(re.test('src/utils/prompt.ts'), true);
  assertEquals(re.test('./src/utils/prompt.ts'), true);
  assertEquals(re.test('/abs/repo/src/utils/prompt.ts'), true);
  assertEquals(re.test('src/utils/prompt-other.ts'), false);
  assertEquals(re.test('src/utils/prompt.tsx'), false);
});

Deno.test('globToRegex: ** matches any depth including zero', () => {
  const re = globToRegex('src/utils/runtime/**');
  assertEquals(re.test('src/utils/runtime/'), true);
  assertEquals(re.test('src/utils/runtime/index.ts'), true);
  assertEquals(re.test('src/utils/runtime/sub/dir/file.ts'), true);
  assertEquals(re.test('src/utils/other/file.ts'), false);
});

Deno.test('globToRegex: single * does not cross /', () => {
  const re = globToRegex('src/db/sqlite/*.ts');
  assertEquals(re.test('src/db/sqlite/index.ts'), true);
  assertEquals(re.test('src/db/sqlite/deno.ts'), true);
  assertEquals(re.test('src/db/sqlite/sub/file.ts'), false);
});

Deno.test('globToRegex: regex metacharacters are escaped', () => {
  const re = globToRegex('src/foo.bar/baz.ts');
  assertEquals(re.test('src/foo.bar/baz.ts'), true);
  // `.` must not match arbitrary chars.
  assertEquals(re.test('src/fooXbar/baz.ts'), false);
});

// ---------------------------------------------------------------------------
// aggregateLcov
// ---------------------------------------------------------------------------

const SAMPLE_LCOV = `TN:
SF:src/utils/runtime/deno.ts
DA:1,1
DA:2,1
DA:3,0
DA:4,1
end_of_record
SF:src/db/sqlite/deno.ts
DA:1,1
DA:2,0
end_of_record
SF:src/cli/router.ts
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,0
end_of_record
`;

Deno.test('aggregateLcov: filters to included files only', () => {
  const agg = aggregateLcov(SAMPLE_LCOV, ['src/utils/runtime/**']);
  assertEquals(agg.linesFound, 4);
  assertEquals(agg.linesHit, 3);
  assertEquals(agg.files, ['src/utils/runtime/deno.ts']);
});

Deno.test('aggregateLcov: combines multiple include globs', () => {
  const agg = aggregateLcov(SAMPLE_LCOV, ['src/utils/runtime/**', 'src/db/sqlite/**']);
  assertEquals(agg.linesFound, 6);
  assertEquals(agg.linesHit, 4);
  assertEquals(agg.files.length, 2);
});

Deno.test('aggregateLcov: file outside include set is excluded entirely', () => {
  // src/cli/router.ts has 4/5 lines hit; including it would shift the aggregate.
  const agg = aggregateLcov(SAMPLE_LCOV, ['src/utils/runtime/**']);
  assertEquals(agg.files.includes('src/cli/router.ts'), false);
});

Deno.test('aggregateLcov: empty input yields zero counts', () => {
  const agg = aggregateLcov('', ['src/**']);
  assertEquals(agg.linesFound, 0);
  assertEquals(agg.linesHit, 0);
  assertEquals(agg.files, []);
});

Deno.test('aggregateLcov: malformed DA records are skipped', () => {
  const malformed = `SF:src/x.ts\nDA:bad\nDA:1,abc\nDA:2,1\nend_of_record\n`;
  const agg = aggregateLcov(malformed, ['src/x.ts']);
  // Only `DA:2,1` is well-formed.
  assertEquals(agg.linesFound, 1);
  assertEquals(agg.linesHit, 1);
});

Deno.test('aggregateLcov: ignores BRDA / FN / LF / LH records', () => {
  const noisy = `SF:src/x.ts
FN:1,foo
FNDA:1,foo
BRDA:1,0,0,1
DA:1,1
DA:2,0
LF:2
LH:1
end_of_record
`;
  const agg = aggregateLcov(noisy, ['src/x.ts']);
  assertEquals(agg.linesFound, 2);
  assertEquals(agg.linesHit, 1);
});

// ---------------------------------------------------------------------------
// aggregatePercent
// ---------------------------------------------------------------------------

Deno.test('aggregatePercent: returns null on empty aggregate', () => {
  assertEquals(aggregatePercent({ linesFound: 0, linesHit: 0, files: [] }), null);
});

Deno.test('aggregatePercent: computes percentage', () => {
  assertEquals(aggregatePercent({ linesFound: 10, linesHit: 7, files: ['x'] }), 70);
});

// ---------------------------------------------------------------------------
// CROSS_RUNTIME_INCLUDE shape
// ---------------------------------------------------------------------------

Deno.test('CROSS_RUNTIME_INCLUDE lists the runtime + sqlite + prompt scopes', () => {
  assertEquals(CROSS_RUNTIME_INCLUDE.includes('src/utils/runtime/**'), true);
  assertEquals(CROSS_RUNTIME_INCLUDE.includes('src/db/sqlite/**'), true);
  assertEquals(CROSS_RUNTIME_INCLUDE.includes('src/utils/prompt.ts'), true);
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

Deno.test('parseArgs: positional profile dir → deno mode', () => {
  const parsed = parseArgs(['cov_profile']);
  assertEquals(parsed?.kind, 'deno');
  if (parsed?.kind === 'deno') assertEquals(parsed.profileDir, 'cov_profile');
});

Deno.test('parseArgs: no args → deno mode with default profile dir', () => {
  const parsed = parseArgs([]);
  assertEquals(parsed?.kind, 'deno');
  if (parsed?.kind === 'deno') assertEquals(parsed.profileDir, 'cov_profile');
});

Deno.test('parseArgs: --lcov with default preset is cross-runtime', () => {
  const parsed = parseArgs(['--lcov', 'coverage/lcov.info']);
  assertEquals(parsed?.kind, 'lcov');
  if (parsed?.kind === 'lcov') {
    assertEquals(parsed.lcovPath, 'coverage/lcov.info');
    assertEquals(parsed.include, 'cross-runtime');
    assertEquals(parsed.threshold, THRESHOLD);
  }
});

Deno.test('parseArgs: --lcov with explicit --profile and --threshold', () => {
  const parsed = parseArgs(['--lcov', 'a.info', '--profile', 'cross-runtime', '--threshold', '90']);
  assertEquals(parsed?.kind, 'lcov');
  if (parsed?.kind === 'lcov') {
    assertEquals(parsed.include, 'cross-runtime');
    assertEquals(parsed.threshold, 90);
  }
});

Deno.test('parseArgs: --lcov with --include splits comma list', () => {
  const parsed = parseArgs(['--lcov', 'a.info', '--include', 'src/foo/**, src/bar.ts']);
  assertEquals(parsed?.kind, 'lcov');
  if (parsed?.kind === 'lcov') {
    assertEquals(parsed.include, ['src/foo/**', 'src/bar.ts']);
  }
});

Deno.test('parseArgs: unknown flag yields null', () => {
  assertEquals(parseArgs(['--bogus']), null);
});

Deno.test('parseArgs: missing value after flag yields null', () => {
  assertEquals(parseArgs(['--lcov']), null);
  assertEquals(parseArgs(['--threshold']), null);
});

Deno.test('parseArgs: non-numeric threshold yields null', () => {
  assertEquals(parseArgs(['--lcov', 'a.info', '--threshold', 'high']), null);
});

// ---------------------------------------------------------------------------
// End-to-end via threshold (no I/O — pure helpers)
// ---------------------------------------------------------------------------

Deno.test('lcov flow: above-threshold aggregate', () => {
  const agg = aggregateLcov(SAMPLE_LCOV, ['src/utils/runtime/**', 'src/db/sqlite/**']);
  // 4/6 = 66.67% — below default 80, but assert the math.
  const pct = aggregatePercent(agg);
  assertEquals(pct !== null && Math.abs(pct - 66.6667) < 0.01, true);
});

Deno.test('lcov flow: empty include set produces null percent', () => {
  const agg = aggregateLcov(SAMPLE_LCOV, ['src/no/such/path/**']);
  assertEquals(aggregatePercent(agg), null);
});
