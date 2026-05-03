## ADDED Requirements

### Requirement: Install shell aliases command

The system SHALL provide a `coach install-aliases` command that appends quick-access aliases (`c-tldr` → `coach tldr`, `c-snip` → `coach snippet`) to the user's
shell rc file. The block SHALL be wrapped in fenced markers (`# >>> dev-coach aliases >>>` / `# <<< dev-coach aliases <<<`) and SHALL be idempotent.

#### Scenario: First-time install on zsh

- **WHEN** user runs `coach install-aliases` with `$SHELL=/bin/zsh` and `~/.zshrc` exists without the marker block
- **THEN** the system SHALL append the fenced alias block to `~/.zshrc` and print a hint to `source ~/.zshrc` or open a new shell

#### Scenario: Re-install replaces existing block

- **WHEN** user runs `coach install-aliases` and the marker block already exists
- **THEN** the system SHALL replace the contents between the markers without duplicating the block and SHALL leave the rest of the file unchanged

#### Scenario: Bash detection

- **WHEN** `$SHELL=/bin/bash`
- **THEN** the system SHALL target `~/.bashrc`

#### Scenario: Unsupported shell

- **WHEN** `$SHELL` does not match a supported shell (bash, zsh)
- **THEN** the system SHALL exit with code 1 and print "Unsupported shell: <name>. Supported: bash, zsh"

### Requirement: Uninstall shell aliases command

The system SHALL provide a `coach uninstall-aliases` command that removes ONLY the fenced marker block from the user's shell rc, preserving all other content.

#### Scenario: Clean uninstall

- **WHEN** user runs `coach uninstall-aliases` and the marker block exists
- **THEN** the system SHALL remove the block (including markers) and SHALL leave surrounding lines untouched

#### Scenario: Uninstall when not installed

- **WHEN** the marker block is not present
- **THEN** the system SHALL print "No dev-coach aliases found" and exit with code 0

### Requirement: Alias block content

The installed alias block SHALL define exactly: `alias c-tldr='coach tldr'` and `alias c-snip='coach snippet'`. The aliases SHALL forward all arguments
transparently.

#### Scenario: Alias forwards arguments

- **WHEN** user runs `c-tldr show foo` after sourcing the rc
- **THEN** the shell SHALL execute `coach tldr show foo` and produce identical output

#### Scenario: Alias with no args

- **WHEN** user runs `c-snip` after sourcing the rc
- **THEN** the shell SHALL execute `coach snippet` (which opens the picker)
