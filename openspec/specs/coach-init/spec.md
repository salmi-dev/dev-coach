## ADDED Requirements

### Requirement: Interactive first-run setup

The `coach init` command SHALL interactively prompt the user for: primary languages (numbered list, multi-select), frameworks/tools (free text,
comma-separated), response style (numbered choice: concise/detailed/examples-first), and library path (with default `~/dev-coach`).

#### Scenario: Complete init flow

- **WHEN** user runs `coach init` and answers all prompts
- **THEN** the system SHALL save a config file, create the database, and scaffold the library directory

#### Scenario: Init with defaults

- **WHEN** user runs `coach init` and presses Enter on every prompt (accepting defaults)
- **THEN** the system SHALL create config with default values, database, and library at `~/dev-coach/`

### Requirement: Directory scaffolding

On init, the system SHALL create the library directory with subdirectories: `snippets/`, `tldr/`, `projects/`. It SHALL also create the config directory and
data directory if they do not exist.

#### Scenario: Library directory creation

- **WHEN** `coach init` completes with library path `~/dev-coach`
- **THEN** directories `~/dev-coach/snippets/`, `~/dev-coach/tldr/`, and `~/dev-coach/projects/` SHALL exist

#### Scenario: Config and data directories creation

- **WHEN** `coach init` completes
- **THEN** the config directory and data directory SHALL exist with `config.yaml` and `coach.db` respectively

### Requirement: Initial README dashboard

On init, the system SHALL write a `README.md` file in the library root with: a header with ASCII art, empty stats section, and placeholder sections for
snippets, tldrs, and projects.

#### Scenario: README created on init

- **WHEN** `coach init` completes
- **THEN** `{library_path}/README.md` SHALL exist with the dashboard template

### Requirement: Welcome banner

The init command SHALL display an ASCII art welcome banner at the start, and a success summary at the end listing all created paths.

#### Scenario: Welcome and summary display

- **WHEN** user runs `coach init`
- **THEN** the system SHALL print an ASCII art banner before prompts and a summary of created files/directories after completion

### Requirement: Re-init guard

If config and database already exist, `coach init` SHALL warn the user and ask for confirmation before overwriting. Running with `--force` SHALL skip the
confirmation.

#### Scenario: Re-init with existing config

- **WHEN** user runs `coach init` and config already exists
- **THEN** the system SHALL print a warning and ask "Config already exists. Overwrite? [y/N]"

#### Scenario: Re-init with --force

- **WHEN** user runs `coach init --force`
- **THEN** the system SHALL overwrite existing config and database without prompting

### Requirement: Optional shell alias installation during init

After completing the existing init prompts, `coach init` SHALL prompt "Install shell aliases (c-tldr, c-snip)? [Y/n]". If the user accepts (or presses Enter),
the system SHALL invoke the shell-aliases install routine. If declined, init SHALL complete normally.

#### Scenario: User accepts alias install

- **WHEN** user runs `coach init` and answers `y` (or Enter) to the aliases prompt
- **THEN** the system SHALL install the aliases into the detected shell rc and print the source-rc hint

#### Scenario: User declines alias install

- **WHEN** user answers `n` to the aliases prompt
- **THEN** init SHALL complete without modifying any shell rc file

#### Scenario: Non-interactive init skips aliases

- **WHEN** `coach init` runs with stdin not attached to a TTY
- **THEN** the system SHALL skip the aliases prompt entirely and complete init normally

#### Scenario: Aliases already installed

- **WHEN** the alias marker block already exists in the user's rc and user accepts the prompt
- **THEN** the system SHALL no-op (or refresh the block contents) without duplication
