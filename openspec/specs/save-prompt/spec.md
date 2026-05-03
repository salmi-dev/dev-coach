## ADDED Requirements

### Requirement: Save prompt with suggestion
The system SHALL provide a `savePrompt(type, suggestedTitle, suggestedTags, content)` function that interactively asks the user: "💾 Save as {type}? [Y/n]". If yes, it SHALL prompt for title (pre-filled with suggestion), tags (pre-filled with suggestions), and difficulty (for snippets).

#### Scenario: User accepts save with defaults
- **WHEN** save prompt shows suggested title "JSON Parse" and user presses Enter
- **THEN** the item SHALL be saved with title "JSON Parse"

#### Scenario: User declines save
- **WHEN** user answers "n" to the save prompt
- **THEN** no file SHALL be written and the function SHALL return null

#### Scenario: User edits title
- **WHEN** user changes the suggested title to "Advanced JSON Parsing"
- **THEN** the item SHALL be saved with the edited title

### Requirement: Clipboard copy prompt
After a save prompt (or independently for commands), the system SHALL ask "📋 Copy to clipboard? [Y/n]". If yes, it SHALL copy the content using `copyToClipboard()`.

#### Scenario: User copies to clipboard
- **WHEN** user answers "y" to clipboard prompt
- **THEN** the content SHALL be copied to the system clipboard

#### Scenario: Clipboard unavailable
- **WHEN** user answers "y" but no clipboard tool is detected
- **THEN** the system SHALL print a warning "Clipboard not available" and continue without error

### Requirement: Non-interactive save
The system SHALL also support non-interactive saves via the library manager directly, without prompts, for programmatic use by skills.

#### Scenario: Direct save without prompts
- **WHEN** a skill calls `saveItem()` directly with all metadata
- **THEN** the item SHALL be saved without any user interaction
