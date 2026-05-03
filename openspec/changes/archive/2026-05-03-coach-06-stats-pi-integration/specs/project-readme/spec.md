## ADDED Requirements

### Requirement: Project README at repo root

The system SHALL include a `README.md` at the project root with: project title with ASCII art, description, installation instructions (JSR + deno install +
manual), all 7 skills with brief descriptions and usage examples, configuration reference (config.yaml fields), pi integration guide (`coach install-pi`), and
license section.

#### Scenario: README is complete

- **WHEN** the README is read
- **THEN** it SHALL contain installation, all 7 skills, config reference, and pi guide sections

### Requirement: Installation instructions

The README SHALL document 3 installation methods: (1) `deno install -g jsr:@ssal/dev-coach`, (2) `deno install -g` from source, (3) `deno task install` for
development.

#### Scenario: JSR install instruction

- **WHEN** user follows the JSR install command
- **THEN** the `coach` command SHALL be available globally

### Requirement: Skill reference

Each of the 7 skills SHALL be documented in the README with: skill name, icon, one-line description, usage example, and expected output format.

#### Scenario: Ask skill documented

- **WHEN** user reads the ask skill section
- **THEN** it SHALL show `coach ask "question"` with example output description
