## ADDED Requirements

### Requirement: ApproachCollector class

The system SHALL provide an `ApproachCollector` class that accumulates numbered approaches. Each approach has: `index` (number), `title` (string), `content`
(string), `lang` (optional string), `tags` (string array).

#### Scenario: Add approaches

- **WHEN** three approaches are added to the collector
- **THEN** `collector.approaches` SHALL contain 3 items with indices 1, 2, 3

### Requirement: Batch selection prompt

The `ApproachCollector` SHALL provide a `selectAndSave(db, options)` method that displays all approaches numbered, asks "Which to save? [all / 1,3,4 / none]",
and saves the selected ones as individual snippets.

#### Scenario: User selects all

- **WHEN** user answers "all" to the selection prompt
- **THEN** all approaches SHALL be saved as individual snippet files

#### Scenario: User selects specific indices

- **WHEN** user answers "1,3" to the selection prompt
- **THEN** only approaches 1 and 3 SHALL be saved

#### Scenario: User selects none

- **WHEN** user answers "none" to the selection prompt
- **THEN** no files SHALL be written

### Requirement: Summary table generation

The system SHALL provide a `formatSummaryTable(approaches)` function that renders all approaches as a numbered summary with title and brief description.

#### Scenario: Summary with 3 approaches

- **WHEN** 3 approaches are formatted
- **THEN** output SHALL contain numbered lines with each approach's title

### Requirement: Selection parser

The system SHALL parse selection strings: "all" saves everything, "none" saves nothing, comma-separated numbers (e.g., "1,3,4") save specific indices. Invalid
indices SHALL be silently ignored.

#### Scenario: Parse "1,3,4"

- **WHEN** selection "1,3,4" is parsed with 5 approaches
- **THEN** indices [1, 3, 4] SHALL be returned

#### Scenario: Parse with invalid index

- **WHEN** selection "1,99" is parsed with 3 approaches
- **THEN** only index [1] SHALL be returned (99 ignored)
