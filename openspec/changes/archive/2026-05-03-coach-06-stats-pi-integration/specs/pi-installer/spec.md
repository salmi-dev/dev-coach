## ADDED Requirements

### Requirement: Install pi skills
`coach install-pi` SHALL detect the skill directory by checking for `.pi/skills/`, `.codex/skills/`, `.github/skills/` in the current directory (in that order). If none exist, it SHALL create `.pi/skills/`. It SHALL copy all 7 SKILL.md files and tool definitions into the detected directory.

#### Scenario: Install into .pi/skills/
- **WHEN** user runs `coach install-pi` in a directory with `.pi/`
- **THEN** SKILL.md files SHALL be copied to `.pi/skills/coach-{ask,explain,compare,sandbox,review,project,stats}/`

#### Scenario: Install creates .pi/skills/ if none exist
- **WHEN** no skill directory exists
- **THEN** `.pi/skills/` SHALL be created and populated

#### Scenario: Install with --dir override
- **WHEN** user runs `coach install-pi --dir ./custom/skills`
- **THEN** SKILL.md files SHALL be copied to `./custom/skills/`

### Requirement: Uninstall pi skills
`coach uninstall-pi` SHALL remove the coach skill directories from the detected (or specified) skill directory.

#### Scenario: Uninstall removes skills
- **WHEN** user runs `coach uninstall-pi`
- **THEN** all `coach-*` directories SHALL be removed from the skill directory

### Requirement: Install confirmation
After installing, the command SHALL print a confirmation listing all installed skills and available tools.

#### Scenario: Install confirmation output
- **WHEN** `coach install-pi` completes
- **THEN** output SHALL list 7 skills and 4 tools with brief descriptions
