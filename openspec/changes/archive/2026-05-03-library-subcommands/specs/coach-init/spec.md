## ADDED Requirements

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
