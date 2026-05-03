/**
 * Library CLI handler — backs `coach tldr` and `coach snippet` subcommands.
 *
 * Supports actions: `list`, `show`, `search`, `edit`, `delete`, `path`. When invoked with no
 * arguments, opens an interactive picker. When the first argument is not a recognised action,
 * it is treated as a slug for an implicit `show`.
 */

import { parseArgs } from '@std/cli/parse-args';
import { Database } from '@db/sqlite';
import { deleteItem, type ItemType, listSlugs, resolveSlug, type SlugMatch } from '../storage/library.ts';
import { search } from '../storage/search.ts';
import { indexItem } from '../storage/sync.ts';
import { parseFrontmatter } from '../storage/frontmatter.ts';
import { regenerateDashboard } from '../storage/dashboard.ts';
import { pick } from '../utils/picker.ts';
import { isInteractive } from '../utils/platform.ts';
import { closeDb, getDb } from '../db/connection.ts';
import { loadConfig } from '../config/config.ts';
import { getLibraryPath } from '../utils/xdg.ts';

/** Recognised library actions. */
const ACTIONS = new Set(['list', 'show', 'search', 'edit', 'delete', 'path']);

/** Run the library CLI for a given item type. Always closes the DB on exit. */
export async function runLibraryCommand(type: ItemType, args: string[], configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  const libraryPath = getLibraryPath(config.library_path);
  const db = getDb();

  try {
    await dispatch(type, args, db, libraryPath);
  } finally {
    closeDb();
  }
}

/** Route to the appropriate action handler based on `args`. */
async function dispatch(type: ItemType, args: string[], db: Database, libraryPath: string): Promise<void> {
  // No args → picker → show
  if (args.length === 0) {
    await actionPicker(type, db, libraryPath);
    return;
  }

  const first = args[0];

  // Recognised action
  if (ACTIONS.has(first)) {
    const rest = args.slice(1);
    switch (first) {
      case 'list':
        return actionList(type, libraryPath);
      case 'show':
        return actionShow(type, rest, libraryPath);
      case 'search':
        return actionSearch(type, rest, db);
      case 'edit':
        return actionEdit(type, rest, db, libraryPath);
      case 'delete':
        return actionDelete(type, rest, db, libraryPath);
      case 'path':
        return actionPath(type, rest, libraryPath);
    }
  }

  // Implicit show — first arg treated as slug
  return actionShow(type, args, libraryPath);
}

// ── Actions ────────────────────────────────────────────────────

/** Open the interactive picker over all items of `type`, then show the chosen one. */
async function actionPicker(type: ItemType, _db: Database, libraryPath: string): Promise<void> {
  const all = await listSlugs(type, libraryPath);
  if (all.length === 0) {
    console.log(`No ${type}s saved yet`);
    return;
  }
  const { item } = await pick(all, formatSlugLabel, `Pick a ${type}`);
  if (!item) {
    console.log('Cancelled.');
    return;
  }
  await showFile(item.absolutePath);
}

/** Print every item of `type`, sorted by mtime descending. */
async function actionList(type: ItemType, libraryPath: string): Promise<void> {
  const all = await listSlugs(type, libraryPath);
  if (all.length === 0) {
    console.log(`No ${type}s saved yet`);
    return;
  }

  // Decorate with mtime + frontmatter title/tags.
  const decorated = await Promise.all(all.map(async (m) => {
    let mtime = 0;
    let title = m.slug;
    let tags: string[] = [];
    try {
      const stat = await Deno.stat(m.absolutePath);
      mtime = stat.mtime?.getTime() ?? 0;
      const raw = await Deno.readTextFile(m.absolutePath);
      const { metadata } = parseFrontmatter(raw);
      if (typeof metadata.title === 'string') title = metadata.title;
      if (Array.isArray(metadata.tags)) tags = metadata.tags as string[];
    } catch {
      // ignore
    }
    return { match: m, mtime, title, tags };
  }));

  decorated.sort((a, b) => b.mtime - a.mtime);

  for (const d of decorated) {
    const slugDisplay = d.match.lang ? `${d.match.lang}/${d.match.slug}` : d.match.slug;
    const tagStr = d.tags.length > 0 ? ` [${d.tags.join(', ')}]` : '';
    console.log(`${slugDisplay} — ${d.title}${tagStr}`);
  }
}

/** Resolve `slug` and print the file (paged through `$PAGER` when stdout is a TTY). */
async function actionShow(type: ItemType, args: string[], libraryPath: string): Promise<void> {
  if (args.length === 0) {
    console.error(`Usage: coach ${type} show <slug>`);
    Deno.exit(1);
  }
  const match = await resolveOrPick(type, args[0], libraryPath);
  if (!match) Deno.exit(1);
  await showFile(match.absolutePath);
}

/** Run a full-text search filtered by `type`. */
function actionSearch(type: ItemType, args: string[], db: Database): void {
  const query = args.join(' ').trim();
  if (!query) {
    console.error(`Usage: coach ${type} search <query>`);
    Deno.exit(1);
  }
  const results = search(db, { type, query });
  if (results.length === 0) {
    console.log('No matches.');
    return;
  }
  for (const r of results) {
    const tagStr = r.tags.length > 0 ? ` [${r.tags.join(', ')}]` : '';
    console.log(`${r.path} — ${r.title}${tagStr}`);
  }
}

/** Open the resolved file in `$EDITOR`; on success, re-index it. */
async function actionEdit(type: ItemType, args: string[], db: Database, libraryPath: string): Promise<void> {
  if (args.length === 0) {
    console.error(`Usage: coach ${type} edit <slug>`);
    Deno.exit(1);
  }
  const match = await resolveOrPick(type, args[0], libraryPath);
  if (!match) Deno.exit(1);

  const editor = Deno.env.get('VISUAL') || Deno.env.get('EDITOR') || 'vi';
  if (!editor) {
    console.error('No editor configured. Set $VISUAL or $EDITOR.');
    Deno.exit(1);
  }

  const proc = new Deno.Command(editor, {
    args: [match.absolutePath],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  }).spawn();
  const status = await proc.status;

  if (!status.success) {
    console.log('Edit cancelled, no changes indexed');
    Deno.exit(status.code ?? 1);
  }

  // Re-index the file from disk.
  try {
    const raw = await Deno.readTextFile(match.absolutePath);
    const { metadata } = parseFrontmatter(raw);
    indexItem(db, type, metadata, match.relativePath);
    await regenerateDashboard(db, libraryPath);
    console.log(`✅ Re-indexed ${match.relativePath}`);
  } catch (e) {
    console.error('Failed to re-index:', e instanceof Error ? e.message : String(e));
  }
}

/** Confirm and remove the resolved item from disk + index. */
async function actionDelete(type: ItemType, args: string[], db: Database, libraryPath: string): Promise<void> {
  const parsed = parseArgs(args, { boolean: ['yes'], alias: { y: 'yes' } });
  const slug = parsed._[0]?.toString();
  if (!slug) {
    console.error(`Usage: coach ${type} delete <slug> [--yes]`);
    Deno.exit(1);
  }

  const match = await resolveOrPick(type, slug, libraryPath);
  if (!match) Deno.exit(1);

  if (!parsed.yes) {
    if (!isInteractive()) {
      console.error('Refusing to delete without --yes in non-interactive mode');
      Deno.exit(1);
    }
    Deno.stdout.writeSync(new TextEncoder().encode(`Delete '${match.slug}'? [y/N] `));
    const buf = new Uint8Array(8);
    const n = Deno.stdin.readSync(buf) ?? 0;
    const answer = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();
    if (answer !== 'y') {
      console.log('Cancelled.');
      return;
    }
  }

  await deleteItem(db, match.relativePath, libraryPath);
  console.log(`🗑️  Deleted ${match.relativePath}`);
}

/** Print the absolute path of the resolved item. */
async function actionPath(type: ItemType, args: string[], libraryPath: string): Promise<void> {
  if (args.length === 0) {
    console.error(`Usage: coach ${type} path <slug>`);
    Deno.exit(1);
  }
  const match = await resolveOrPick(type, args[0], libraryPath);
  if (!match) Deno.exit(1);
  console.log(match.absolutePath);
}

// ── Helpers ────────────────────────────────────────────────────

/** Resolve a slug to a single match, prompting via picker when ambiguous. Returns `null` on no-match. */
async function resolveOrPick(type: ItemType, slug: string, libraryPath: string): Promise<SlugMatch | null> {
  const matches = await resolveSlug(type, slug, libraryPath);
  if (matches.length === 0) {
    console.error(`No ${type} matches '${slug}'. Try \`coach ${type} list\` or \`coach ${type} search <query>\`.`);
    return null;
  }
  if (matches.length === 1) return matches[0];

  const { item } = await pick(matches, formatSlugLabel, 'Multiple matches — pick one');
  return item;
}

/** Render a slug match for display in lists/pickers. */
function formatSlugLabel(m: SlugMatch): string {
  return m.lang ? `${m.lang}/${m.slug}` : m.slug;
}

/** Print `absPath` to stdout, paging through `$PAGER` only when stdout is a TTY. */
async function showFile(absPath: string): Promise<void> {
  const raw = await Deno.readTextFile(absPath);

  const stdoutTty = (() => {
    try {
      return Deno.stdout.isTerminal();
    } catch {
      return false;
    }
  })();

  if (!stdoutTty) {
    Deno.stdout.writeSync(new TextEncoder().encode(raw));
    if (!raw.endsWith('\n')) Deno.stdout.writeSync(new TextEncoder().encode('\n'));
    return;
  }

  const pagerEnv = Deno.env.get('PAGER');
  const [pagerCmd, ...pagerArgs] = pagerEnv && pagerEnv.trim().length > 0 ? pagerEnv.split(/\s+/) : ['less', '-R'];

  try {
    const proc = new Deno.Command(pagerCmd, {
      args: pagerArgs,
      stdin: 'piped',
      stdout: 'inherit',
      stderr: 'inherit',
    }).spawn();
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(raw));
    await writer.close();
    await proc.status;
  } catch {
    // Pager not found → fall back to direct write.
    Deno.stdout.writeSync(new TextEncoder().encode(raw));
  }
}
