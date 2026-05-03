/**
 * CLI subcommand routing.
 */

import { renderStubMessage } from '../utils/ascii.ts';

/** Current Dev Coach version (kept in sync with `deno.json`). */
export const VERSION = '0.1.0';

/** Subcommand descriptions for help text. */
export const SUBCOMMANDS: Record<string, string> = {
  init: 'Set up Dev Coach (first-run configuration)',
  ask: 'Quick question → quick answer',
  explain: 'Deep-dive explanation of a concept',
  compare: 'Compare two or more approaches',
  sandbox: 'Explore a topic with multiple examples',
  review: 'Code review with structured feedback',
  project: 'Build a mini-project step by step',
  stats: 'View your learning dashboard & stats',
  tldr: 'Manage TLDRs (list/show/search/edit/delete)',
  snippet: 'Manage snippets (list/show/search/edit/delete)',
  'install-aliases': 'Install shell aliases (c-tldr, c-snip)',
  'uninstall-aliases': 'Remove shell aliases',
  'install-pi': 'Install pi skills to current project',
  'uninstall-pi': 'Remove pi skills from current project',
};

const STUB_SKILLS: string[] = [];

/**
 * Route a subcommand to its handler.
 *
 * @param subcommand The first positional CLI argument (e.g. `ask`, `tldr`).
 * @param args Remaining arguments to pass to the handler.
 * @param configPath Optional override for the config file path.
 */
export async function route(
  subcommand: string,
  args: string[],
  configPath?: string,
): Promise<void> {
  // Stub skills (not yet implemented)
  if (STUB_SKILLS.includes(subcommand)) {
    console.log(renderStubMessage(subcommand));
    return;
  }

  // Real commands
  switch (subcommand) {
    case 'init': {
      const { runInit } = await import('../skills/init.ts');
      await runInit(args, configPath);
      break;
    }
    case 'ask': {
      const { createContext, runSkill, destroyContext } = await import('../skills/base.ts');
      const { askSkill } = await import('../skills/ask.ts');
      const ctx = await createContext(configPath);
      try {
        await runSkill(askSkill, args.join(' '), ctx);
      } finally {
        destroyContext();
      }
      break;
    }
    case 'explain': {
      const { createContext, runSkill, destroyContext } = await import('../skills/base.ts');
      const { explainSkill } = await import('../skills/explain.ts');
      const ctx = await createContext(configPath);
      try {
        await runSkill(explainSkill, args.join(' '), ctx);
      } finally {
        destroyContext();
      }
      break;
    }
    case 'compare': {
      const { createContext, runSkill, destroyContext } = await import('../skills/base.ts');
      const { compareSkill } = await import('../skills/compare.ts');
      const ctx = await createContext(configPath);
      try {
        await runSkill(compareSkill, args.join(' '), ctx);
      } finally {
        destroyContext();
      }
      break;
    }
    case 'sandbox': {
      const { createContext, runSkill, destroyContext } = await import('../skills/base.ts');
      const { sandboxSkill } = await import('../skills/sandbox.ts');
      const ctx = await createContext(configPath);
      try {
        await runSkill(sandboxSkill, args.join(' '), ctx);
      } finally {
        destroyContext();
      }
      break;
    }
    case 'review': {
      const { createContext, runSkill, destroyContext } = await import('../skills/base.ts');
      const { reviewSkill } = await import('../skills/review.ts');
      const ctx = await createContext(configPath);
      try {
        await runSkill(reviewSkill, args.join(' '), ctx);
      } finally {
        destroyContext();
      }
      break;
    }
    case 'project': {
      const { createContext, runSkill, destroyContext } = await import('../skills/base.ts');
      const { projectSkill } = await import('../skills/project.ts');
      const ctx = await createContext(configPath);
      try {
        await runSkill(projectSkill, args.join(' '), ctx);
      } finally {
        destroyContext();
      }
      break;
    }
    case 'stats': {
      const { createContext, runSkill, destroyContext } = await import('../skills/base.ts');
      const { statsSkill } = await import('../skills/stats.ts');
      const ctx = await createContext(configPath);
      try {
        await runSkill(statsSkill, args.join(' '), ctx);
      } finally {
        destroyContext();
      }
      break;
    }
    case 'tldr': {
      const { runLibraryCommand } = await import('./library.ts');
      await runLibraryCommand('tldr', args, configPath);
      break;
    }
    case 'snippet': {
      const { runLibraryCommand } = await import('./library.ts');
      await runLibraryCommand('snippet', args, configPath);
      break;
    }
    case 'install-aliases': {
      const { installAliases, printSourceHint } = await import('../utils/shell-aliases.ts');
      const res = await installAliases();
      if (res.changed) {
        console.log(`✅ Installed dev-coach aliases in ${res.rcPath} (${res.shell})`);
        printSourceHint(res.rcPath);
      } else {
        console.log(`ℹ️  dev-coach aliases already up to date in ${res.rcPath}`);
      }
      break;
    }
    case 'uninstall-aliases': {
      const { uninstallAliases } = await import('../utils/shell-aliases.ts');
      const res = await uninstallAliases();
      if (res.changed) {
        console.log(`✅ Removed dev-coach aliases from ${res.rcPath}`);
      } else {
        console.log('No dev-coach aliases found');
      }
      break;
    }
    case 'install-pi': {
      const { runInstallPi } = await import('../skills/install-pi.ts');
      await runInstallPi(args);
      break;
    }
    case 'uninstall-pi': {
      const { runUninstallPi } = await import('../skills/install-pi.ts');
      await runUninstallPi(args);
      break;
    }
    default:
      console.error(`Unknown command: ${subcommand}`);
      console.error(`Run 'coach --help' to see available commands.`);
      Deno.exit(1);
  }
}
