## Why

Changes 01–04 delivered the foundation, storage, simple skills, and interactive skills. The project skill is the crown jewel of the coaching experience — it
guides users through building a complete mini-project from idea to working code. Unlike the other skills (single-response or multi-response), this is a true
multi-turn conversation with 4 distinct phases: requirements gathering, planning, implementation, and wrap-up. This skill turns Dev Coach from a Q&A tool into a
hands-on learning companion.

## What Changes

- **`coach:project` skill** — 4-phase multi-turn skill: clarify → plan → implement → wrap-up, producing a complete project scaffold in
  `{library}/projects/{name}/`
- **Project templates** — Predefined skeletons for common project types (CLI, API, script, library) that the agent customizes
- **Project README format** — Standardized README with frontmatter, "What it does", "How to run", "What you learned", and structure tree
- **Pi skill definition** — SKILL.md describing the multi-phase conversation flow
- **CLI router update** — Replace project stub with real handler

## Capabilities

### New Capabilities

- `skill-project`: Multi-turn project builder — 4-phase flow (clarify, plan, implement, wrap-up), project directory creation, file generation with progress, DB
  registration, dashboard update
- `project-templates`: Predefined project skeletons for CLI, API, script, and library types with customizable structure

### Modified Capabilities

(none)

## Impact

- **New files**: `src/skills/project.ts`, `src/skills/project-templates.ts`, `src/pi/skills/coach-project/SKILL.md`
- **Modified files**: `src/cli/router.ts` (replace project stub)
- **Filesystem**: Creates project directories under `{library}/projects/{name}/` with README, source files, config files
- **Database**: Registers project as item (type=project) in `items` table
