## ADDED Requirements

### Requirement: Sandbox topic exploration

The `coach:sandbox` skill SHALL accept a topic string and produce multiple numbered approaches exploring that topic. Each approach SHALL include a title, code
example, and explanation of trade-offs.

#### Scenario: Explore a topic

- **WHEN** user runs `coach sandbox "error handling in rust"`
- **THEN** the skill SHALL produce multiple approaches (e.g., Result, panic, anyhow, thiserror) each as a numbered section

### Requirement: Sandbox summary table

After all approaches are presented, the sandbox skill SHALL display a summary table comparing all approaches.

#### Scenario: Summary after exploration

- **WHEN** all approaches are presented
- **THEN** a summary table SHALL list each approach with a one-line trade-off description

### Requirement: Sandbox batch snippet save

After the summary, the sandbox skill SHALL use the `ApproachCollector.selectAndSave()` to let the user choose which approaches to save as individual snippets in
`snippets/{lang}/`.

#### Scenario: Save selected approaches

- **WHEN** user selects "1,3" from 4 approaches about Rust error handling
- **THEN** 2 snippet files SHALL be created in `snippets/rust/`

### Requirement: Sandbox context awareness

The sandbox skill SHALL read the user's `primary_languages` from config and prioritize examples in those languages when the topic is language-agnostic.

#### Scenario: Language preference

- **WHEN** user's primary languages include "typescript" and topic is "sorting algorithms"
- **THEN** examples SHALL prefer TypeScript

### Requirement: Sandbox session logging

The sandbox skill SHALL log a session with mode="sandbox", the detected language, topic tags, and the count of approaches explored.

#### Scenario: Session logged

- **WHEN** a sandbox session exploring 4 approaches completes
- **THEN** the session SHALL be logged with duration and approach count
