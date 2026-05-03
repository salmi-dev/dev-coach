---
name: coach-project
description: Multi-turn mini-project builder — from idea to working code. Use when the user wants to build a small project step by step.
---

# coach:project

Multi-turn mini-project builder — from idea to working code.

## Trigger

User wants to build a small project, e.g., "project csv to json converter"

## Input

A project idea/description, e.g., "CLI that converts CSV to JSON"

## 4-Phase Flow

### Phase 1: Clarify

Ask 1-5 targeted questions to scope the project. User can say "just build it" to skip.

### Phase 2: Plan

Present: project name, file structure (ASCII tree), file descriptions, dependencies, run command. User confirms or adjusts.

### Phase 3: Implement

Create project directory at `{library}/projects/{slug}/`. Generate files one by one with progress: "Creating file 3/7: src/parser.ts" Files: README.md, source
files, config, optional tests, .gitignore.

### Phase 4: Wrap-up

Summary, run command, register in DB, update dashboard.

## Project Types (auto-detected)

- **cli**: CLI app (deno.json + main.ts + src/)
- **api**: REST API (deno.json + main.ts + src/routes/ + src/handlers/)
- **script**: Single-file utility (main.ts)
- **library**: Publishable library (deno.json + mod.ts + src/ + tests/)

## README Format

Every project gets README.md with: YAML frontmatter, "What it does", "How to run", "What you learned", "Structure".

## Tools Available

- `coach-save`: Register project in DB
- `coach-log`: Log the session
