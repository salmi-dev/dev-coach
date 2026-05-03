#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-ffi

/**
 * Dev Coach CLI — AI-powered coding coach
 * Entry point for the `coach` command.
 */

import { parseArgs } from '@std/cli/parse-args';
import { SUBCOMMANDS, VERSION } from './src/cli/router.ts';

const args = parseArgs(Deno.args, {
  boolean: ['help', 'version'],
  string: ['config'],
  alias: { h: 'help', v: 'version', c: 'config' },
  stopEarly: true,
});

if (args.version) {
  console.log(`dev-coach v${VERSION}`);
  Deno.exit(0);
}

const subcommand = args._[0]?.toString();
const subArgs = args._.slice(1).map(String);

if (args.help || !subcommand) {
  console.log(`
  🎓 Dev Coach v${VERSION}
  AI-powered coding coach

  USAGE:
    coach <command> [options]

  COMMANDS:
${Object.entries(SUBCOMMANDS).map(([cmd, desc]) => `    ${cmd.padEnd(12)} ${desc}`).join('\n')}

  OPTIONS:
    -h, --help       Show this help message
    -v, --version    Show version
    -c, --config     Override config file path
`);
  Deno.exit(0);
}

const { route } = await import('./src/cli/router.ts');
await route(subcommand, subArgs, args.config);
