## ADDED Requirements

### Requirement: Parse YAML frontmatter from markdown
The system SHALL provide a `parseFrontmatter(content)` function that extracts YAML between `---` fences at the start of a markdown file and returns `{ metadata, body }`.

#### Scenario: File with frontmatter
- **WHEN** content starts with `---\ntitle: Test\n---\nBody text`
- **THEN** `metadata` SHALL be `{ title: "Test" }` and `body` SHALL be `"Body text"`

#### Scenario: File without frontmatter
- **WHEN** content has no `---` fences at the start
- **THEN** `metadata` SHALL be `{}` and `body` SHALL be the full content

### Requirement: Serialize frontmatter to markdown
The system SHALL provide a `serializeFrontmatter(metadata, body)` function that produces a markdown string with YAML frontmatter.

#### Scenario: Serialize with metadata
- **WHEN** `serializeFrontmatter({ title: "Test", tags: ["a"] }, "Body")` is called
- **THEN** output SHALL be `---\ntitle: Test\ntags:\n  - a\n---\n\nBody`

### Requirement: Typed frontmatter interfaces
The system SHALL define typed interfaces: `SnippetFrontmatter` (title, tags, created, source, difficulty?, lang), `TldrFrontmatter` (title, tags, created, source), `ProjectFrontmatter` (title, tags, created, source, lang). All interfaces SHALL include `title: string`, `tags: string[]`, `created: string` (ISO date), `source: string`.

#### Scenario: Snippet frontmatter includes all required fields
- **WHEN** a snippet is saved
- **THEN** its frontmatter SHALL include title, tags, created, source, and lang fields
