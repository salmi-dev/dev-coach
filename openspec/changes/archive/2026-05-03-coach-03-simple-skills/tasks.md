## 1. Skill Base Architecture

- [x] 1.1 Create `src/skills/base.ts` — define `Skill` interface, `SessionContext` type, `SkillResult` type
- [x] 1.2 Implement `createContext(configPath?)` — load config, open DB, resolve library path, bind search function
- [x] 1.3 Implement `runSkill(skill, input, context)` — print response, detect commands for clipboard, trigger save prompt, log session
- [x] 1.4 Implement command detection: regex for code blocks (triple backtick) and shell commands (lines starting with `$`)
- [x] 1.5 Write tests for command detection regex, context creation, SkillResult handling

## 2. Ask Skill

- [x] 2.1 Create `src/skills/ask.ts` — implement `Skill` interface with id="ask", icon from SKILL_ICONS
- [x] 2.2 Implement `run()`: format the question with response_style context, detect language from input, generate suggestedTitle from question
- [x] 2.3 Implement language detection heuristic: scan for language keywords in question (python, rust, javascript, etc.)
- [x] 2.4 Implement title generation: extract key topic from question as title case
- [x] 2.5 Write tests for language detection, title generation, result structure

## 3. Explain Skill

- [x] 3.1 Create `src/skills/explain.ts` — implement `Skill` interface with id="explain"
- [x] 3.2 Implement `run()`: format structured output template with 5 sections (one-liner, core concept, how it works, example, gotchas)
- [x] 3.3 Implement cross-reference lookup: search library by tags derived from concept, format "Related" section
- [x] 3.4 Write tests for output structure validation, cross-reference formatting

## 4. Compare Skill

- [x] 4.1 Create `src/skills/compare.ts` — implement `Skill` interface with id="compare"
- [x] 4.2 Implement input parser: extract compared items from "X vs Y", "X or Y", "X versus Y", "X compared to Y" patterns, plus optional context
- [x] 4.3 Implement `run()`: format comparison prompt with parsed items, set suggestedType="snippet", generate tags from items
- [x] 4.4 Write tests for input parsing (vs, or, versus, multi-item, with context)

## 5. CLI Router Integration

- [x] 5.1 Update `src/cli/router.ts` — replace ask/explain/compare stubs with real handlers using `createContext()` and `runSkill()`
- [x] 5.2 Pass remaining CLI args as skill input (join with space)
- [x] 5.3 Write tests for CLI routing to real skill handlers

## 6. Pi Skill Definitions

- [x] 6.1 Create `src/pi/skills/coach-ask/SKILL.md` — describe trigger, input format, output structure, available tools
- [x] 6.2 Create `src/pi/skills/coach-explain/SKILL.md` — describe 5-layer output format, cross-reference behavior
- [x] 6.3 Create `src/pi/skills/coach-compare/SKILL.md` — describe comparison table format, input parsing

## 7. Integration & Verification

- [x] 7.1 Verify `coach ask "how to reverse a list in python"` runs the ask skill (not stub)
- [x] 7.2 Verify `coach explain "event loop"` produces structured output
- [x] 7.3 Verify `coach compare "REST vs GraphQL"` parses items and produces comparison
- [x] 7.4 Run full test suite: `deno test`
