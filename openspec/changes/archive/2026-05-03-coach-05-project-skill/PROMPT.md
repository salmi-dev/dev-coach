# Coach 05 — Project Skill

## What
Implement `coach:project`, the most complex skill — multi-turn conversation that produces a complete mini-project scaffold.

## Scope

### `coach:project` (`src/skills/project.ts`)
```
 ⚙  coach:project
```

#### Phase 1 — Requirements Gathering (n questions)
- **Input**: Initial project idea (e.g., "CLI that converts CSV to JSON")
- **Clarification loop**:
  - Agent asks targeted questions to scope the project
  - "What input format? Any edge cases? CLI args or stdin? Output format?"
  - Questions adapt based on project type (CLI, API, script, library)
  - User can say "that's enough" to skip to building
  - Max ~5 clarification rounds, then proceed
- **Output of phase 1**: internal project brief (not saved, used by phase 2)

#### Phase 2 — Project Plan
- Agent presents:
  - Project name (slug)
  - File structure tree (ASCII art)
  - Key files and their purpose
  - Dependencies needed
  - How to run
- User confirms or adjusts: "looks good" / "add tests" / "use X instead of Y"

#### Phase 3 — Implementation
- Creates project directory: `{library}/projects/{name}/`
- Generates files one by one:
  - `README.md` — purpose, how to run, what you learn, tech used
  - Source files — actual working code
  - Config files — `deno.json`, `package.json`, etc.
  - Test files if applicable
  - `.gitignore`
- Progress indicator: "Creating file 3/7: src/parser.ts"

#### Phase 4 — Wrap-up
- Summary of what was created
- "Run it with: `deno task start` (or equivalent)"
- Auto-registers project in DB (`items` table, type=project)
- Updates `library/README.md` dashboard
- Session logged with full duration

### Project Templates (`src/skills/project-templates.ts`)
- Predefined templates for common project types:
  - **cli** — Deno/Node CLI app skeleton
  - **api** — REST API skeleton
  - **script** — Single-file utility script
  - **library** — Publishable library skeleton
- Templates provide base structure, agent customizes from there
- User can skip templates: "from scratch"

### Project README Format
```markdown
---
title: CSV to JSON Converter
tags: [cli, csv, json, deno]
created: 2026-04-30
source: coach:project
lang: typescript
---

# CSV to JSON Converter

> Built with Dev Coach 🎓

## What it does
Converts CSV files to JSON with support for...

## How to run
\`\`\`bash
deno task start input.csv
\`\`\`

## What you learned
- File I/O in Deno
- Streaming parsers
- CLI argument handling

## Structure
\`\`\`
csv-to-json/
├── README.md
├── deno.json
├── main.ts
├── src/
│   ├── parser.ts
│   └── formatter.ts
└── tests/
    └── parser_test.ts
\`\`\`
```

### Pi Skill Definition
- `src/pi/skills/coach-project/SKILL.md`
- Multi-turn: agent manages the conversation phases
- Uses `coach-save` tool to write files

## Dependencies
- Requires: `coach-01-project-foundation`
- Requires: `coach-02-storage-layer`
- Requires: `coach-03-simple-skills` (base skill interface)

## Acceptance
- `coach project "csv to json converter"` → clarification → plan → implementation
- Produces runnable project in `~/dev-coach/projects/csv-to-json/`
- `deno task start` (or equivalent) actually works in generated project
- README includes all sections
- Project indexed in DB and appears in dashboard
- Phase transitions are clear to user
- Can skip clarification with "just build it"
- Templates work for cli, api, script types
