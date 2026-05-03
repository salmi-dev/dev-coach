## ADDED Requirements

### Requirement: Regenerate library README
The system SHALL provide a `regenerateDashboard()` function that queries the DB and writes an updated `{library}/README.md` with: ASCII art header, stats summary (total sessions, snippet/tldr/project counts), recent snippets (last 5), TLDRs list, and projects list.

#### Scenario: Dashboard with content
- **WHEN** `regenerateDashboard()` is called with 3 snippets, 2 tldrs, 1 project in DB
- **THEN** `README.md` SHALL list all items with titles and relative links

#### Scenario: Dashboard with empty library
- **WHEN** `regenerateDashboard()` is called with no items
- **THEN** `README.md` SHALL show zero counts and placeholder messages

### Requirement: Auto-regenerate after save
The dashboard SHALL be regenerated automatically after every `saveItem()` call.

#### Scenario: Dashboard updates after save
- **WHEN** a new snippet is saved via `saveItem()`
- **THEN** `README.md` SHALL include the new snippet in the recent list

### Requirement: Session stats in dashboard
The dashboard SHALL include total session count and a breakdown by mode from the `sessions` table.

#### Scenario: Stats reflect sessions
- **WHEN** 10 ask sessions and 5 sandbox sessions have been logged
- **THEN** the dashboard SHALL show "Total sessions: 15" and per-mode counts
