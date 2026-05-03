/**
 * Direct `.run()` tests for prompt-template skills (ask, explain, compare, sandbox, review, stats)
 * plus pure helpers (parseSelection, parseLangSelection, formatSummaryTable, renderBar, etc.).
 *
 * These skills are deterministic — they build a structured Markdown response from the input —
 * so we can assert on the response shape without invoking any LLM.
 */

import { assert, assertEquals, assertStringIncludes } from '@std/assert';
import { Database } from '@db/sqlite';
import { runMigrations } from '../src/db/migrations.ts';
import { askSkill } from '../src/skills/ask.ts';
import { explainSkill } from '../src/skills/explain.ts';
import { compareSkill, parseComparisonInput } from '../src/skills/compare.ts';
import { sandboxSkill } from '../src/skills/sandbox.ts';
import { detectLanguageFromContent, detectLanguageFromExtension, reviewSkill } from '../src/skills/review.ts';
import { renderBar, renderLanguageBars, renderMonthlyDashboard, statsSkill } from '../src/skills/stats.ts';
import { ApproachCollector, formatSummaryTable, parseSelection } from '../src/skills/interactive.ts';
import { parseLangSelection } from '../src/skills/init.ts';
import { projectSkill } from '../src/skills/project.ts';
import type { SessionContext } from '../src/skills/base.ts';
import { search } from '../src/storage/search.ts';

function makeContext(libraryPath = '/tmp/never'): SessionContext {
  const db = new Database(':memory:');
  runMigrations(db);
  return {
    db,
    config: {
      library_path: libraryPath,
      primary_languages: ['typescript', 'rust'],
      frameworks: [],
      response_style: 'concise',
      os: 'linux',
    },
    libraryPath,
    searchLibrary: (filters) => search(db, filters),
  };
}

async function makeRealContext(): Promise<SessionContext> {
  const lib = await Deno.makeTempDir({ prefix: 'coach-skills-test-' });
  return makeContext(lib);
}

// ── ask skill ─────────────────────────────────────────────────

Deno.test('askSkill.run: returns response with detected lang', async () => {
  const res = await askSkill.run('how do I parse json in python', makeContext());
  assertEquals(res.suggestedType, 'tldr');
  assertEquals(res.lang, 'python');
  assertStringIncludes(res.response, 'coach:ask');
});

Deno.test('askSkill.run: no language detected for generic question', async () => {
  const res = await askSkill.run('what is a closure', makeContext());
  assertEquals(res.lang, undefined);
  assert(res.response.length > 0);
});

// ── explain skill ─────────────────────────────────────────────

Deno.test('explainSkill.run: produces structured 6-section template', async () => {
  const res = await explainSkill.run('event loop', makeContext());
  assertEquals(res.suggestedType, 'tldr');
  for (const section of ['One-liner', 'Core Concept', 'How It Works', 'Example', 'Gotchas', 'Related']) {
    assertStringIncludes(res.response, section);
  }
});

// ── compare skill ─────────────────────────────────────────────

Deno.test('parseComparisonInput: splits "X vs Y"', () => {
  const r = parseComparisonInput('redis vs memcached');
  assertEquals(r.items.length, 2);
  assert(r.items[0].toLowerCase().includes('redis'));
});

Deno.test('parseComparisonInput: handles "for caching" suffix as context', () => {
  const r = parseComparisonInput('redis vs memcached for caching');
  assert(r.items.length >= 2);
});

Deno.test('compareSkill.run: produces comparison template', async () => {
  const res = await compareSkill.run('rust vs go', makeContext());
  assertEquals(res.suggestedType, 'snippet');
  assertStringIncludes(res.response, 'Comparison Table');
  assertStringIncludes(res.response, 'Verdict');
});

// ── sandbox skill ─────────────────────────────────────────────

Deno.test('sandboxSkill.run: produces 3-approach template', async () => {
  const res = await sandboxSkill.run('parse json', makeContext());
  assertEquals(res.suggestedType, 'snippet');
  assertStringIncludes(res.response, 'Approach 1');
  assertStringIncludes(res.response, 'Approach 2');
  assertStringIncludes(res.response, 'Approach 3');
});

// ── review skill ──────────────────────────────────────────────

Deno.test('detectLanguageFromExtension: maps .ts to typescript', () => {
  assertEquals(detectLanguageFromExtension('foo.ts'), 'typescript');
  assertEquals(detectLanguageFromExtension('foo.rs'), 'rust');
  assertEquals(detectLanguageFromExtension('foo.unknown'), undefined);
});

Deno.test('detectLanguageFromContent: detects rust from fn keyword', () => {
  assertEquals(detectLanguageFromContent('fn main() { let mut x = 0; }'), 'rust');
});

Deno.test('detectLanguageFromContent: returns undefined on empty', () => {
  assertEquals(detectLanguageFromContent(''), undefined);
});

Deno.test('reviewSkill.run: produces review template (inline code)', async () => {
  const res = await reviewSkill.run('fn add(a: i32, b: i32) -> i32 { a + b }', makeContext());
  assertEquals(res.suggestedType, 'tldr');
  for (const section of ['Bugs', 'Style', 'Performance', 'Security', 'Architecture']) {
    assertStringIncludes(res.response, section);
  }
});

// ── stats skill ───────────────────────────────────────────────

Deno.test('renderBar: 0 ratio returns all empty blocks', () => {
  const bar = renderBar(0);
  assert(bar.length > 0);
  assertEquals(bar.includes('█'), false);
});

Deno.test('renderBar: full ratio returns all filled blocks', () => {
  const bar = renderBar(1);
  assertEquals(bar.includes('░'), false);
});

Deno.test('renderLanguageBars: clips to top 5', () => {
  const langs = Array.from({ length: 8 }, (_, i) => ({ lang: `l${i}`, count: 8 - i }));
  const out = renderLanguageBars(langs, 36);
  assertEquals(out.length, 5);
});

Deno.test('renderMonthlyDashboard: renders against empty DB', () => {
  const ctx = makeContext();
  const out = renderMonthlyDashboard(ctx.db);
  assert(out.length > 0);
});

Deno.test('statsSkill.run: default mode renders monthly dashboard', async () => {
  const ctx = await makeRealContext();
  const res = await statsSkill.run('', ctx);
  assert(res.response.length > 0);
});

Deno.test('statsSkill.run: weekly mode renders without error', async () => {
  const ctx = await makeRealContext();
  const res = await statsSkill.run('weekly', ctx);
  assert(res.response.length > 0);
});

Deno.test('statsSkill.run: lang sub-mode renders without error', async () => {
  const ctx = await makeRealContext();
  const res = await statsSkill.run('lang rust', ctx);
  assert(res.response.length > 0);
});

Deno.test('statsSkill.run: topics sub-mode renders without error', async () => {
  const ctx = await makeRealContext();
  const res = await statsSkill.run('topics', ctx);
  assert(res.response.length > 0);
});

// ── interactive helpers ───────────────────────────────────────

Deno.test('parseSelection: "all" returns full range', () => {
  assertEquals(parseSelection('all', 3), [1, 2, 3]);
});

Deno.test('parseSelection: "none" returns empty', () => {
  assertEquals(parseSelection('none', 3), []);
  assertEquals(parseSelection('', 3), []);
});

Deno.test('parseSelection: numeric list ignores out-of-range', () => {
  assertEquals(parseSelection('1, 3, 99', 3), [1, 3]);
});

Deno.test('formatSummaryTable: renders a markdown summary block', () => {
  const out = formatSummaryTable([
    { index: 1, title: 'A', content: 'first line', tags: [] },
    { index: 2, title: 'B', content: 'second line', tags: [] },
  ]);
  assertStringIncludes(out, '## Summary');
  assertStringIncludes(out, 'A');
  assertStringIncludes(out, 'B');
});

Deno.test('ApproachCollector: add increments count and assigns index', () => {
  const c = new ApproachCollector();
  c.add('first', 'body1', 'ts');
  c.add('second', 'body2');
  assertEquals(c.count, 2);
  assertEquals(c.approaches[0].index, 1);
  assertEquals(c.approaches[1].index, 2);
});

Deno.test('ApproachCollector.selectAndSave: empty collector returns empty array', async () => {
  const c = new ApproachCollector();
  const ctx = await makeRealContext();
  const saved = await c.selectAndSave(ctx.db, { source: 'test', libraryPath: ctx.libraryPath });
  assertEquals(saved, []);
});

Deno.test('ApproachCollector.selectAndSave: saves selected approaches with stubbed stdin', async () => {
  const c = new ApproachCollector();
  c.add('Alpha', 'first body', 'python', ['demo']);
  c.add('Beta', 'second body', 'python', ['demo']);

  const ctx = await makeRealContext();

  // Stub stdin to answer "all" → saves both.
  const origRead = Deno.stdin.readSync.bind(Deno.stdin);
  const origWrite = Deno.stdout.writeSync.bind(Deno.stdout);
  const encoder = new TextEncoder();
  const queue = encoder.encode('all\n');
  let pos = 0;
  // deno-lint-ignore no-explicit-any
  (Deno.stdin as any).readSync = (buf: Uint8Array): number | null => {
    if (pos >= queue.length) return null;
    const remaining = queue.length - pos;
    const n = Math.min(buf.length, remaining);
    buf.set(queue.subarray(pos, pos + n));
    pos += n;
    return n;
  };
  // deno-lint-ignore no-explicit-any
  (Deno.stdout as any).writeSync = (chunk: Uint8Array): number => chunk.length;

  try {
    const saved = await c.selectAndSave(ctx.db, { source: 'test', libraryPath: ctx.libraryPath });
    assertEquals(saved.length, 2);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno.stdin as any).readSync = origRead;
    // deno-lint-ignore no-explicit-any
    (Deno.stdout as any).writeSync = origWrite;
  }
});

// ── init helpers ──────────────────────────────────────────────

Deno.test('parseLangSelection: numbers map to common languages', () => {
  const out = parseLangSelection('1,2');
  assertEquals(out.length, 2);
});

Deno.test('parseLangSelection: non-numeric tokens kept as-is (lower-cased)', () => {
  const out = parseLangSelection('Rust, Elixir');
  assert(out.includes('rust'));
  assert(out.includes('elixir'));
});

Deno.test('parseLangSelection: out-of-range numbers ignored', () => {
  const out = parseLangSelection('999');
  assertEquals(out, []);
});

Deno.test('parseLangSelection: empty input returns empty array', () => {
  assertEquals(parseLangSelection(''), []);
});

// ── project skill ───────────────────────────────────────────────────────────────────

Deno.test('projectSkill.run: produces a plan response (non-interactive)', async () => {
  const ctx = await makeRealContext();
  // Non-interactive context (stdin not a TTY in tests) → skill produces the plan template only.
  const res = await projectSkill.run('cli todo app', ctx);
  assert(res.response.length > 0);
  // Plan response should mention the input topic somewhere.
  assertStringIncludes(res.response.toLowerCase(), 'todo');
});
