# Coach 04 — Interactive Skills (sandbox, review)

## What

Implement the multi-response skills that involve iterative interaction and produce curated artifacts.

## Scope

### `coach:sandbox` (`src/skills/sandbox.ts`)

```
⧉  coach:sandbox
```

- **Input**: A topic to explore (e.g., "different ways to handle errors in Rust")
- **Flow** (1 question → n responses):
  1. Agent presents first approach with code
  2. Automatically continues with alternative approaches
  3. Highlights trade-offs between each approach
  4. Presents variations (idiomatic, performant, simple)
  5. At end: summary table of all approaches
- **Snippet collection**:
  - Each approach becomes a candidate snippet
  - At end: "Which snippets to save? [all / 1,3,4 / none]"
  - Saved snippets get individual files in `snippets/{lang}/`
  - Or save as single combined snippet if user prefers
- **Session tracking**: log total duration, count of approaches explored
- **Context-aware**: uses profile languages to prioritize examples

### `coach:review` (`src/skills/review.ts`)

```
◉  coach:review
```

- **Input**: Code — either:
  - Pasted directly: `coach review "fn main() { ... }"`
  - File path: `coach review ./src/main.rs`
  - Stdin: `cat main.rs | coach review`
- **Output** — structured review:
  - 🐛 **Bugs**: actual bugs or potential runtime errors
  - 🎨 **Style**: naming, formatting, idiomatic patterns
  - ⚡ **Performance**: inefficiencies, unnecessary allocations
  - 🔒 **Security**: injection, leaks, unsafe patterns
  - 📐 **Architecture**: structure, separation of concerns
  - ✨ **Refactored version**: improved code with comments explaining changes
  - 📊 **Score**: simple rating (e.g., 7/10) with brief rationale
- **Post-response**:
  - "📋 Copy refactored code? [Y/n]"
  - "💾 Save lesson learned as tldr? [Y/n]" (extracts key takeaway)
- **Language detection**: auto-detect from file extension or content
- **Severity levels**: each finding tagged as `info` | `warning` | `error`

### Multi-Response Framework (`src/skills/interactive.ts`)

- Shared utilities for multi-turn skills:
  - Progress indicator between responses
  - Approach numbering (Approach 1/n, 2/n...)
  - Collection/selection prompt at end
  - Batch save with consistent frontmatter

### Pi Skill Definitions

- `src/pi/skills/coach-sandbox/SKILL.md`
- `src/pi/skills/coach-review/SKILL.md`

### Pi Custom Tools

- `src/pi/tools/coach-save.ts` — tool for agent to save snippet/tldr during interaction
- `src/pi/tools/coach-search.ts` — tool for agent to search library during interaction

### CLI Integration

- `coach sandbox "error handling in rust"` — starts sandbox session
- `coach review ./src/main.rs` — reviews a file
- `coach review` (no args) — reads from stdin

## Dependencies

- Requires: `coach-01-project-foundation`
- Requires: `coach-02-storage-layer`
- Requires: `coach-03-simple-skills` (base skill interface, shared patterns)

## Acceptance

- `coach sandbox "sorting algorithms in python"` → explores 3-5 approaches → save prompt
- `coach review ./broken.ts` → structured review with all sections
- `cat broken.ts | coach review` → same via stdin
- File path and stdin input both work for review
- Batch snippet save works (select multiple)
- Pi skills trigger multi-response flows correctly
- Sessions logged with approach count
