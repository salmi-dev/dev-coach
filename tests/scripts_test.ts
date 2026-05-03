/**
 * Smoke tests for `scripts/test-bun.sh` and `scripts/test-node.sh`.
 *
 * These tests exercise the canonical local recipes end-to-end via
 * `Deno.Command`. They are gated on the corresponding runtime being
 * available on PATH; otherwise they're skipped (e.g. CI Deno test job
 * doesn't install Bun, and old Node versions don't support
 * --experimental-strip-types).
 *
 * Placed at `tests/scripts_test.ts` (not `tests/cross-runtime/`) so the
 * Bun and Node CI jobs do NOT run these tests — that would be infinite
 * recursion: the script invokes those very runtimes.
 *
 * @module
 */

import { assertEquals } from '@std/assert';

async function which(cmd: string): Promise<string | null> {
  try {
    const r = await new Deno.Command('which', { args: [cmd], stdout: 'piped', stderr: 'null' }).output();
    if (r.code !== 0) return null;
    return new TextDecoder().decode(r.stdout).trim() || null;
  } catch {
    return null;
  }
}

async function nodeMajor(): Promise<number | null> {
  const r = await new Deno.Command('node', { args: ['-p', 'process.versions.node.split(".")[0]'], stdout: 'piped', stderr: 'null' }).output();
  if (r.code !== 0) return null;
  const major = Number(new TextDecoder().decode(r.stdout).trim());
  return Number.isFinite(major) ? major : null;
}

async function runScript(path: string): Promise<{ code: number; stdout: string; stderr: string }> {
  const r = await new Deno.Command('bash', {
    args: [path],
    stdout: 'piped',
    stderr: 'piped',
  }).output();
  return {
    code: r.code,
    stdout: new TextDecoder().decode(r.stdout),
    stderr: new TextDecoder().decode(r.stderr),
  };
}

const hasBun = (await which('bun')) !== null;
const hasNode = (await which('node')) !== null;
const major = hasNode ? await nodeMajor() : null;
const nodeOk = hasNode && major !== null && major >= 22;

Deno.test({
  name: 'scripts/test-bun.sh runs to green and prints the coverage line',
  ignore: !hasBun,
  fn: async () => {
    const r = await runScript('scripts/test-bun.sh');
    if (r.code !== 0) {
      throw new Error(`script failed (code ${r.code}):\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);
    }
    // The check-coverage.ts success line should appear at the end of stdout.
    if (!/✅ Coverage \d/.test(r.stdout)) {
      throw new Error(`expected coverage success line in stdout; got:\n${r.stdout.slice(-500)}`);
    }
  },
});

Deno.test({
  name: 'scripts/test-node.sh runs to green and prints the coverage line',
  ignore: !nodeOk,
  fn: async () => {
    const r = await runScript('scripts/test-node.sh');
    if (r.code !== 0) {
      throw new Error(`script failed (code ${r.code}):\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);
    }
    if (!/✅ Coverage \d/.test(r.stdout)) {
      throw new Error(`expected coverage success line in stdout; got:\n${r.stdout.slice(-500)}`);
    }
  },
});

Deno.test('scripts/test-bun.sh and scripts/test-node.sh are executable', async () => {
  for (const p of ['scripts/test-bun.sh', 'scripts/test-node.sh']) {
    const info = await Deno.stat(p);
    if (!info.isFile) throw new Error(`${p} is not a regular file`);
    // Mode bits aren't reliably exposed cross-platform; check that bash
    // refuses to run it as the canary (exit code 0 means OK to dispatch).
    const r = await new Deno.Command('test', { args: ['-x', p] }).output();
    assertEquals(r.code, 0, `${p} is not executable`);
  }
});
