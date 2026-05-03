## MODIFIED Requirements

### Requirement: OS-aware clipboard copy

The system SHALL provide a `copyToClipboard(text: string)` function that copies text to the system clipboard using the appropriate OS command: `pbcopy` on
macOS, `xclip -selection clipboard` or `xsel --clipboard` on X11 Linux, `wl-copy` on Wayland Linux, and `clip` on Windows. Process execution SHALL go through
the runtime adapter (`runtime.runCommand`) rather than `Deno.Command` directly so the function works on Deno, Bun, and Node.

#### Scenario: Copy on macOS

- **WHEN** `copyToClipboard("hello")` is called on macOS (any supported runtime)
- **THEN** the system SHALL pipe "hello" to `pbcopy` via `runtime.runCommand` and return `true`

#### Scenario: Copy on Linux with xclip

- **WHEN** `copyToClipboard("hello")` is called on Linux with `xclip` available
- **THEN** the system SHALL pipe "hello" to `xclip -selection clipboard` and return `true`

#### Scenario: No clipboard tool available

- **WHEN** `copyToClipboard("hello")` is called and no clipboard tool is found
- **THEN** the system SHALL return `false` without throwing an error

### Requirement: Platform detection

The system SHALL provide functions: `getOS()` returning `"macos" | "linux" | "windows"`, `getHomeDir()` returning the user's home directory, and
`isInteractive()` returning whether stdin is a TTY. These helpers SHALL be implemented on top of the runtime adapter (`runtime.osPlatform()`,
`runtime.homedir()`, `runtime.stdin.isTerminal()`) and SHALL behave identically on Deno, Bun, and Node.

#### Scenario: Detect macOS

- **WHEN** `getOS()` is called on macOS (Deno / Bun / Node)
- **THEN** it SHALL return `"macos"`

#### Scenario: Detect home directory

- **WHEN** `getHomeDir()` is called
- **THEN** it SHALL return the value of `$HOME` (or `%USERPROFILE%` on Windows), regardless of the host runtime

#### Scenario: Detect non-interactive mode

- **WHEN** `isInteractive()` is called with stdin piped
- **THEN** it SHALL return `false` on any supported runtime
