## 1. Slug resolution & picker utilities

- [x] 1.1 Add `src/utils/picker.ts` exporting `pick<T>(items, label)` with numeric fallback and fzf detection (`Deno.Command("fzf")` if on `$PATH`)
- [x] 1.2 Add `resolveSlug(type, slug, libraryPath)` to `src/storage/library.ts` implementing exact → prefix → substring resolution; returns
      `{ relativePath, absolutePath }` or `null`
- [x] 1.3 Unit tests in `tests/storage/library_test.ts` covering exact match, prefix match, ambiguous match across snippet languages, no match

## 2. Library CLI handler

- [x] 2.1 Create `src/cli/library.ts` exporting `runLibraryCommand(type: ItemType, args: string[], context)`
- [x] 2.2 Implement `list` action — uses `listItems`, sorts by mtime desc, prints `slug — title — tags`
- [x] 2.3 Implement `show` action — resolves slug, reads file, pipes through `$PAGER` only when `Deno.stdout.isTerminal()`
- [x] 2.4 Implement `search` action — wrap `src/storage/search.ts` with `type` filter; exit 1 if query missing
- [x] 2.5 Implement `edit` action — resolve `$VISUAL`/`$EDITOR`/`vi`, exec, on success call existing `syncItem` from `src/storage/sync.ts`
- [x] 2.6 Implement `delete` action — confirm prompt, `--yes` flag, non-interactive abort; call `deleteItem`
- [x] 2.7 Implement `path` action — print absolute path only, newline-terminated
- [x] 2.8 Implement default no-arg flow — call picker on full list, then `show` selected item; handle empty list with friendly message
- [x] 2.9 Implement implicit `show` when first arg is not a recognised action — pass through `resolveSlug`
- [x] 2.10 Tests in `tests/cli/library_test.ts` for each action (list, show, search, path, delete with --yes, edit error paths)

## 3. CLI router integration

- [x] 3.1 Add `tldr`, `snippet`, `install-aliases`, `uninstall-aliases` entries to `SUBCOMMANDS` in `src/cli/router.ts` with descriptions
- [x] 3.2 Add `case "tldr"` and `case "snippet"` branches that import `runLibraryCommand` and pass the type
- [x] 3.3 Add `case "install-aliases"` and `case "uninstall-aliases"` branches wired to `src/utils/shell-aliases.ts`
- [x] 3.4 Verify `coach --help` lists the new commands (snapshot test or assert in `tests/cli/router_test.ts`)

## 4. Shell aliases module

- [x] 4.1 Create `src/utils/shell-aliases.ts` with `detectShellRc()` mapping `$SHELL` → `~/.bashrc` | `~/.zshrc`
- [x] 4.2 Implement `installAliases()` — read rc (create if missing), replace existing fenced block or append; print source-rc hint
- [x] 4.3 Implement `uninstallAliases()` — strip only the fenced block; preserve surrounding lines; no-op message if absent
- [x] 4.4 Define alias block constant with `c-tldr` and `c-snip` definitions and start/end markers
- [x] 4.5 Error path for unsupported shells — exit 1 with "Supported: bash, zsh"
- [x] 4.6 Tests in `tests/utils/shell-aliases_test.ts` using a temp rc file: install on empty file, re-install replaces, uninstall removes block, uninstall when
      absent, unsupported shell

## 5. coach init integration

- [x] 5.1 In `src/skills/init.ts`, after existing prompts, add aliases prompt "Install shell aliases (c-tldr, c-snip)? [Y/n]"
- [x] 5.2 Skip prompt when stdin is not a TTY
- [x] 5.3 On accept, call `installAliases()`; tolerate already-installed (idempotent)
- [x] 5.4 Update init success summary to mention installed aliases when applicable
- [x] 5.5 Update tests in `tests/skills/init_test.ts` for accept, decline, non-interactive paths

## 6. Help text & docs

- [x] 6.1 Update `cli.ts` help footer if needed (it already auto-renders from `SUBCOMMANDS`)
- [x] 6.2 Update `README.md` with a "Browsing your library" section documenting `coach tldr`, `coach snippet`, and the `c-tldr`/`c-snip` aliases
- [x] 6.3 Add example invocations to the section: `coach tldr`, `coach tldr search json`, `c-snip show parse-json`

## 7. Documentation (JSDoc)

- [x] 7.1 Add JSDoc to every new exported symbol in `src/utils/picker.ts`, `src/utils/shell-aliases.ts`, `src/cli/library.ts`, and new exports in
      `src/storage/library.ts` (e.g. `resolveSlug`)
- [x] 7.2 Each JSDoc MUST include a one-line summary, plus `@param`/`@returns` for non-trivial signatures and `@example` for public APIs

## 8. Verify

- [x] 8.1 Run `deno fmt` — no diff (enforces 160-col, single quotes, semicolons)
- [x] 8.2 Run `deno lint` — no new warnings introduced by this change
- [x] 8.3 Run `deno task test` — all tests green
- [x] 8.4 Manual smoke: `coach tldr list`, `coach tldr` (picker), `coach tldr show <slug>`, `coach tldr edit <slug>`, `coach install-aliases`, source rc, run
      `c-tldr show <slug>`, `coach uninstall-aliases`
- [x] 8.5 Run `openspec verify --change library-subcommands` and address any gaps
