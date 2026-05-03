## Context

Changes 01 and 02 delivered the foundation: Deno CLI with config/DB/XDG paths, and a storage layer with CRUD, search, session logging, frontmatter, dashboard, and save prompts. The CLI router dispatches subcommands but all skill commands are stubs. This change implements the three simplest skills (ask, explain, compare) that follow a 1-question → 1-response pattern, establishing the skill architecture for future skills.

**Important**: These skills are CLI tools that *prepare* the user's input and *process* the response. The actual AI generation happens outside — the user runs `coach ask "question"` and the skill formats the prompt, then presents the response with save/copy options. In a pi agent context, the agent IS the AI — the skill definitions tell the agent how to structure its output.

## Goals / Non-Goals

**Goals:**
- Define a base skill interface that all 7 skills will implement
- Implement ask, explain, compare with structured output formats
- Integrate with storage layer (save prompt, session logging, search for cross-references)
- Create pi skill definitions so these work from within agents
- Replace CLI stubs with real handlers

**Non-Goals:**
- Multi-turn conversation (that's changes 04–05)
- Stats or dashboard skill (change 06)
- Embedding an LLM — these skills are prompt templates + output processors

## Decisions

### 1. Skills as prompt formatters + output processors

**Choice**: Each skill is a module that: (a) formats the user's input into a structured prompt, (b) prints the structured output, and (c) handles post-response actions (save, copy, log).

In CLI mode, the skill outputs a formatted prompt to stdout and reads the AI response from stdin (or the user just reads the formatted output and interacts). In pi agent mode, the SKILL.md tells the agent how to format its response.

**Rationale**: This is a coaching tool, not an AI wrapper. The AI interaction happens at the agent level (pi) or via copy-paste. The skills provide structure and persistence.

### 2. SessionContext — shared context object

**Choice**: A `SessionContext` object passed to every skill containing: `db`, `config`, `libraryPath`, and a `search()` convenience function.

**Rationale**: Avoids each skill re-loading config and opening DB. Created once in the CLI router and passed through.

### 3. SkillResult — structured return

**Choice**: Skills return `{ response, lang?, tags?, suggestedTitle?, suggestedType? }` which the runner uses to trigger save prompts and session logging.

**Rationale**: Decouples skill logic from I/O. The skill produces content; the runner handles persistence.

### 4. Command detection for clipboard — regex-based

**Choice**: Detect code blocks and single-line commands via regex patterns (backtick fences, lines starting with `$`). When detected, offer clipboard copy.

**Rationale**: Simple heuristic, good enough for a coaching tool. No need for AST parsing.

### 5. Pi skills as SKILL.md instruction files

**Choice**: Each pi skill is a `SKILL.md` that tells the agent: what this skill does, expected input format, how to structure output, and what tools to use (coach-save, coach-copy, coach-log).

**Rationale**: Pi skills are prompt instructions, not code. The agent reads SKILL.md and follows the pattern.

## Risks / Trade-offs

- **[Risk] Output formatting depends on terminal width** → Mitigation: Use conservative widths (80 chars); ASCII tables adapt.
- **[Trade-off] No embedded AI** → Acceptable: this is by design. Skills structure prompts and handle persistence, not inference.
- **[Trade-off] explain cross-references may return nothing early on** → Acceptable: "Related" section gracefully shows "No related items in library yet."
