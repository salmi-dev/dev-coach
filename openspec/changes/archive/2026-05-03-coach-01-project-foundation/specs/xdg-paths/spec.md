## ADDED Requirements

### Requirement: XDG config path resolution

The system SHALL resolve the config directory using `$XDG_CONFIG_HOME/dev-coach/`. If `$XDG_CONFIG_HOME` is not set, it SHALL default to `~/.config/dev-coach/`
on macOS/Linux and `%APPDATA%/dev-coach/` on Windows.

#### Scenario: XDG_CONFIG_HOME is set

- **WHEN** `$XDG_CONFIG_HOME` is set to `/custom/config`
- **THEN** config path resolves to `/custom/config/dev-coach/`

#### Scenario: XDG_CONFIG_HOME is unset on macOS

- **WHEN** `$XDG_CONFIG_HOME` is not set and OS is macOS
- **THEN** config path resolves to `~/.config/dev-coach/`

#### Scenario: XDG_CONFIG_HOME is unset on Windows

- **WHEN** `$XDG_CONFIG_HOME` is not set and OS is Windows
- **THEN** config path resolves to `%APPDATA%/dev-coach/`

### Requirement: XDG data path resolution

The system SHALL resolve the data directory using `$XDG_DATA_HOME/dev-coach/`. If `$XDG_DATA_HOME` is not set, it SHALL default to `~/.local/share/dev-coach/`
on macOS/Linux and `%LOCALAPPDATA%/dev-coach/` on Windows.

#### Scenario: XDG_DATA_HOME is set

- **WHEN** `$XDG_DATA_HOME` is set to `/custom/data`
- **THEN** data path resolves to `/custom/data/dev-coach/`

#### Scenario: XDG_DATA_HOME is unset on Linux

- **WHEN** `$XDG_DATA_HOME` is not set and OS is Linux
- **THEN** data path resolves to `~/.local/share/dev-coach/`

### Requirement: Library path resolution

The system SHALL resolve the library path from config (`library_path` field). If not configured, it SHALL default to `~/dev-coach/`. The path SHALL support `~`
expansion.

#### Scenario: Library path configured

- **WHEN** config contains `library_path: /home/user/my-coach`
- **THEN** library path resolves to `/home/user/my-coach`

#### Scenario: Library path uses tilde

- **WHEN** config contains `library_path: ~/dev-coach`
- **THEN** library path resolves to the user's home directory + `/dev-coach`

#### Scenario: Library path not configured

- **WHEN** config has no `library_path` field
- **THEN** library path defaults to `~/dev-coach/`
