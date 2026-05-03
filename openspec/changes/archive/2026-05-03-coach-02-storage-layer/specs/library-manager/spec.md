## ADDED Requirements

### Requirement: Save a library item

The system SHALL provide a `saveItem(type, content, metadata)` function that writes a markdown file with YAML frontmatter to the appropriate library
subdirectory. For snippets, the file SHALL be placed in `{library}/snippets/{lang}/{slug}.md`. For TLDRs, in `{library}/tldr/{slug}.md`. For projects, in
`{library}/projects/{slug}/README.md`.

#### Scenario: Save a snippet

- **WHEN** `saveItem("snippet", content, { title: "JSON Parse", lang: "rust", tags: ["json"] })` is called
- **THEN** the file `{library}/snippets/rust/json-parse.md` SHALL exist with YAML frontmatter and content

#### Scenario: Save a TLDR

- **WHEN** `saveItem("tldr", content, { title: "Docker Basics", tags: ["docker"] })` is called
- **THEN** the file `{library}/tldr/docker-basics.md` SHALL exist with YAML frontmatter and content

### Requirement: Slug generation with dedup

The system SHALL generate kebab-case slugs from titles. If a file with that slug already exists, it SHALL append `-2`, `-3`, etc. until a unique filename is
found.

#### Scenario: Unique slug

- **WHEN** title is "Parse JSON with Serde" and no file exists
- **THEN** slug SHALL be `parse-json-with-serde`

#### Scenario: Duplicate slug

- **WHEN** slug `json-parse` already exists as a file
- **THEN** the system SHALL use `json-parse-2`

### Requirement: Create language subdirectories on demand

When saving a snippet, the system SHALL create the language subdirectory under `snippets/` if it does not exist.

#### Scenario: New language directory

- **WHEN** saving a snippet with `lang: "rust"` and `snippets/rust/` does not exist
- **THEN** the directory SHALL be created before writing the file

### Requirement: Read a library item

The system SHALL provide a `readItem(path)` function that reads a markdown file, parses its frontmatter, and returns both metadata and content.

#### Scenario: Read existing item

- **WHEN** `readItem("snippets/rust/json-parse.md")` is called and the file exists
- **THEN** it SHALL return `{ metadata: { title, tags, ... }, content: "..." }`

### Requirement: Delete a library item

The system SHALL provide a `deleteItem(path)` function that removes the markdown file and its DB index entry.

#### Scenario: Delete existing item

- **WHEN** `deleteItem("snippets/rust/json-parse.md")` is called
- **THEN** the file SHALL be removed and the corresponding `items` row deleted

### Requirement: List items by type

The system SHALL provide a `listItems(type)` function that returns all items of a given type from the DB.

#### Scenario: List all snippets

- **WHEN** `listItems("snippet")` is called with 3 snippets saved
- **THEN** it SHALL return an array of 3 item records with paths and metadata
