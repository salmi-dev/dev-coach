## Context

Changes 01–04 delivered: Deno CLI foundation, storage layer (CRUD, search, frontmatter, dashboard), simple skills (ask, explain, compare with base Skill
interface, SessionContext, SkillResult, runSkill runner), and interactive skills (ApproachCollector, sandbox, review, pi tools). The project skill is the most
complex — a multi-turn conversation producing a complete directory of files.

## Goals / Non-Goals

**Goals:**

- 4-phase multi-turn flow: clarify requirements → present plan → generate files → wrap up
- Project templates for common types (CLI, API, script, library)
- Produce actual runnable projects with README, source, config, and optional tests
- Register projects in DB and update dashboard
- Pi skill definition that guides agents through the phases

**Non-Goals:**

- Generating complex multi-service architectures
- CI/CD setup or deployment configs
- Package publishing setup (that's the tool itself in change 06)
- Testing that generated projects compile/run in CI — the agent verifies at generation time

## Decisions

### 1. Phase-based conversation model

**Choice**: 4 explicit phases with clear transitions. Each phase has a defined input/output contract:

- Phase 1 (Clarify): input=idea → output=project brief (internal)
- Phase 2 (Plan): input=brief → output=file tree + descriptions (shown to user)
- Phase 3 (Implement): input=approved plan → output=files on disk
- Phase 4 (Wrap-up): input=created files → output=summary + DB registration

**Rationale**: Clear phases make the conversation predictable. Users always know where they are. The agent in pi mode can follow phases explicitly.

### 2. Templates as structured defaults, not rigid scaffolds

**Choice**: Templates define a base file list and directory structure per project type. The agent customizes file contents and can add/remove files based on the
clarified requirements.

**Alternatives considered**:

- Cookiecutter-style templates with variable substitution: too rigid, doesn't adapt
- No templates, always from scratch: slower, inconsistent structure

**Rationale**: Templates give a starting point; the agent's creativity fills in the details. User can say "from scratch" to skip templates.

### 3. File generation with progress indicator

**Choice**: Generate files one at a time, printing "Creating file 3/7: src/parser.ts" for each.

**Rationale**: Gives the user visibility into what's happening. If something fails, they know which file caused it.

### 4. "Just build it" escape hatch

**Choice**: If the user says "just build it" or similar during clarification, skip directly to phase 2 with reasonable defaults.

**Rationale**: Power users don't want 5 rounds of clarification for a simple script.

### 5. Project README as the primary artifact

**Choice**: Every project gets a README.md with frontmatter (for DB indexing), "What it does", "How to run", "What you learned", and an ASCII structure tree.

**Rationale**: The README serves dual purpose: human documentation AND machine-indexable metadata via frontmatter. "What you learned" reinforces the coaching
aspect.

## Risks / Trade-offs

- **[Risk] Generated code may not compile** → Mitigation: agent should verify in pi mode; for CLI mode, user runs and iterates.
- **[Trade-off] Templates are hardcoded** → Acceptable: 4 templates cover most use cases. Can add more later.
- **[Trade-off] Clarification phase is text-based** → Acceptable: consistent with CLI approach; pi agents handle this naturally.
- **[Risk] Large projects may exceed single-session context** → Mitigation: keep projects small (mini-project by design); max ~10 files.
