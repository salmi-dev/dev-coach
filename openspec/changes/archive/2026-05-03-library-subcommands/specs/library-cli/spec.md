## ADDED Requirements

### Requirement: TLDR and snippet subcommands

The CLI SHALL provide `coach tldr` and `coach snippet` subcommands. Each accepts an optional action as the second positional argument: `list`, `show`, `search`,
`edit`, `delete`, `path`. If the second argument is not a recognised action, it SHALL be treated as a slug for an implicit `show`.

#### Scenario: Explicit list

- **WHEN** user runs `coach tldr list`
- **THEN** the system SHALL print all TLDRs as `slug — title — tags`, sorted by most recently modified

#### Scenario: Implicit show via slug

- **WHEN** user runs `coach tldr reverse-a-list-in-python`
- **THEN** the system SHALL print the rendered contents of `~/dev-coach/tldr/reverse-a-list-in-python.md`

#### Scenario: Snippet listing scoped to type

- **WHEN** user runs `coach snippet list`
- **THEN** the system SHALL list only items under `~/dev-coach/snippets/**` and SHALL NOT include TLDRs

### Requirement: Interactive picker on no-arg invocation

When `coach tldr` or `coach snippet` is invoked with no further arguments, the system SHALL display an interactive picker of all items of that type and SHALL
`show` the selected item.

#### Scenario: Numeric fallback picker

- **WHEN** `fzf` is not on `$PATH` and user runs `coach tldr`
- **THEN** the system SHALL print a numbered list, read a line from stdin, and show the chosen item

#### Scenario: fzf-backed picker

- **WHEN** `fzf` is on `$PATH` and user runs `coach snippet`
- **THEN** the system SHALL pipe the listing to `fzf` and show the selected snippet

#### Scenario: No items available

- **WHEN** user runs `coach tldr` and no TLDRs exist
- **THEN** the system SHALL print "No tldrs saved yet" and exit with code 0

### Requirement: Slug resolution with fuzzy fallback

Actions taking a slug (`show`, `edit`, `delete`, `path`) SHALL resolve the argument in this order: (1) exact slug match, (2) case-insensitive prefix match if
uniquely identifying, (3) substring match — if multiple matches, drop into picker; if none, exit non-zero.

#### Scenario: Exact match

- **WHEN** user runs `coach tldr show reverse-a-list-in-python` and that file exists
- **THEN** the system SHALL print that file

#### Scenario: Ambiguous match across snippet languages

- **WHEN** user runs `coach snippet show parse` and `python/parse-json.md` and `js/parse-json.md` both exist
- **THEN** the system SHALL display a picker showing `python/parse-json` and `js/parse-json`

#### Scenario: No match

- **WHEN** user runs `coach tldr show nonexistent-thing`
- **THEN** the system SHALL print an error and exit with code 1

### Requirement: Search action

The `search <query>` action SHALL search items of the given type by title, tags, and content, reusing the existing search index, and print results sorted by
relevance.

#### Scenario: Search TLDRs

- **WHEN** user runs `coach tldr search "json"`
- **THEN** the system SHALL print only TLDR results matching "json" in title, tags, or content

#### Scenario: Empty query

- **WHEN** user runs `coach snippet search` with no query
- **THEN** the system SHALL exit with code 1 and print usage

### Requirement: Edit action delegates to $EDITOR

The `edit <slug>` action SHALL resolve the slug to an absolute path and exec `$EDITOR` (falling back to `$VISUAL`, then `vi`). On editor exit code 0, the system
SHALL re-index the item via the existing sync routine. On non-zero exit, the system SHALL skip re-indexing.

#### Scenario: Successful edit

- **WHEN** user runs `coach tldr edit foo` and the editor saves and exits 0
- **THEN** the system SHALL re-index `tldr/foo.md` so the search index reflects the new content

#### Scenario: Cancelled edit

- **WHEN** the editor exits with non-zero status
- **THEN** the system SHALL print "Edit cancelled, no changes indexed" and exit with the editor's status

#### Scenario: No editor configured

- **WHEN** none of `$VISUAL`, `$EDITOR`, or `vi` is available
- **THEN** the system SHALL print an error and exit with code 1

### Requirement: Delete action with confirmation

The `delete <slug>` action SHALL prompt "Delete '{slug}'? [y/N]" before removing the file. The `--yes` flag SHALL bypass the prompt. In non-interactive mode
without `--yes`, the action SHALL abort with a message.

#### Scenario: Confirmed delete

- **WHEN** user runs `coach tldr delete foo` and answers `y`
- **THEN** the system SHALL remove `tldr/foo.md` and remove its row from the index

#### Scenario: Cancelled delete

- **WHEN** user answers anything other than `y`
- **THEN** the file SHALL remain on disk

#### Scenario: Non-interactive abort

- **WHEN** stdin is not a TTY and `--yes` is not passed
- **THEN** the system SHALL exit with code 1 and print "Refusing to delete without --yes in non-interactive mode"

### Requirement: Path action prints absolute path

The `path <slug>` action SHALL print the absolute filesystem path of the resolved item to stdout and nothing else, suitable for shell substitution.

#### Scenario: Path output

- **WHEN** user runs `coach tldr path foo`
- **THEN** stdout SHALL contain only the absolute path to `~/dev-coach/tldr/foo.md` followed by a newline

### Requirement: Pager handling for show

The `show` action SHALL pipe output through `$PAGER` (default `less -R`) only when stdout is a TTY. When piped or non-interactive, output SHALL go directly to
stdout.

#### Scenario: Piped show

- **WHEN** user runs `coach tldr show foo | head`
- **THEN** the system SHALL write directly to stdout without invoking a pager
