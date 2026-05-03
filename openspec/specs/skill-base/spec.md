## ADDED Requirements

### Requirement: Skill interface

The system SHALL define a `Skill` interface with properties: `id` (string), `icon` (string from SKILL_ICONS), `name` (string, display name), and method
`run(input: string, context: SessionContext): Promise<SkillResult>`.

#### Scenario: Skill implements interface

- **WHEN** a new skill is created
- **THEN** it SHALL implement the `Skill` interface with all required properties and the `run` method

### Requirement: SessionContext type

The system SHALL define a `SessionContext` type carrying: `db` (Database), `config` (CoachConfig), `libraryPath` (string), and `searchLibrary(filters)`
convenience function.

#### Scenario: Context created in CLI router

- **WHEN** the CLI router handles a skill subcommand
- **THEN** it SHALL create a `SessionContext` with loaded config, opened DB, resolved library path, and bound search function

### Requirement: SkillResult type

The system SHALL define a `SkillResult` type with: `response` (string — the formatted output), `lang` (optional string), `tags` (optional string array),
`suggestedTitle` (optional string), `suggestedType` (optional ItemType — snippet or tldr).

#### Scenario: Skill returns result

- **WHEN** a skill's `run()` completes
- **THEN** it SHALL return a `SkillResult` with at least the `response` field populated

### Requirement: Skill runner

The system SHALL provide a `runSkill(skill, input, context)` function that: prints the skill's response, detects commands for clipboard copy, triggers save
prompt if the skill suggests saving, logs the session, and returns.

#### Scenario: Runner handles full flow

- **WHEN** `runSkill()` is called with a skill result that has suggestedTitle and suggestedType
- **THEN** it SHALL print the response, offer save prompt, log the session to DB, and return

#### Scenario: Runner detects commands for clipboard

- **WHEN** the response contains a code block or line starting with `$`
- **THEN** the runner SHALL offer "📋 Copy command? [Y/n]"
