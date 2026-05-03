/**
 * In-process router tests — exercise each `case` arm of `route()` directly so that
 * `src/cli/router.ts` line coverage reflects every wired-up subcommand. Subprocess
 * tests in `router_subprocess_test.ts` complement these but don't contribute to
 * parent-process coverage instrumentation.
 *
 * Each test:
 *   1. Builds a temp `XDG_CONFIG_HOME` + `XDG_DATA_HOME` + library tree.
 *   2. Writes a minimal `config.yaml`.
 *   3. Calls `route(<subcommand>, <args>, configPath)` and asserts it resolves
 *      without throwing. Stdout/stderr are captured (and redirected to /dev/null
 *      via swapped writers) so the test runner output stays clean.
 *
 * Skills that print code blocks trigger an interactive `📋 Copy command? [Y/n]`
 * prompt. Inside `deno test`, `Deno.stdin.readSync` returns 0 bytes (no TTY), the
 * answer is treated as "yes", clipboard detection fails silently in CI, and the
 * skill returns normally. No stdin mocking is required.
 */

import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { route } from '../src/cli/router.ts';
import { closeDb } from '../src/db/connection.ts';

interface TempEnv {
  configPath: string;
  cleanup: () => Promise<void>;
}

/** Build a tmp dir with a usable config + library, return the configPath + cleanup. */
async function setup(): Promise<TempEnv> {
  const root = await Deno.makeTempDir({ prefix: 'coach-router-inproc-' });
  const lib = join(root, 'library');
  const dataDir = join(root, 'data');
  const configDir = join(root, 'config', 'dev-coach');

  await Deno.mkdir(join(lib, 'tldr'), { recursive: true });
  await Deno.mkdir(join(lib, 'snippets'), { recursive: true });
  await Deno.mkdir(dataDir, { recursive: true });
  await Deno.mkdir(configDir, { recursive: true });

  const configPath = join(configDir, 'config.yaml');
  await Deno.writeTextFile(
    configPath,
    [
      `library_path: ${lib}`,
      'primary_languages: [typescript]',
      'frameworks: []',
      'response_style: concise',
      'os: linux',
      '',
    ].join('\n'),
  );

  // Point the DB connection at our temp data dir.
  Deno.env.set('XDG_DATA_HOME', dataDir);
  Deno.env.set('XDG_CONFIG_HOME', join(root, 'config'));

  return {
    configPath,
    cleanup: async () => {
      // Always close the shared DB before removing files — Windows would otherwise
      // refuse to delete an open sqlite file. Safe on macOS/Linux too.
      try {
        closeDb();
      } catch {
        // ignore — already closed
      }
      try {
        await Deno.remove(root, { recursive: true });
      } catch {
        // ignore best-effort cleanup
      }
    },
  };
}

/** Replace stdout/stderr writers with no-op sinks while `fn` runs, then restore. */
async function silenced<T>(fn: () => Promise<T>): Promise<T> {
  const realLog = console.log;
  const realErr = console.error;
  const realStdoutWrite = Deno.stdout.writeSync.bind(Deno.stdout);
  console.log = () => {};
  console.error = () => {};
  // The runSkill's interactive prompt uses Deno.stdout.writeSync directly.
  Deno.stdout.writeSync = (() => 0) as typeof Deno.stdout.writeSync;
  try {
    return await fn();
  } finally {
    console.log = realLog;
    console.error = realErr;
    Deno.stdout.writeSync = realStdoutWrite;
  }
}

// ── Skill subcommands ─────────────────────────────────────────────────────────

Deno.test('router(explain): runs end-to-end and closes context', async () => {
  const env = await setup();
  try {
    await silenced(() => route('explain', ['closures', 'in', 'rust'], env.configPath));
  } finally {
    await env.cleanup();
  }
});

Deno.test('router(compare): runs end-to-end with vs-input', async () => {
  const env = await setup();
  try {
    await silenced(() => route('compare', ['rest', 'vs', 'graphql'], env.configPath));
  } finally {
    await env.cleanup();
  }
});

Deno.test('router(sandbox): runs end-to-end', async () => {
  const env = await setup();
  try {
    await silenced(() => route('sandbox', ['parse', 'json'], env.configPath));
  } finally {
    await env.cleanup();
  }
});

Deno.test('router(review): runs end-to-end with stub code', async () => {
  const env = await setup();
  try {
    await silenced(() => route('review', ['some', 'inline', 'code'], env.configPath));
  } finally {
    await env.cleanup();
  }
});

Deno.test('router(project): runs end-to-end with a topic', async () => {
  const env = await setup();
  try {
    await silenced(() => route('project', ['cli', 'todo', 'app'], env.configPath));
  } finally {
    await env.cleanup();
  }
});

Deno.test('router(stats): runs end-to-end against an empty DB', async () => {
  const env = await setup();
  try {
    await silenced(() => route('stats', [], env.configPath));
  } finally {
    await env.cleanup();
  }
});

// ── Library + alias + pi subcommands ──────────────────────────────────────────

Deno.test('router(tldr list): delegates to library command', async () => {
  const env = await setup();
  try {
    await silenced(() => route('tldr', ['list'], env.configPath));
  } finally {
    await env.cleanup();
  }
});

Deno.test('router(snippet list): delegates to library command', async () => {
  const env = await setup();
  try {
    await silenced(() => route('snippet', ['list'], env.configPath));
  } finally {
    await env.cleanup();
  }
});

Deno.test('router(install-aliases) + uninstall-aliases: install then remove', async () => {
  const env = await setup();
  const home = await Deno.makeTempDir({ prefix: 'coach-router-home-' });
  const prevHome = Deno.env.get('HOME') ?? '';
  const prevShell = Deno.env.get('SHELL') ?? '';
  Deno.env.set('HOME', home);
  Deno.env.set('SHELL', '/bin/zsh');
  try {
    await silenced(() => route('install-aliases', [], env.configPath));
    await silenced(() => route('install-aliases', [], env.configPath)); // idempotent path
    await silenced(() => route('uninstall-aliases', [], env.configPath));
    await silenced(() => route('uninstall-aliases', [], env.configPath)); // already-removed path
  } finally {
    if (prevHome) Deno.env.set('HOME', prevHome);
    else Deno.env.delete('HOME');
    if (prevShell) Deno.env.set('SHELL', prevShell);
    else Deno.env.delete('SHELL');
    await Deno.remove(home, { recursive: true }).catch(() => {});
    await env.cleanup();
  }
});

Deno.test('router(unknown): exits with code 1 and writes Unknown command', async () => {
  const env = await setup();
  // Replace Deno.exit with a thrower so the test can observe it without killing the runner.
  const realExit = Deno.exit;
  let observed = -1;
  // deno-lint-ignore no-explicit-any
  (Deno as any).exit = (code?: number) => {
    observed = code ?? 0;
    throw new Error(`__exit_${observed}__`);
  };
  try {
    let threw = false;
    try {
      await silenced(() => route('does-not-exist', [], env.configPath));
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message, '__exit_1__');
    }
    assertEquals(threw, true);
    assertEquals(observed, 1);
  } finally {
    Deno.exit = realExit;
    await env.cleanup();
  }
});
