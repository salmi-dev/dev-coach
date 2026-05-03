## ADDED Requirements

### Requirement: Default monthly stats dashboard
`coach stats` SHALL render an ASCII box dashboard showing: total session count (with month-over-month delta), mode breakdown, language bar charts (top 5, block characters with percentages), library item counts (snippets, tldrs, projects), current streak (consecutive days), most active day of week, and newest topic this month.

#### Scenario: Dashboard with data
- **WHEN** user runs `coach stats` with 47 sessions this month
- **THEN** an ASCII box SHALL render with all sections populated

#### Scenario: Dashboard with no data
- **WHEN** user runs `coach stats` with zero sessions
- **THEN** the dashboard SHALL show zeros and a message "Start with `coach ask`!"

### Requirement: Weekly stats subcommand
`coach stats weekly` SHALL show stats for the current week (Monday–Sunday): session count, mode breakdown, languages used.

#### Scenario: Weekly view
- **WHEN** user runs `coach stats weekly`
- **THEN** stats SHALL be scoped to the current week only

### Requirement: Language-specific stats
`coach stats lang <lang>` SHALL show stats filtered to a specific language: session count, common topics (top tags), recent items in that language.

#### Scenario: Language filter
- **WHEN** user runs `coach stats lang rust`
- **THEN** only rust sessions and items SHALL be shown

### Requirement: Topics view
`coach stats topics` SHALL show the most frequent tags across all sessions and items, ranked by frequency.

#### Scenario: Topics list
- **WHEN** user runs `coach stats topics` with diverse sessions
- **THEN** tags SHALL be listed in descending frequency order

### Requirement: Profile view
`coach stats profile` SHALL show the inferred user profile: primary languages (ranked), peak activity hours, favorite modes, recent topic trends.

#### Scenario: Profile display
- **WHEN** user runs `coach stats profile`
- **THEN** the inferred profile SHALL be displayed with language rankings and activity patterns

### Requirement: Dashboard regeneration trigger
`coach stats` SHALL also trigger `regenerateDashboard()` to update `library/README.md` with fresh data.

#### Scenario: README updated
- **WHEN** user runs `coach stats`
- **THEN** `library/README.md` SHALL be regenerated with current stats
