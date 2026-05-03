## ADDED Requirements

### Requirement: Review input sources
The `coach:review` skill SHALL accept code from three sources in priority order: (1) file path — if the argument is a path to an existing file, read it; (2) stdin — if stdin is not a TTY, read piped input; (3) direct paste — treat the argument as inline code.

#### Scenario: Review from file path
- **WHEN** user runs `coach review ./src/main.rs` and the file exists
- **THEN** the skill SHALL read the file contents and detect language from extension

#### Scenario: Review from stdin
- **WHEN** user runs `cat main.rs | coach review`
- **THEN** the skill SHALL read from stdin

#### Scenario: Review from inline code
- **WHEN** user runs `coach review "fn main() { println!(\"hello\"); }"`
- **THEN** the skill SHALL use the argument as code

### Requirement: Language auto-detection
The review skill SHALL auto-detect the programming language. For file input, detect from file extension. For stdin/paste, use keyword heuristics.

#### Scenario: Detect from extension
- **WHEN** input file is `main.rs`
- **THEN** language SHALL be detected as "rust"

#### Scenario: Detect from keywords
- **WHEN** code contains `def` and `import` without file extension
- **THEN** language SHALL be detected as "python"

### Requirement: Structured review output
The review skill SHALL produce output with 7 sections: (1) 🐛 Bugs, (2) 🎨 Style, (3) ⚡ Performance, (4) 🔒 Security, (5) 📐 Architecture, (6) ✨ Refactored Version, (7) 📊 Score (X/10 with rationale). Each finding in sections 1-5 SHALL include a severity level: ℹ️ info, ⚠️ warning, or 🔴 error.

#### Scenario: Full review output
- **WHEN** code is reviewed
- **THEN** the output SHALL contain all 7 sections with appropriate headers and emoji

### Requirement: Review post-response actions
After the review, the skill SHALL offer: (1) "📋 Copy refactored code? [Y/n]" for the refactored version, (2) "💾 Save lesson learned as tldr? [Y/n]" extracting the key takeaway.

#### Scenario: Copy refactored code
- **WHEN** user answers "y" to copy prompt
- **THEN** the refactored code section SHALL be copied to clipboard

#### Scenario: Save lesson learned
- **WHEN** user answers "y" to save prompt
- **THEN** a tldr SHALL be saved with the key takeaway from the review
