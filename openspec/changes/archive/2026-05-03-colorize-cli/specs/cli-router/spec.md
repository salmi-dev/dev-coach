## ADDED Requirements

### Requirement: Global --no-color flag

The CLI SHALL recognise a `--no-color` global flag. When present anywhere in `Deno.args`, the router SHALL call `setColorEnabled(false)` before dispatching to
any subcommand and SHALL strip the flag from the args passed to handlers.

#### Scenario: --no-color disables coloring

- **WHEN** user runs `coach --no-color tldr list`
- **THEN** the output SHALL contain no ANSI escape codes

#### Scenario: --no-color is removed from forwarded args

- **WHEN** user runs `coach --no-color ask "question"`
- **THEN** the ask skill handler SHALL receive `["question"]`, not `["--no-color", "question"]`

### Requirement: Skill banner on subcommand entry

For skill subcommands (`ask`, `explain`, `compare`, `sandbox`, `review`, `project`, `stats`), the router SHALL call `printBanner(<skill>)` before invoking the
skill's handler. Library subcommands (`tldr`, `snippet`, `install-aliases`, `uninstall-aliases`, `install-pi`, `uninstall-pi`, `init`) SHALL NOT print a banner.

#### Scenario: Skill banner shown for ask

- **WHEN** user runs `coach ask "x"`
- **THEN** stdout SHALL begin with the ASCII banner block followed by `coach:ask`

#### Scenario: Library subcommand has no banner

- **WHEN** user runs `coach tldr list`
- **THEN** the first line of stdout SHALL be a list entry, not a banner border
