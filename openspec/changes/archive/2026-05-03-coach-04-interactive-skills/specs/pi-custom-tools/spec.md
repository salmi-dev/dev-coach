## ADDED Requirements

### Requirement: Coach-save pi tool

The system SHALL provide a `coach-save` pi custom tool that agents can call to save a snippet/tldr/project during an interaction. Parameters: `type`
(snippet|tldr|project), `title` (string), `content` (string), `lang` (optional string), `tags` (string array). It SHALL call `saveItem()` from the storage
layer.

#### Scenario: Agent saves a snippet

- **WHEN** the agent calls `coach-save` with type="snippet", title="JSON Parse", content="...", lang="rust", tags=["json"]
- **THEN** the file SHALL be saved to `snippets/rust/json-parse.md` and indexed in DB

### Requirement: Coach-search pi tool

The system SHALL provide a `coach-search` pi custom tool that agents can call to search the user's library. Parameters: `query` (optional string), `type`
(optional), `lang` (optional), `tags` (optional string array). It SHALL call `search()` from the storage layer and return results.

#### Scenario: Agent searches for related items

- **WHEN** the agent calls `coach-search` with tags=["rust", "errors"]
- **THEN** matching items SHALL be returned with title, path, and tags

### Requirement: Tool definitions as pi-compatible files

Each tool SHALL be defined in a file under `src/pi/tools/` with a clear interface description that pi agents can discover and call.

#### Scenario: Tool discoverable by agent

- **WHEN** a pi agent reads the tool definition
- **THEN** it SHALL understand the parameters, return type, and usage
