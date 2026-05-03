## ADDED Requirements

### Requirement: Ask skill input and output

The `coach:ask` skill SHALL accept a single question string as input and produce a concise answer as output. The response style SHALL respect the
`response_style` config setting (concise, detailed, or examples-first).

#### Scenario: Ask with concise style

- **WHEN** user runs `coach ask "how to reverse a list in python"` with response_style=concise
- **THEN** the skill SHALL produce a short, focused answer

#### Scenario: Ask with examples-first style

- **WHEN** user runs `coach ask "how to reverse a list in python"` with response_style=examples-first
- **THEN** the skill SHALL lead with a code example before explanation

### Requirement: Ask command detection

After producing a response, the ask skill SHALL detect if the response contains commands (code blocks or lines starting with `$`). If commands are detected, it
SHALL set suggestedType to enable clipboard copy.

#### Scenario: Response contains a command

- **WHEN** the answer includes `$ git rebase -i HEAD~3`
- **THEN** the skill SHALL flag it for clipboard copy

### Requirement: Ask save as TLDR

The ask skill SHALL always suggest saving the response as a TLDR with suggestedType="tldr" and a suggestedTitle derived from the question.

#### Scenario: Save suggestion

- **WHEN** user asks "how to find large files in git"
- **THEN** suggestedTitle SHALL be something like "Find Large Files in Git"

### Requirement: Ask session logging

The ask skill SHALL detect the primary language from the question/response and return it in `lang` for session logging.

#### Scenario: Language detection

- **WHEN** user asks about Python
- **THEN** `lang` SHALL be "python" in the result
