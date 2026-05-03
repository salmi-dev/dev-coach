/**
 * Subprocess-style tests for `coach` CLI router covering library + alias subcommands.
 *
 * Each test spawns `deno run cli.ts <subcommand>` with isolated `XDG_*`/`HOME` env vars so
 * the user's real config and shell rc are never touched.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import { join } from '@std/path';

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run `coach <args>` in a subprocess with controlled env; returns code/stdout/stderr. */
async function runCoach(args: string[], env: Record<string, string>): Promise<RunResult> {
  // Inherit the parent env (PATH, DENO_DIR, ffi caches, etc.) and apply test overrides on top.
  const inherited: Record<string, string> = { ...Deno.env.toObject(), ...env };
  const cmd = new Deno.Command('deno', {
    args: [
      'run',
      '--allow-read',
      '--allow-write',
      '--allow-env',
      '--allow-run',
      '--allow-ffi',
      '--allow-net',
      'cli.ts',
      ...args,
    ],
    env: inherited,
    stdout: 'piped',
    stderr: 'piped',
    stdin: 'null',
  });
  const out = await cmd.output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
}

/** Build a temp library + config for an isolated coach invocation. */
async function setupTempEnv(): Promise<{ env: Record<string, string>; lib: string; cleanup: () => Promise<void> }> {
  const root = await Deno.makeTempDir({ prefix: 'coach-router-test-' });
  const home = join(root, 'home');
  const lib = join(root, 'library');
  const configDir = join(root, 'config');
  const dataDir = join(root, 'data');

  await Deno.mkdir(home, { recursive: true });
  await Deno.mkdir(join(lib, 'tldr'), { recursive: true });
  await Deno.mkdir(join(lib, 'snippets', 'python'), { recursive: true });
  await Deno.mkdir(join(configDir, 'dev-coach'), { recursive: true });
  await Deno.mkdir(dataDir, { recursive: true });

  // Seed one TLDR.
  await Deno.writeTextFile(
    join(lib, 'tldr', 'sample.md'),
    `---\ntitle: Sample\ntags: [demo]\n---\nbody\n`,
  );

  // Write config pointing at temp library.
  await Deno.writeTextFile(
    join(configDir, 'dev-coach', 'config.yaml'),
    `library_path: ${lib}\nprimary_languages: [python]\nframeworks: []\nresponse_style: concise\nos: linux\n`,
  );

  return {
    env: {
      HOME: home,
      XDG_CONFIG_HOME: configDir,
      XDG_DATA_HOME: dataDir,
      // Force zsh so install-aliases targets ~/.zshrc inside the temp HOME.
      SHELL: '/bin/zsh',
    },
    lib,
    cleanup: async () => {
      try {
        await Deno.remove(root, { recursive: true });
      } catch {
        // ignore
      }
    },
  };
}

Deno.test('router: coach tldr list prints seeded TLDR', async () => {
  const { env, cleanup } = await setupTempEnv();
  try {
    const res = await runCoach(['tldr', 'list'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
    assertStringIncludes(res.stdout, 'sample');
  } finally {
    await cleanup();
  }
});

Deno.test('router: coach snippet list with empty snippets prints friendly message', async () => {
  const { env, cleanup } = await setupTempEnv();
  try {
    const res = await runCoach(['snippet', 'list'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
    assertStringIncludes(res.stdout, 'No snippets saved yet');
  } finally {
    await cleanup();
  }
});

Deno.test('router: install-aliases creates ~/.zshrc block in temp HOME', async () => {
  const { env, cleanup } = await setupTempEnv();
  try {
    const res = await runCoach(['install-aliases'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
    assertStringIncludes(res.stdout, 'Installed dev-coach aliases');

    const rc = await Deno.readTextFile(join(env.HOME, '.zshrc'));
    assertStringIncludes(rc, 'dev-coach aliases');
    assertStringIncludes(rc, "alias c-tldr='coach tldr'");
  } finally {
    await cleanup();
  }
});

Deno.test('router: uninstall-aliases removes the block', async () => {
  const { env, cleanup } = await setupTempEnv();
  try {
    await runCoach(['install-aliases'], env);
    const res = await runCoach(['uninstall-aliases'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
    assertStringIncludes(res.stdout, 'Removed');

    const rc = await Deno.readTextFile(join(env.HOME, '.zshrc'));
    assertEquals(rc.includes('dev-coach aliases'), false);
  } finally {
    await cleanup();
  }
});

Deno.test('router: uninstall-aliases on absent block prints friendly message', async () => {
  const { env, cleanup } = await setupTempEnv();
  try {
    const res = await runCoach(['uninstall-aliases'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
    assertStringIncludes(res.stdout, 'No dev-coach aliases found');
  } finally {
    await cleanup();
  }
});

Deno.test('router: unknown command exits non-zero with error', async () => {
  const { env, cleanup } = await setupTempEnv();
  try {
    const res = await runCoach(['no-such-cmd'], env);
    assertEquals(res.code, 1);
    assertStringIncludes(res.stderr, 'Unknown command');
  } finally {
    await cleanup();
  }
});
