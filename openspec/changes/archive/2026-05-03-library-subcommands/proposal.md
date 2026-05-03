## Why

Snippets and TLDRs are saved into `~/dev-coach/{snippets,tldr}/` but there is no first-class CLI to list, view, search, edit, or delete them. Users must
`cat`/`ls` the filesystem manually. We need ergonomic subcommands plus quick-access aliases (`c-tldr`, `c-snip`) so saved knowledge becomes browsable and
reusable from the terminal.

## What Changes

- Add `coach tldr` and `coach snippet` subcommands with actions: `list`, `show <slug>`, `search <query>`, `edit <slug>`, `delete <slug>`, `path <slug>` (print
  absolute path), and a default action when no action given (interactive picker → show).
- Add `c-tldr` and `c-snip` shell aliases that proxy to `coach tldr` and `coach snippet` for quick access.
- Aliases install/uninstall integrated with `coach init` (and a new `coach install-aliases` / `coach uninstall-aliases` pair) — appends to the user's shell rc
  with idempotent markers.
- Update `SUBCOMMANDS` registry and help text in `cli.ts` / `src/cli/router.ts`.
- Reuse existing `listItems`, `readItem`, `deleteItem` from `src/storage/library.ts`; add a thin `searchItems` wrapper over `src/storage/search.ts` scoped by
  type.
- Tab-friendly slug arguments with fuzzy fallback (if multiple slugs match, show picker).

## Capabilities

### New Capabilities

- `library-cli`: `coach tldr` and `coach snippet` subcommands for listing, showing, searching, editing, deleting library items, plus the picker UX.
- `shell-aliases`: install/uninstall short-form shell aliases (`c-tldr`, `c-snip`, and optionally one per skill in the future) into the user's shell rc, with
  idempotent markers.

### Modified Capabilities

- `cli-router`: register the two new top-level subcommands and route them to the library-cli handlers.
- `coach-init`: optionally offer to install shell aliases during first-run setup.

## Impact

- Code: new `src/skills/library/` (or `src/cli/library.ts`) handler, new `src/utils/shell-aliases.ts`, edits to `src/cli/router.ts`, `cli.ts`,
  `src/skills/init.ts`.
- Specs: new `library-cli` and `shell-aliases` specs; deltas to `cli-router` and `coach-init`.
- User-facing: two new commands, two new shell aliases (opt-in), extended `coach init` flow.
- No DB migrations. No breaking changes.
