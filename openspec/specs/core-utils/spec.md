## ADDED Requirements

### Requirement: OS-aware clipboard copy
The system SHALL provide a `copyToClipboard(text: string)` function that copies text to the system clipboard using the appropriate OS command: `pbcopy` on macOS, `xclip -selection clipboard` or `xsel --clipboard` on X11 Linux, `wl-copy` on Wayland Linux, and `clip` on Windows.

#### Scenario: Copy on macOS
- **WHEN** `copyToClipboard("hello")` is called on macOS
- **THEN** the system SHALL pipe "hello" to `pbcopy` and return `true`

#### Scenario: Copy on Linux with xclip
- **WHEN** `copyToClipboard("hello")` is called on Linux with `xclip` available
- **THEN** the system SHALL pipe "hello" to `xclip -selection clipboard` and return `true`

#### Scenario: No clipboard tool available
- **WHEN** `copyToClipboard("hello")` is called and no clipboard tool is found
- **THEN** the system SHALL return `false` without throwing an error

### Requirement: Clipboard tool detection
The system SHALL provide a `detectClipboardTool()` function that returns the name of the available clipboard tool or `null` if none is found. Detection order: `pbcopy` (macOS) → `wl-copy` (Wayland) → `xclip` (X11) → `xsel` (X11) → `clip` (Windows).

#### Scenario: Detect pbcopy on macOS
- **WHEN** `detectClipboardTool()` is called on macOS
- **THEN** the system SHALL return `"pbcopy"`

### Requirement: ASCII art box rendering
The system SHALL provide a `renderBox(title: string, lines: string[])` function that renders a bordered ASCII box with a title and content lines using Unicode box-drawing characters (─ │ ┌ ┐ └ ┘ ├ ┤).

#### Scenario: Render a simple box
- **WHEN** `renderBox("Title", ["Line 1", "Line 2"])` is called
- **THEN** the output SHALL be a box with border, title on top, and content lines inside

### Requirement: Skill mode icons
The system SHALL export ASCII art icon constants for each skill mode: `ask` (╺━╸), `sandbox` (⧉), `project` (⚙), `review` (◉), `stats` (📊), `explain` (📖), `compare` (⚖).

#### Scenario: Access skill icon
- **WHEN** `SKILL_ICONS.ask` is accessed
- **THEN** it SHALL return the string `"╺━╸"`

### Requirement: Platform detection
The system SHALL provide functions: `getOS()` returning `"macos" | "linux" | "windows"`, `getHomeDir()` returning the user's home directory, and `isInteractive()` returning whether stdin is a TTY.

#### Scenario: Detect macOS
- **WHEN** `getOS()` is called on macOS
- **THEN** it SHALL return `"macos"`

#### Scenario: Detect home directory
- **WHEN** `getHomeDir()` is called
- **THEN** it SHALL return the value of `$HOME` (or `%USERPROFILE%` on Windows)

#### Scenario: Detect non-interactive mode
- **WHEN** `isInteractive()` is called with stdin piped
- **THEN** it SHALL return `false`
