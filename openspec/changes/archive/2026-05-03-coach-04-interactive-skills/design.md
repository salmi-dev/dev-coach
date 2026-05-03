## Context

Changes 01–03 established: Deno CLI, config/DB/XDG, storage layer (CRUD, search, session logging, frontmatter, dashboard, save prompts), and three 1→1 skills
(ask, explain, compare) with the base `Skill` interface, `SessionContext`, `SkillResult`, and `runSkill()` runner.

This change adds two multi-response skills that produce multiple outputs per session. The sandbox explores a topic with n approaches, then lets the user
batch-select which to save. The review skill reads code from file/stdin/paste and produces structured feedback across 6 categories.

## Goals / Non-Goals

**Goals:**

- Shared multi-response framework reusable by sandbox, review, and future skills (project)
- Sandbox skill that structures topic exploration into numbered approaches with summary
- Review skill that accepts code from file path, stdin, or direct paste with language auto-detection
- Batch save — select which approaches/snippets to save from a numbered list
- Pi custom tools for agents to save and search during interactions

**Non-Goals:**

- Actual AI inference — skills format prompts and structure output
- Full project scaffolding (change 05)
- Stats dashboard (change 06)

## Decisions

### 1. Interactive framework — approach collector pattern

**Choice**: An `ApproachCollector` class that accumulates numbered approaches, each with title, content, lang, and tags. At end, provides `selectAndSave()` for
batch selection.

**Alternatives considered**:

- Save each approach immediately: no curation, user gets everything
- Single combined output: loses individual snippet granularity

**Rationale**: Users want to curate — keep the good approaches, skip the obvious ones. Collecting first, saving selectively gives the best UX.

### 2. Review input — file path > stdin > direct paste

**Choice**: Priority order: (1) if arg looks like a file path and exists, read it; (2) if stdin is not a TTY, read from stdin; (3) treat arg as inline code.

**Rationale**: Most natural usage patterns: `coach review ./file.rs`, `cat file | coach review`, or `coach review "code here"`.

### 3. Language auto-detection — extension + heuristic

**Choice**: For file input, detect from extension (`.rs` → rust, `.ts` → typescript, etc.). For stdin/paste, use simple keyword heuristics (fn/let/impl → rust,
def/import → python, etc.).

**Rationale**: Good enough for a coaching tool. No need for tree-sitter or AST parsing.

### 4. Review severity levels — simple enum

**Choice**: Each finding tagged as `info`, `warning`, or `error`. Displayed with emoji: ℹ️, ⚠️, 🔴.

**Rationale**: Three levels cover the range without overcomplicating. Users scan for 🔴 first.

### 5. Pi custom tools — thin wrappers around storage layer

**Choice**: `coach-save` and `coach-search` are TypeScript functions that wrap `saveItem()` and `search()` from the storage layer, formatted as pi tool
definitions.

**Rationale**: Agents need programmatic access to save and search during multi-turn interactions. Thin wrappers avoid duplication.

## Risks / Trade-offs

- **[Risk] Stdin detection may fail in some terminal emulators** → Mitigation: fall back to treating input as code string.
- **[Trade-off] Batch selection UX is text-based** → Acceptable: consistent with rest of CLI. "all / 1,3,4 / none" is intuitive.
- **[Trade-off] Language heuristic may misdetect** → Acceptable: user can correct; it's a suggestion not a gate.
