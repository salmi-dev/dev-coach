# Coach 03 — Simple Skills (ask, explain, compare)

## What

Implement the three 1-question → 1-response skills that share the same interaction pattern.

## Scope

### Skill Architecture (`src/skills/base.ts`)

- Base skill interface that all skills implement:
  ```typescript
  interface Skill {
    id: string;
    icon: string; // ASCII art icon
    name: string;
    run(input: string, context: SessionContext): Promise<SkillResult>;
  }
  ```
- `SessionContext` carries: config, db, library manager, profile data
- `SkillResult` carries: response text, suggested saves, detected lang/tags

### `coach:ask` (`src/skills/ask.ts`)

```
╺━╸  coach:ask
```

- **Input**: Single question from user
- **Output**: Concise answer, respects `response_style` from config
- **Post-response**:
  - If response contains a command → "📋 Copy command? [Y/n]"
  - Always → "💾 Save as tldr? [Y/n]" (with suggested title)
- **Context awareness**: reads `profile` for language preferences, adapts examples
- **Logs**: session with detected lang + tags

### `coach:explain` (`src/skills/explain.ts`)

```
📖  coach:explain
```

- **Input**: A concept to explain
- **Output** — structured layers:
  1. **One-liner** — ELI5 summary
  2. **Core concept** — 1 paragraph explanation
  3. **How it works** — with ASCII diagram if applicable
  4. **Example** — working code in user's preferred language
  5. **Gotchas** — common mistakes/misconceptions
  6. **Related** — cross-reference existing snippets/tldrs from library (search by tags)
- **Post-response**: "💾 Save as tldr? [Y/n]"
- **Logs**: session

### `coach:compare` (`src/skills/compare.ts`)

```
⚖  coach:compare
```

- **Input**: Two or more things to compare (e.g., "mutex vs rwlock in Rust")
- **Output** — structured comparison:
  - ASCII table with dimensions (speed, memory, readability, use-case, etc.)
  - Verdict / recommendation
  - Code examples for each approach
- **Post-response**: "💾 Save comparison as snippet? [Y/n]"
- **Logs**: session

### Pi Skill Definitions

- `src/pi/skills/coach-ask/SKILL.md` — pi skill that triggers `coach ask`
- `src/pi/skills/coach-explain/SKILL.md` — pi skill that triggers `coach explain`
- `src/pi/skills/coach-compare/SKILL.md` — pi skill that triggers `coach compare`
- Each SKILL.md describes trigger, input expectations, available tools

### CLI Integration

- Replace stubs from change 01 with real implementations
- `coach ask "how do I ..."` — runs ask skill
- `coach explain "closures in rust"` — runs explain skill
- `coach compare "mutex vs rwlock"` — runs compare skill

## Dependencies

- Requires: `coach-01-project-foundation` (CLI, config, db, utils)
- Requires: `coach-02-storage-layer` (save prompt, library, search, session logging)

## Acceptance

- `coach ask "how to reverse a list in python"` → answer + save/copy prompts
- `coach explain "event loop"` → 5-layer structured explanation
- `coach compare "REST vs GraphQL"` → ASCII table + verdict
- Cross-references work in explain (finds related library items)
- Sessions logged to DB
- Clipboard copy works on macOS
- Pi skills trigger correctly from agent
