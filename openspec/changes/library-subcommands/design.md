## Context

Dev Coach already saves TLDRs and snippets to `~/dev-coach/{tldr,snippets/<lang>}/` via `src/storage/library.ts` (`saveItem`, `listItems`, `readItem`,
`deleteItem`) and indexes them in SQLite via `src/storage/sync.ts` and `src/storage/search.ts`. Skills (`ask`, `explain`, `compare`, `sandbox`, `review`,
`project`) all already produce items through `savePrompt`.

What's missing is a user-facing CLI surface to retrieve and manage those items. Today users would need to `cat ~/dev-coach/tldr/foo.md` manually. The CLI router
lives in `src/cli/router.ts` with a flat `SUBCOMMANDS` registry consumed by `cli.ts`. `coach init` (`src/skills/init.ts`) handles first-run setup and is the
natural place to optionally wire shell aliases.

## Goals / Non-Goals

**Goals:**

- Provide ergonomic `coach tldr` and `coach snippet` commands with subactions: `list`, `show`, `search`, `edit`, `delete`, `path`.
- Default action (no args) opens an interactive fuzzy picker → `show`.
- Provide one-letter quick-access aliases `c-tldr` and `c-snip` that forward arguments to `coach tldr` / `coach snippet`.
- Idempotent install/uninstall of shell aliases via `coach install-aliases` / `coach uninstall-aliases`, with `coach init` offering to install them.
- Reuse existing storage + search; no new persistence.

**Non-Goals:**

- No editing of frontmatter through the CLI — `edit` just opens `$EDITOR`.
- No tag management subcommands (existing search tags are enough for now).
- No projects subcommand in this change (deferred).
- No fish/PowerShell support in v1; bash + zsh only.
- No global package install; aliases shell out to the user's `coach` on `$PATH`.

## Decisions

### 1. Subcommand shape: `coach <type> <action> [slug|query]`

Chose `coach tldr show foo` over flag style (`coach show --type tldr foo`) for readability, tab-completion, and parity with tools like `git`/`gh`. Default
action when none given:

- `coach tldr` (no args) → interactive picker
- `coach tldr foo` (one arg, no recognised action) → treat as slug for `show`
- `coach tldr search "json"` → explicit search

Recognised actions: `list`, `show`, `search`, `edit`, `delete`, `path`. Unknown first arg is treated as a slug for implicit `show`.

**Alternatives considered:** dedicated top-level `coach show` / `coach list` filtered by `--type`. Rejected because the aliases (`c-tldr`, `c-snip`) become
awkward and discoverability suffers.

### 2. Slug resolution with fuzzy fallback

`show`/`edit`/`delete`/`path` accept a slug. Resolution order:

1. Exact match on slug (file basename without `.md`).
2. Case-insensitive prefix match — if exactly one, use it.
3. Substring match — if multiple, drop into picker.
4. None → exit non-zero with hint to run `list`/`search`.

Snippets are nested by language (`snippets/<lang>/<slug>.md`), so resolution scans all language subdirs. If a slug is ambiguous across languages, the picker
shows `<lang>/<slug>`.

### 3. Picker implementation

Use a minimal built-in numeric picker (print numbered list, read line from stdin) rather than depending on `fzf`. Detect `fzf` in `$PATH` and prefer it when
available (pipe `list` output, take selection). Keeps zero-dep default but improves UX where possible. Lives in `src/utils/picker.ts`.

### 4. Edit action delegates to `$EDITOR`

`coach tldr edit foo` resolves the file path and execs `$EDITOR $path` (fallback chain: `$VISUAL` → `$EDITOR` → `vi`). After the editor exits with code 0,
re-run the indexer (`syncItem` from `src/storage/sync.ts`) so SQLite reflects frontmatter/content changes.

### 5. Search reuses `src/storage/search.ts`

Add a thin wrapper `searchByType(db, type, query)` that calls existing search and post-filters by `type`. Output: `slug — title — tags` lines, sorted by
recency. No new schema.

### 6. Shell aliases: rc-file appender with markers

Single new module `src/utils/shell-aliases.ts`:

- Detect shell from `$SHELL` (bash → `~/.bashrc`, zsh → `~/.zshrc`).
- Append a fenced block:
  ```
  # >>> dev-coach aliases >>>
  alias c-tldr='coach tldr'
  alias c-snip='coach snippet'
  # <<< dev-coach aliases <<<
  ```
- `install-aliases` is idempotent: if markers exist, replace block; otherwise append.
- `uninstall-aliases` removes the fenced block (only — never touches surrounding lines).
- Print a "run `source ~/.zshrc` or open a new shell" hint after install.

**Alternatives considered:** symlinking `c-tldr`/`c-snip` binaries into `~/.local/bin`. Rejected: requires PATH setup, harder to uninstall cleanly, and
per-shell aliases are the convention in similar tools (gh, zoxide).

### 7. `coach init` integration

Append a step at the end of `runInit`: prompt "Install shell aliases (c-tldr, c-snip)? [Y/n]". Default yes. Skipped in non-interactive mode. Already-installed →
silently no-op.

## Risks / Trade-offs

- **Slug ambiguity in snippets across languages** → mitigated by picker showing `<lang>/<slug>`.
- **Editor exits non-zero** (user aborts) → don't re-index; print "Edit cancelled, no changes indexed."
- **Index drift if user edits files outside `coach edit`** → out of scope here; existing `syncItem` flow on next save still corrects it. Could add
  `coach reindex` later.
- **Shell rc modification** → mitigated by clear fenced markers and a clean uninstall path. Document in init prompt.
- **fzf detection adds complexity** → trade-off accepted; built-in picker is the always-works fallback so fzf is purely additive.
- **No fish/PowerShell** → documented in non-goals; structure of `shell-aliases.ts` leaves room to add them later via a small per-shell strategy table.

## Migration Plan

No migrations. New commands are additive; no existing behaviour changes. Aliases are opt-in.

## Open Questions

- Should `delete` require `--yes` confirmation, or always prompt? **Default decision:** always prompt unless `--yes` passed; non-interactive defaults to abort.
- Should `c-tldr` / `c-snip` also accept a `--no-pager` flag for piping `show` output? **Default decision:** auto-detect TTY (`Deno.stdout.isTerminal()`) and
  pipe through `$PAGER` only when interactive.
