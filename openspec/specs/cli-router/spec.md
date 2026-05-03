## ADDED Requirements

### Requirement: Subcommand routing

The CLI SHALL accept a subcommand as the first positional argument and route to the corresponding skill handler. Supported subcommands: `init`, `ask`,
`explain`, `compare`, `sandbox`, `review`, `project`, `stats`, `tldr`, `snippet`, `install-aliases`, `uninstall-aliases`, `install-pi`, `uninstall-pi`.

#### Scenario: Valid subcommand

- **WHEN** user runs `coach ask "how to reverse a list"`
- **THEN** the system SHALL route to the ask skill handler with the remaining arguments

#### Scenario: Library subcommand routing

- **WHEN** user runs `coach tldr show foo`
- **THEN** the system SHALL route to the library-cli handler with type `tldr` and arguments `["show", "foo"]`

#### Scenario: Snippet subcommand routing

- **WHEN** user runs `coach snippet list`
- **THEN** the system SHALL route to the library-cli handler with type `snippet` and arguments `["list"]`

#### Scenario: Aliases subcommand routing

- **WHEN** user runs `coach install-aliases`
- **THEN** the system SHALL route to the shell-aliases install handler

#### Scenario: Unknown subcommand

- **WHEN** user runs `coach foo`
- **THEN** the system SHALL print an error message listing available subcommands and exit with code 1

#### Scenario: No subcommand

- **WHEN** user runs `coach` with no arguments
- **THEN** the system SHALL print the help message with available subcommands

### Requirement: Global flags

The CLI SHALL support global flags: `--help` (print usage), `--version` (print version), `--config <path>` (override config file path).

#### Scenario: Version flag

- **WHEN** user runs `coach --version`
- **THEN** the system SHALL print the version string from `deno.json` and exit with code 0

#### Scenario: Help flag

- **WHEN** user runs `coach --help`
- **THEN** the system SHALL print usage information including all subcommands with brief descriptions

#### Scenario: Config override

- **WHEN** user runs `coach --config /tmp/custom.yaml ask "question"`
- **THEN** the system SHALL load config from `/tmp/custom.yaml` instead of the default path

### Requirement: Stub handlers for unimplemented skills

All skill subcommands except `init` SHALL respond with a "not yet implemented" message and the skill's ASCII art icon until their respective changes are
applied.

#### Scenario: Stub command output

- **WHEN** user runs `coach ask "something"` before change 03 is applied
- **THEN** the system SHALL print the ask icon and "coach:ask — not yet implemented" and exit with code 0

### Requirement: Help text includes library commands

The `--help` output and the `SUBCOMMANDS` registry SHALL list `tldr`, `snippet`, `install-aliases`, and `uninstall-aliases` with one-line descriptions.

#### Scenario: Help mentions library commands

- **WHEN** user runs `coach --help`
- **THEN** the output SHALL include lines for `tldr`, `snippet`, `install-aliases`, and `uninstall-aliases`
