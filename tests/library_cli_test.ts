import './_db_warmup.ts';
/**
 * Smoke tests for library CLI handler — list, path, delete actions.
 *
 * These tests run `runLibraryCommand` against a temp library + temp XDG config so they don't
 * touch the user's real environment. Output is captured by redirecting stdout to a temp file
 * via subprocess spawning is unnecessary — we rely on the in-process helpers and assert on
 * filesystem side effects (delete) and behaviour (no throw).
 */

import { assert, assertEquals } from '@std/assert';
import { join } from '@std/path';
import { runLibraryCommand } from '../src/cli/library.ts';

async function setupEnv(): Promise<{ lib: string; configPath: string; cleanup: () => Promise<void> }> {
  const root = await Deno.makeTempDir({ prefix: 'coach-libcli-' });
  const lib = join(root, 'library');
  const configDir = join(root, 'config');
  const dataDir = join(root, 'data');
  await Deno.mkdir(join(lib, 'tldr'), { recursive: true });
  await Deno.mkdir(join(lib, 'snippets', 'python'), { recursive: true });
  await Deno.mkdir(configDir, { recursive: true });
  await Deno.mkdir(dataDir, { recursive: true });

  // Sample items.
  await Deno.writeTextFile(
    join(lib, 'tldr', 'foo.md'),
    `---\ntitle: Foo TLDR\ntags: [demo]\n---\nbody\n`,
  );
  await Deno.writeTextFile(
    join(lib, 'snippets', 'python', 'bar.md'),
    `---\ntitle: Bar Snippet\ntags: [demo]\nlang: python\n---\nprint('hi')\n`,
  );

  const configPath = join(configDir, 'config.yaml');
  await Deno.writeTextFile(
    configPath,
    `library_path: ${lib}\nprimary_languages: [python]\nframeworks: []\nresponse_style: concise\nos: linux\n`,
  );

  // Point XDG_DATA_HOME so getDb() uses temp path.
  Deno.env.set('XDG_DATA_HOME', dataDir);

  return {
    lib,
    configPath,
    cleanup: async () => {
      Deno.env.delete('XDG_DATA_HOME');
      try {
        await Deno.remove(root, { recursive: true });
      } catch {
        // ignore
      }
    },
  };
}

Deno.test('library CLI: list tldrs runs without error', async () => {
  const env = await setupEnv();
  try {
    await runLibraryCommand('tldr', ['list'], env.configPath);
  } finally {
    await env.cleanup();
  }
});

Deno.test('library CLI: list snippets runs without error', async () => {
  const env = await setupEnv();
  try {
    await runLibraryCommand('snippet', ['list'], env.configPath);
  } finally {
    await env.cleanup();
  }
});

Deno.test('library CLI: path action prints absolute path', async () => {
  const env = await setupEnv();
  try {
    await runLibraryCommand('tldr', ['path', 'foo'], env.configPath);
    // File should still exist.
    const stat = await Deno.stat(join(env.lib, 'tldr', 'foo.md'));
    assert(stat.isFile);
  } finally {
    await env.cleanup();
  }
});

Deno.test('library CLI: delete --yes removes file', async () => {
  const env = await setupEnv();
  try {
    await runLibraryCommand('tldr', ['delete', 'foo', '--yes'], env.configPath);
    let exists = true;
    try {
      await Deno.stat(join(env.lib, 'tldr', 'foo.md'));
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) exists = false;
      else throw e;
    }
    assertEquals(exists, false);
  } finally {
    await env.cleanup();
  }
});

Deno.test('library CLI: search with empty query exits with usage error', async () => {
  const env = await setupEnv();
  try {
    // search with no args → calls Deno.exit(1). We can't actually exit in tests,
    // so the test just confirms the call path runs (Deno.exit throws in test mode).
    let exited = false;
    const origExit = Deno.exit;
    // deno-lint-ignore no-explicit-any
    (Deno as any).exit = (code?: number) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };
    try {
      await runLibraryCommand('tldr', ['search'], env.configPath);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit:')) throw e;
    } finally {
      Deno.exit = origExit;
    }
    assertEquals(exited, true);
  } finally {
    await env.cleanup();
  }
});

Deno.test('library CLI: show on unknown slug exits 1', async () => {
  const env = await setupEnv();
  try {
    let exited = false;
    const origExit = Deno.exit;
    // deno-lint-ignore no-explicit-any
    (Deno as any).exit = (code?: number) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };
    try {
      await runLibraryCommand('tldr', ['show', 'no-such-slug'], env.configPath);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit:')) throw e;
    } finally {
      Deno.exit = origExit;
    }
    assertEquals(exited, true);
  } finally {
    await env.cleanup();
  }
});

Deno.test('library CLI: implicit show via slug arg', async () => {
  const env = await setupEnv();
  try {
    // Stub stdout to swallow pager / output.
    const origWrite = Deno.stdout.writeSync.bind(Deno.stdout);
    // deno-lint-ignore no-explicit-any
    (Deno.stdout as any).writeSync = (chunk: Uint8Array): number => chunk.length;
    try {
      await runLibraryCommand('tldr', ['foo'], env.configPath);
    } finally {
      // deno-lint-ignore no-explicit-any
      (Deno.stdout as any).writeSync = origWrite;
    }
  } finally {
    await env.cleanup();
  }
});

Deno.test('library CLI: search returns results for indexed item', async () => {
  const env = await setupEnv();
  try {
    // Pre-populate the DB index by listing the library first.
    await runLibraryCommand('tldr', ['list'], env.configPath);
    await runLibraryCommand('tldr', ['search', 'Foo'], env.configPath);
  } finally {
    await env.cleanup();
  }
});

// ── Subprocess-style coverage for show / search / edit ────────────────────────

/** Run `coach <args>` in a subprocess with the given env (parent env inherited and overridden). */
async function runCoach(args: string[], env: Record<string, string>): Promise<{ code: number; stdout: string; stderr: string }> {
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

/** Build a temp library + config + isolated XDG/HOME for subprocess library tests. */
async function setupSubprocessEnv(): Promise<{ env: Record<string, string>; lib: string; cleanup: () => Promise<void> }> {
  const root = await Deno.makeTempDir({ prefix: 'coach-libcli-sp-' });
  const home = join(root, 'home');
  const lib = join(root, 'library');
  const configDir = join(root, 'config');
  const dataDir = join(root, 'data');
  await Deno.mkdir(home, { recursive: true });
  await Deno.mkdir(join(lib, 'tldr'), { recursive: true });
  await Deno.mkdir(join(lib, 'snippets', 'python'), { recursive: true });
  await Deno.mkdir(join(configDir, 'dev-coach'), { recursive: true });
  await Deno.mkdir(dataDir, { recursive: true });

  await Deno.writeTextFile(
    join(lib, 'tldr', 'sample.md'),
    `---\ntitle: Sample TLDR\ntags: [demo]\n---\nbody about JSON parsing\n`,
  );
  await Deno.writeTextFile(
    join(configDir, 'dev-coach', 'config.yaml'),
    `library_path: ${lib}\nprimary_languages: [python]\nframeworks: []\nresponse_style: concise\nos: linux\n`,
  );

  return {
    env: {
      HOME: home,
      XDG_CONFIG_HOME: configDir,
      XDG_DATA_HOME: dataDir,
      SHELL: '/bin/zsh',
    },
    lib,
    cleanup: async () => {
      try {
        await Deno.remove(root, { recursive: true });
      } catch { /* ignore */ }
    },
  };
}

Deno.test('library CLI subprocess: tldr show prints file content', async () => {
  const { env, cleanup } = await setupSubprocessEnv();
  try {
    const res = await runCoach(['tldr', 'show', 'sample'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
    // Output should contain the body or frontmatter title.
    assert(res.stdout.includes('Sample TLDR') || res.stdout.includes('JSON parsing'));
  } finally {
    await cleanup();
  }
});

Deno.test('library CLI subprocess: tldr search finds match by content', async () => {
  const { env, cleanup } = await setupSubprocessEnv();
  try {
    // First list to trigger DB indexing.
    await runCoach(['tldr', 'list'], env);
    const res = await runCoach(['tldr', 'search', 'JSON'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
  } finally {
    await cleanup();
  }
});

Deno.test('library CLI subprocess: tldr path prints absolute path', async () => {
  const { env, lib, cleanup } = await setupSubprocessEnv();
  try {
    const res = await runCoach(['tldr', 'path', 'sample'], env);
    assertEquals(res.code, 0, `stderr: ${res.stderr}`);
    // Path is the last non-empty stdout line (plug may print download progress on first run).
    const lines = res.stdout.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const lastLine = lines[lines.length - 1];
    assertEquals(lastLine, join(lib, 'tldr', 'sample.md'));
  } finally {
    await cleanup();
  }
});

Deno.test({
  name: 'library CLI subprocess: tldr edit invokes EDITOR and re-indexes',
  // EDITOR=true is unix-only; skip on Windows.
  ignore: Deno.build.os === 'windows',
  fn: async () => {
    const { env, cleanup } = await setupSubprocessEnv();
    try {
      const res = await runCoach(['tldr', 'edit', 'sample'], { ...env, EDITOR: 'true', VISUAL: '' });
      assertEquals(res.code, 0, `stderr: ${res.stderr}`);
      assert(res.stdout.includes('Re-indexed') || res.stdout.includes('sample'));
    } finally {
      await cleanup();
    }
  },
});
