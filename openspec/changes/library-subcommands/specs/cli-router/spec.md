## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Help text includes library commands

The `--help` output and the `SUBCOMMANDS` registry SHALL list `tldr`, `snippet`, `install-aliases`, and `uninstall-aliases` with one-line descriptions.

#### Scenario: Help mentions library commands

- **WHEN** user runs `coach --help`
- **THEN** the output SHALL include lines for `tldr`, `snippet`, `install-aliases`, and `uninstall-aliases`
