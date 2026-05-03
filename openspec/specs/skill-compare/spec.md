## ADDED Requirements

### Requirement: Compare structured output
The `coach:compare` skill SHALL produce a response with: (1) an ASCII comparison table with relevant dimensions, (2) a verdict/recommendation, (3) code examples for each approach where applicable.

#### Scenario: Two-item comparison
- **WHEN** user runs `coach compare "mutex vs rwlock in Rust"`
- **THEN** the response SHALL contain a table comparing mutex and rwlock across dimensions like speed, complexity, use-case, plus a verdict

#### Scenario: Multi-item comparison
- **WHEN** user runs `coach compare "REST vs GraphQL vs gRPC"`
- **THEN** the response SHALL contain a table with 3 columns

### Requirement: Compare input parsing
The compare skill SHALL parse the input to extract the items being compared. It SHALL recognize patterns like "X vs Y", "X versus Y", "X or Y", "X compared to Y".

#### Scenario: Parse "vs" pattern
- **WHEN** input is "mutex vs rwlock in Rust"
- **THEN** the skill SHALL identify items ["mutex", "rwlock"] and context "Rust"

#### Scenario: Parse "or" pattern
- **WHEN** input is "REST or GraphQL for mobile"
- **THEN** the skill SHALL identify items ["REST", "GraphQL"] and context "mobile"

### Requirement: Compare save as snippet
The compare skill SHALL suggest saving the comparison as a snippet with suggestedType="snippet" and tags derived from the compared items.

#### Scenario: Save suggestion
- **WHEN** comparing "mutex vs rwlock"
- **THEN** suggestedTitle SHALL be "Mutex vs RwLock" and tags SHALL include the compared items
