## 1. Project Templates

- [x] 1.1 Create `src/skills/project-templates.ts` — define `ProjectTemplate` interface (type, files, dirs, config)
- [x] 1.2 Implement CLI template: deno.json with start task, main.ts, src/ directory
- [x] 1.3 Implement API template: deno.json, main.ts with server, src/routes/, src/handlers/
- [x] 1.4 Implement Script template: single main.ts, optional deno.json
- [x] 1.5 Implement Library template: deno.json with publish config, mod.ts, src/, tests/
- [x] 1.6 Implement `detectProjectType(description)` — keyword-based type inference from user description
- [x] 1.7 Write tests for detectProjectType (cli, api, script, library keywords, ambiguous input)

## 2. Project Skill — Phase 1 (Clarify)

- [x] 2.1 Create `src/skills/project.ts` — implement Skill interface with id="project"
- [x] 2.2 Implement clarification question generator — produce targeted questions based on detected project type
- [x] 2.3 Implement "just build it" detection — skip clarification when user signals
- [x] 2.4 Implement project brief builder — collect answers into structured brief object
- [x] 2.5 Implement max-rounds guard — auto-proceed after 5 clarification rounds

## 3. Project Skill — Phase 2 (Plan)

- [x] 3.1 Implement plan generator — combine template + brief into file list with descriptions
- [x] 3.2 Implement ASCII tree renderer for planned structure
- [x] 3.3 Implement plan presentation — show name, tree, file descriptions, dependencies, run command
- [x] 3.4 Implement plan adjustment — accept user feedback ("add tests", "use X"), regenerate plan

## 4. Project Skill — Phase 3 (Implement)

- [x] 4.1 Implement project directory creation — `{library}/projects/{slug}/`
- [x] 4.2 Implement file generator loop — iterate through plan, create each file with progress ("Creating file 3/7: src/parser.ts")
- [x] 4.3 Implement README.md generation — frontmatter + "What it does" + "How to run" + "What you learned" + "Structure" tree
- [x] 4.4 Implement source file generation — create files from templates with customized content
- [x] 4.5 Implement config file generation — deno.json/package.json based on template type
- [x] 4.6 Implement .gitignore generation

## 5. Project Skill — Phase 4 (Wrap-up)

- [x] 5.1 Implement summary display — list created files, show run command
- [x] 5.2 Implement DB registration — save project as item (type=project) via saveItem()
- [x] 5.3 Implement session logging — mode="project", lang, tags with project name, duration
- [x] 5.4 Dashboard auto-updates via saveItem() (already wired in change 02)

## 6. Pi Skill Definition

- [x] 6.1 Create `src/pi/skills/coach-project/SKILL.md` — describe 4-phase flow, phase transitions, template types, output format

## 7. CLI Router Integration

- [x] 7.1 Update `src/cli/router.ts` — replace project stub with real handler
- [x] 7.2 Pass project idea from CLI args to skill

## 8. Integration & Verification

- [x] 8.1 Verify `coach project "csv to json"` runs the project skill (not stub)
- [x] 8.2 Verify detectProjectType correctly identifies cli/api/script/library
- [x] 8.3 Verify generated README includes all required sections with frontmatter
- [x] 8.4 Run full test suite: `deno test`
