## ADDED Requirements

### Requirement: Explain structured output
The `coach:explain` skill SHALL produce a response with 5 structured sections: (1) One-liner — ELI5, (2) Core Concept — 1 paragraph, (3) How It Works — with ASCII diagram if applicable, (4) Example — working code in user's preferred language, (5) Gotchas — common mistakes.

#### Scenario: Full explanation structure
- **WHEN** user runs `coach explain "closures in rust"`
- **THEN** the response SHALL contain all 5 sections with clear headers

### Requirement: Explain cross-references
The explain skill SHALL search the user's library for related items (by tags derived from the concept) and include a "Related" section listing matching snippets/tldrs with their paths.

#### Scenario: Related items found
- **WHEN** explaining "JSON parsing" and a snippet tagged "json" exists in the library
- **THEN** the "Related" section SHALL list that snippet with its title and path

#### Scenario: No related items
- **WHEN** explaining a topic with no matching library items
- **THEN** the "Related" section SHALL say "No related items in your library yet."

### Requirement: Explain save as TLDR
The explain skill SHALL suggest saving the response as a TLDR with a title derived from the concept.

#### Scenario: Save suggestion
- **WHEN** user explains "event loop"
- **THEN** suggestedTitle SHALL be "Event Loop" and suggestedType SHALL be "tldr"
