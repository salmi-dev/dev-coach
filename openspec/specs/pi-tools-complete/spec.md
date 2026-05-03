## ADDED Requirements

### Requirement: Coach-copy pi tool

The system SHALL provide a `coach-copy` pi custom tool that copies text to the system clipboard. Parameters: `text` (string). Returns:
`{ success: boolean, tool: string | null }`.

#### Scenario: Successful copy

- **WHEN** agent calls `coach-copy` with text="git rebase -i HEAD~3"
- **THEN** the text SHALL be copied to clipboard and return `{ success: true, tool: "pbcopy" }`

#### Scenario: No clipboard available

- **WHEN** agent calls `coach-copy` and no clipboard tool is detected
- **THEN** it SHALL return `{ success: false, tool: null }`

### Requirement: Coach-log pi tool

The system SHALL provide a `coach-log` pi custom tool that logs a session to the DB. Parameters: `mode` (string), `lang` (optional string), `tags` (optional
string array), `query` (optional string), `duration_s` (optional number), `saved_as` (optional string). Returns: `{ sessionId: number }`.

#### Scenario: Log session from agent

- **WHEN** agent calls `coach-log` with mode="ask", lang="rust"
- **THEN** a session row SHALL be inserted and the ID returned

### Requirement: Complete tool set of 4

The system SHALL provide 4 pi custom tools total: `coach-save` (from change 04), `coach-search` (from change 04), `coach-copy` (new), `coach-log` (new).

#### Scenario: All 4 tools available

- **WHEN** a pi agent reads the tools directory
- **THEN** it SHALL find definitions for coach-save, coach-search, coach-copy, coach-log
