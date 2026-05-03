## ADDED Requirements

### Requirement: Config file format and location
The system SHALL store configuration in YAML format at `{config_dir}/config.yaml`. The config file SHALL be human-readable and support comments.

#### Scenario: Config file location
- **WHEN** the config directory is `~/.config/dev-coach/`
- **THEN** the config file is at `~/.config/dev-coach/config.yaml`

### Requirement: Config schema fields
The config SHALL support the following fields with types and defaults:
- `library_path` (string, default: `~/dev-coach`)
- `primary_languages` (string array, default: `[]`)
- `frameworks` (string array, default: `[]`)
- `response_style` (enum: `concise` | `detailed` | `examples-first`, default: `concise`)
- `os` (string, auto-detected, not user-editable)

#### Scenario: Valid config with all fields
- **WHEN** config YAML contains all fields with valid values
- **THEN** the system SHALL load and return a typed config object with all fields populated

#### Scenario: Partial config with missing fields
- **WHEN** config YAML is missing optional fields
- **THEN** the system SHALL merge defaults for missing fields and return a complete config object

#### Scenario: Invalid response_style value
- **WHEN** config contains `response_style: verbose`
- **THEN** the system SHALL reject the config with a validation error naming the invalid field

### Requirement: Config load and save
The system SHALL provide `loadConfig()` and `saveConfig()` functions. `loadConfig()` SHALL return defaults if no config file exists. `saveConfig()` SHALL create parent directories if needed.

#### Scenario: Load config when file exists
- **WHEN** a valid config file exists at the config path
- **THEN** `loadConfig()` returns the parsed and validated config

#### Scenario: Load config when no file exists
- **WHEN** no config file exists
- **THEN** `loadConfig()` returns the default config object without error

#### Scenario: Save config creates directories
- **WHEN** `saveConfig()` is called and the config directory does not exist
- **THEN** the system SHALL create the directory and write the config file
