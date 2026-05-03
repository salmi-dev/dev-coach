## ADDED Requirements

### Requirement: Project 4-phase flow
The `coach:project` skill SHALL implement 4 phases: (1) Clarify — gather requirements via targeted questions, (2) Plan — present file structure and descriptions, (3) Implement — generate files with progress, (4) Wrap-up — summarize, register in DB, update dashboard.

#### Scenario: Full flow from idea to project
- **WHEN** user runs `coach project "csv to json converter"`
- **THEN** the skill SHALL proceed through all 4 phases, producing a runnable project in `{library}/projects/{slug}/`

### Requirement: Phase 1 — Requirements clarification
The clarify phase SHALL ask targeted questions based on the project idea (input format, output format, CLI args, edge cases). The user can answer or say "just build it" to skip to planning. Max 5 clarification rounds.

#### Scenario: User answers questions
- **WHEN** the agent asks "What input format?" and user answers "CSV with headers"
- **THEN** the agent SHALL incorporate the answer into the project brief

#### Scenario: User skips clarification
- **WHEN** user says "just build it"
- **THEN** the skill SHALL skip remaining questions and proceed to Phase 2 with reasonable defaults

#### Scenario: Max rounds reached
- **WHEN** 5 clarification rounds have been asked
- **THEN** the skill SHALL proceed to Phase 2 automatically

### Requirement: Phase 2 — Project plan presentation
The plan phase SHALL present: project name (slug), file structure as ASCII tree, key files with brief descriptions, dependencies needed, and how to run. User confirms or requests changes.

#### Scenario: User approves plan
- **WHEN** user says "looks good"
- **THEN** the skill SHALL proceed to Phase 3

#### Scenario: User requests changes
- **WHEN** user says "add tests" or "use oak instead of hono"
- **THEN** the skill SHALL update the plan and re-present

### Requirement: Phase 3 — File generation with progress
The implement phase SHALL create the project directory and generate files one by one, printing progress ("Creating file 3/7: src/parser.ts"). Files include: README.md, source files, config files (deno.json etc.), optional test files, and .gitignore.

#### Scenario: Files generated with progress
- **WHEN** a project with 5 files is being generated
- **THEN** the skill SHALL print "Creating file 1/5...", "Creating file 2/5...", etc.

#### Scenario: Project directory created
- **WHEN** Phase 3 begins for project "csv-to-json"
- **THEN** directory `{library}/projects/csv-to-json/` SHALL be created

### Requirement: Phase 4 — Wrap-up and registration
The wrap-up phase SHALL: print a summary of created files, show the run command, register the project in the DB (`items` table, type=project), update the library dashboard, and log the session.

#### Scenario: Project registered in DB
- **WHEN** Phase 4 completes
- **THEN** the project SHALL appear in `items` table with type="project" and in the dashboard README

### Requirement: Project README format
Every project's README.md SHALL include: YAML frontmatter (title, tags, created, source, lang), "What it does" section, "How to run" section with code block, "What you learned" section, and "Structure" section with ASCII tree.

#### Scenario: README includes all sections
- **WHEN** a project is generated
- **THEN** README.md SHALL contain frontmatter + all 4 content sections

### Requirement: Session logging
The project skill SHALL log a session with mode="project", detected language, project name in tags, and total duration.

#### Scenario: Session logged
- **WHEN** a project generation completes
- **THEN** the session SHALL be logged with mode="project" and duration
