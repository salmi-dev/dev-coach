## ADDED Requirements

### Requirement: Log a session

The system SHALL provide a `logSession(params)` function that inserts a row into the `sessions` table with: ts (auto-set to current ISO timestamp), mode, lang,
tags (JSON array), query, duration_s, and saved_as (optional file path).

#### Scenario: Log an ask session

- **WHEN** `logSession({ mode: "ask", lang: "rust", tags: ["json"], query: "how to parse json", duration_s: 30 })` is called
- **THEN** a row SHALL exist in `sessions` with mode="ask", lang="rust", and ts set to approximately now

#### Scenario: Log session with saved file

- **WHEN** `logSession({ mode: "sandbox", lang: "python", saved_as: "snippets/python/list-comp.md", ... })` is called
- **THEN** the `saved_as` field SHALL contain the file path

### Requirement: Session ID returned

The `logSession()` function SHALL return the inserted session ID so it can be linked to saved items via `source_session`.

#### Scenario: Session ID linkable

- **WHEN** a session is logged and returns id=42
- **THEN** a subsequently saved item can reference `source_session: 42`
