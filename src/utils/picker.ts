/**
 * Interactive selection picker.
 *
 * Prefers `fzf` when available on `$PATH` for fuzzy-matching UX; otherwise falls back to a
 * minimal numeric picker that prints a numbered list and reads a line from stdin.
 */

/** Result of presenting a picker to the user. */
export interface PickResult<T> {
  /** Selected item, or `null` if the user aborted (empty input, EOF, Ctrl-C). */
  item: T | null;
  /** Index of the selected item in the original `items` array, or `-1` when aborted. */
  index: number;
}

/** Tool detection cache so multiple picker calls don't repeatedly probe the filesystem. */
let fzfChecked = false;
let fzfAvailable = false;

/**
 * Force the cached `hasFzf` result. Test-only seam used to deterministically pin the picker
 * to the numeric path regardless of whether `fzf` is installed.
 *
 * @param available `true` to pretend fzf exists; `false` to force the numeric fallback.
 */
export function __setFzfAvailableForTesting(available: boolean): void {
  fzfChecked = true;
  fzfAvailable = available;
}

/**
 * Whether `fzf` is available on `$PATH`. Probed once and cached.
 *
 * @returns `true` if `fzf --version` runs successfully.
 */
export async function hasFzf(): Promise<boolean> {
  if (fzfChecked) return fzfAvailable;
  fzfChecked = true;
  try {
    const { success } = await new Deno.Command('fzf', { args: ['--version'], stdout: 'null', stderr: 'null' }).output();
    fzfAvailable = success;
  } catch {
    fzfAvailable = false;
  }
  return fzfAvailable;
}

/**
 * Present `items` to the user as a selection prompt and return the chosen item.
 *
 * Uses `fzf` when available, otherwise prints a numbered list and reads a number from stdin.
 * The `label` callback formats each item for display.
 *
 * @param items List of selectable items.
 * @param label Function returning the human-readable label for an item.
 * @param prompt Optional prompt string shown to the user (numeric mode only).
 * @returns The picked item with its index, or `{ item: null, index: -1 }` on abort.
 *
 * @example
 * ```ts
 * const { item } = await pick(['a', 'b', 'c'], (s) => s, 'Pick one');
 * if (item) console.log(`You picked ${item}`);
 * ```
 */
export async function pick<T>(items: T[], label: (item: T) => string, prompt = 'Select an item'): Promise<PickResult<T>> {
  if (items.length === 0) return { item: null, index: -1 };
  if (items.length === 1) return { item: items[0], index: 0 };

  if (await hasFzf()) {
    return pickWithFzf(items, label);
  }
  return pickNumeric(items, label, prompt);
}

/** Pipe labels to `fzf` and resolve the user's selection. */
async function pickWithFzf<T>(items: T[], label: (item: T) => string): Promise<PickResult<T>> {
  const labels = items.map(label);
  const proc = new Deno.Command('fzf', {
    args: ['--height=40%', '--reverse', '--prompt=› '],
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'inherit',
  }).spawn();

  const writer = proc.stdin.getWriter();
  await writer.write(new TextEncoder().encode(labels.join('\n') + '\n'));
  await writer.close();

  const { stdout, success } = await proc.output();
  if (!success) return { item: null, index: -1 };

  const chosen = new TextDecoder().decode(stdout).trim();
  const index = labels.indexOf(chosen);
  if (index < 0) return { item: null, index: -1 };
  return { item: items[index], index };
}

/** Print a numbered list and read a number from stdin. */
function pickNumeric<T>(items: T[], label: (item: T) => string, prompt: string): PickResult<T> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  for (let i = 0; i < items.length; i++) {
    Deno.stdout.writeSync(encoder.encode(`  ${String(i + 1).padStart(3)}. ${label(items[i])}\n`));
  }
  Deno.stdout.writeSync(encoder.encode(`\n${prompt} [1-${items.length}]: `));

  const buf = new Uint8Array(64);
  let n: number | null = 0;
  try {
    n = Deno.stdin.readSync(buf);
  } catch {
    return { item: null, index: -1 };
  }
  if (!n) return { item: null, index: -1 };

  const raw = decoder.decode(buf.subarray(0, n)).trim();
  if (!raw) return { item: null, index: -1 };
  const idx = parseInt(raw, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= items.length) return { item: null, index: -1 };
  return { item: items[idx], index: idx };
}
