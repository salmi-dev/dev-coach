## ADDED Requirements

### Requirement: Predefined project templates

The system SHALL provide predefined templates for 4 project types: `cli` (CLI app), `api` (REST API), `script` (single-file utility), `library` (publishable
library). Each template defines a base file list, directory structure, and default config.

#### Scenario: CLI template

- **WHEN** project type is "cli"
- **THEN** the template SHALL include: `deno.json` with start task, `main.ts` entry point, `src/` directory, optional `tests/`

#### Scenario: API template

- **WHEN** project type is "api"
- **THEN** the template SHALL include: `deno.json`, `main.ts` with server setup, `src/routes/`, `src/handlers/`

#### Scenario: Script template

- **WHEN** project type is "script"
- **THEN** the template SHALL include: a single `main.ts` file and optional `deno.json`

#### Scenario: Library template

- **WHEN** project type is "library"
- **THEN** the template SHALL include: `deno.json` with publish config, `mod.ts` entry, `src/`, `tests/`

### Requirement: Template type detection

The system SHALL infer the project type from the user's description. Keywords like "CLI", "command", "tool" suggest cli; "API", "server", "REST" suggest api;
"script", "utility", "convert" suggest script; "library", "package", "module" suggest library.

#### Scenario: Detect CLI type

- **WHEN** user describes "a CLI tool that converts CSV to JSON"
- **THEN** the detected type SHALL be "cli"

#### Scenario: Detect API type

- **WHEN** user describes "a REST API for managing todos"
- **THEN** the detected type SHALL be "api"

### Requirement: Skip templates

The user SHALL be able to say "from scratch" to skip template detection and start with an empty project directory containing only README.md.

#### Scenario: From scratch

- **WHEN** user requests "from scratch" during planning
- **THEN** the template SHALL be skipped and only README.md SHALL be pre-created

### Requirement: Template customization

Templates SHALL serve as a starting point. The agent MAY add, remove, or modify files based on clarified requirements. Templates are not rigid.

#### Scenario: Template extended

- **WHEN** user requests "add a database module" for a CLI project
- **THEN** the agent SHALL add `src/db.ts` beyond what the CLI template defines
