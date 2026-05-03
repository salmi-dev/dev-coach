## MODIFIED Requirements

### Requirement: TLDR and snippet subcommands

The CLI SHALL provide `coach tldr` and `coach snippet` subcommands. Each accepts an optional action as the second positional argument: `list`, `show`, `search`,
`edit`, `delete`, `path`. If the second argument is not a recognised action, it SHALL be treated as a slug for an implicit `show`. List output SHALL apply the
cli-presentation color scheme: slug in bold, em-dash separators in dim, title in default color, tags in cyan.

#### Scenario: Explicit list

- **WHEN** user runs `coach tldr list` with color enabled
- **THEN** the system SHALL print all TLDRs as `slug — title — tags`, sorted by most recently modified, with slug bolded, separators dimmed, and tags in cyan

#### Scenario: Implicit show via slug

- **WHEN** user runs `coach tldr reverse-a-list-in-python`
- **THEN** the system SHALL print the rendered contents of `~/dev-coach/tldr/reverse-a-list-in-python.md`

#### Scenario: Snippet listing scoped to type

- **WHEN** user runs `coach snippet list`
- **THEN** the system SHALL list only items under `~/dev-coach/snippets/**` and SHALL NOT include TLDRs

#### Scenario: List output is plain when color disabled

- **WHEN** `NO_COLOR=1 coach tldr list` is run
- **THEN** the output SHALL contain no ANSI escape sequences

## ADDED Requirements

### Requirement: Search match highlighting

The `search <query>` action SHALL highlight occurrences of the query string in the printed result lines using yellow + bold styling (case-insensitive).
Highlighting SHALL be skipped when color is disabled. Regex-special characters in the query SHALL be escaped before building the highlight pattern so a query
like `parse(json)` does not crash.

#### Scenario: Match highlighted when color enabled

- **WHEN** user runs `coach tldr search json` and a result contains "JSON Parsing"
- **THEN** the substring matching `json` (case-insensitive) SHALL be wrapped in yellow + bold ANSI codes

#### Scenario: No highlighting when color disabled

- **WHEN** user runs `NO_COLOR=1 coach tldr search json`
- **THEN** the result lines SHALL contain no ANSI escape codes

#### Scenario: Regex-special query does not crash

- **WHEN** user runs `coach snippet search "parse(json)"`
- **THEN** the system SHALL execute the search and print results without throwing
