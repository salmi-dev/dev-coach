## 1. Interactive Framework

- [x] 1.1 Create `src/skills/interactive.ts` — define `Approach` interface (index, title, content, lang?, tags)
- [x] 1.2 Implement `ApproachCollector` class — `add(title, content, lang?, tags)`, auto-incrementing index, `approaches` getter
- [x] 1.3 Implement `parseSelection(input, maxIndex)` — parse "all", "none", "1,3,4" into index array, silently ignore invalid indices
- [x] 1.4 Implement `formatSummaryTable(approaches)` — numbered list with title and one-line description
- [x] 1.5 Implement `ApproachCollector.selectAndSave(db, options)` — display summary, prompt for selection, batch save selected as individual snippets
- [x] 1.6 Write tests for parseSelection (all, none, specific, invalid, mixed), formatSummaryTable, ApproachCollector add

## 2. Review Skill — Input Handling

- [x] 2.1 Create `src/skills/review.ts` — implement `Skill` interface with id="review"
- [x] 2.2 Implement `resolveInput(args)` — priority: file path (exists?) → stdin (not TTY?) → inline code string
- [x] 2.3 Implement `detectLanguage(input, filePath?)` — from file extension map (.rs→rust, .ts→typescript, .py→python, etc.) or keyword heuristics
- [x] 2.4 Write tests for resolveInput (file path, inline), detectLanguage (extension, keywords)

## 3. Review Skill — Output Structure

- [x] 3.1 Implement `run()` for review: resolve input, detect language, format structured prompt with 7 review sections
- [x] 3.2 Define review output template with section headers (🐛 Bugs, 🎨 Style, ⚡ Performance, 🔒 Security, 📐 Architecture, ✨ Refactored, 📊 Score)
- [x] 3.3 Implement post-response: offer clipboard copy of refactored code, offer save lesson as tldr
- [x] 3.4 Wire review into SkillResult: suggestedType="tldr", suggestedTitle from key takeaway

## 4. Sandbox Skill

- [x] 4.1 Create `src/skills/sandbox.ts` — implement `Skill` interface with id="sandbox"
- [x] 4.2 Implement `run()`: parse topic, read primary_languages from config for context, create ApproachCollector
- [x] 4.3 Format sandbox output template: numbered approaches with code + trade-offs, summary table at end
- [x] 4.4 Wire sandbox into ApproachCollector.selectAndSave() for batch snippet save
- [x] 4.5 Implement session logging with mode="sandbox", approach count, duration

## 5. Pi Custom Tools

- [x] 5.1 Create `src/pi/tools/coach-save.ts` — wrapper around saveItem() with parameter validation
- [x] 5.2 Create `src/pi/tools/coach-search.ts` — wrapper around search() with parameter validation
- [x] 5.3 Write tool interface descriptions (params, returns, usage) as JSDoc

## 6. Pi Skill Definitions

- [x] 6.1 Create `src/pi/skills/coach-sandbox/SKILL.md` — describe multi-response flow, approach format, batch save behavior
- [x] 6.2 Create `src/pi/skills/coach-review/SKILL.md` — describe input sources, 7-section output, severity levels, post-response actions

## 7. CLI Router Integration

- [x] 7.1 Update `src/cli/router.ts` — replace sandbox and review stubs with real handlers
- [x] 7.2 For review: handle file path arg, stdin detection, inline code fallback
- [x] 7.3 For sandbox: pass topic string from args

## 8. Integration & Verification

- [x] 8.1 Verify `coach sandbox "topic"` runs sandbox skill (not stub)
- [x] 8.2 Verify `coach review ./file.ts` reads file and runs review skill
- [x] 8.3 Verify batch selection parses correctly in sandbox flow
- [x] 8.4 Run full test suite: `deno test`
