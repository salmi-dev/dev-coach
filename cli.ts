#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-ffi

/**
 * Dev Coach CLI — AI-powered coding coach
 * Entry point for the `coach` command.
 */

import { parseArgs } from '@std/cli/parse-args';
import { SUBCOMMANDS, VERSION } from './src/cli/router.ts';
import { setColorEnabled } from './src/utils/colors.ts';

// Pre-scan for --no-color anywhere on the command line, then strip it so
// it doesn't reach skill handlers as a positional/string argument.
const rawArgs = Deno.args.filter((a) => a !== '--no-color');
if (rawArgs.length !== Deno.args.length) setColorEnabled(false);

const args = parseArgs(rawArgs, {
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
        --no-color   Disable ANSI color output (also honors NO_COLOR env)
`);
  Deno.exit(0);
}

const { route } = await import('./src/cli/router.ts');
await route(subcommand, subArgs, args.config);
