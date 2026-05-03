## ADDED Requirements

### Requirement: Search by full text
The system SHALL provide a search function that accepts a text query and returns matching items from the FTS5 index, ordered by relevance.

#### Scenario: Full-text search matches title
- **WHEN** searching for "serde" and an item titled "Parse JSON with Serde" exists
- **THEN** that item SHALL be in the results

#### Scenario: No matches returns empty
- **WHEN** searching for "kubernetes" and no items match
- **THEN** the result SHALL be an empty array

### Requirement: Search by filters
The system SHALL accept a `SearchFilters` object with optional fields: `query` (FTS text), `type` (snippet|tldr|project), `lang` (string), `tags` (string array — match any), `limit` (number).

#### Scenario: Filter by type
- **WHEN** searching with `{ type: "snippet" }` and 3 snippets + 2 tldrs exist
- **THEN** only the 3 snippets SHALL be returned

#### Scenario: Filter by language
- **WHEN** searching with `{ lang: "rust" }` and 2 rust + 1 python items exist
- **THEN** only the 2 rust items SHALL be returned

#### Scenario: Filter by tags
- **WHEN** searching with `{ tags: ["json", "parsing"] }` and 1 item has tag "json"
- **THEN** that item SHALL be returned (match any tag)

#### Scenario: Combined filters
- **WHEN** searching with `{ type: "snippet", lang: "rust", query: "json" }`
- **THEN** only rust snippets matching "json" SHALL be returned

#### Scenario: Limit results
- **WHEN** searching with `{ limit: 5 }` and 10 items match
- **THEN** only 5 items SHALL be returned
