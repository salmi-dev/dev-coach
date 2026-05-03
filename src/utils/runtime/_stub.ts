/**
 * Internal — placeholder factory for not-yet-implemented runtime adapters.
 *
 * Used by `bun.ts` and `node.ts` until Track B Group 3 lands. Builds a frozen
 * {@link Runtime} whose every method (and getter accessor on its sub-objects)
 * throws a clear "not yet implemented" error. Importing the module itself is
 * always safe — only invoking methods throws.
 *
 * @module
 */

import type { RuntimeName } from './index.ts';

function makeError(name: RuntimeName): Error {
  return new Error(
    `Runtime adapter for "${name}" is not yet implemented. ` +
      `This will be added in Track B (Group 3) of the boost-jsr-score-and-runtime-compat change. ` +
      `Until then, run dev-coach on Deno.`,
  );
}

// deno-lint-ignore no-explicit-any
export function notYetImplemented(name: RuntimeName): any {
  const err = () => {
    throw makeError(name);
  };
  return Object.freeze({
    name,
    args: Object.freeze([]),
    env: { get: err, set: err },
    exit: err,
    cwd: err,
    homedir: err,
    osPlatform: err,
    consoleSize: err,
    stdin: { isTerminal: err },
    stdout: { isTerminal: err, write: err },
    readTextFile: err,
    writeTextFile: err,
    mkdir: err,
    stat: err,
    readDir: err,
    remove: err,
    runCommand: err,
  });
}
