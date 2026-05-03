## 1. Profile Builder

- [x] 1.1 Create `src/db/profile.ts` — `rebuildProfile(db)` aggregating sessions into profile table (primary_languages, peak_hours, favorite_modes, recent_topics)
- [x] 1.2 Implement `calculateStreak(db)` — count consecutive days backward from today with sessions
- [x] 1.3 Implement `monthOverMonthDelta(db)` — session count delta between current and previous month
- [x] 1.4 Write tests for rebuildProfile (with data, empty), calculateStreak (active, broken, none), monthOverMonthDelta

## 2. Stats Skill — Dashboard Rendering

- [x] 2.1 Create `src/skills/stats.ts` — implement Skill interface with id="stats"
- [x] 2.2 Implement ASCII bar chart renderer — block chars (████░░░) with percentage, fixed 15-char width, top 5 languages
- [x] 2.3 Implement default monthly dashboard — ASCII box with: session count + delta, mode breakdown, language bars, library counts, streak, most active day, newest topic
- [x] 2.4 Implement empty state — "No sessions yet. Start with `coach ask`!" when DB is empty

## 3. Stats Subcommands

- [x] 3.1 Implement `coach stats weekly` — stats scoped to current week (Mon–Sun)
- [x] 3.2 Implement `coach stats lang <lang>` — filter sessions/items by language, show count + top tags + recent items
- [x] 3.3 Implement `coach stats topics` — rank all tags by frequency across sessions and items
- [x] 3.4 Implement `coach stats profile` — display inferred profile from profile table (rebuild first)
- [x] 3.5 Implement subcommand routing within stats skill (parse args: weekly, lang, topics, profile)
- [x] 3.6 Trigger `regenerateDashboard()` on every `coach stats` invocation
- [x] 3.7 Write tests for bar chart rendering, streak calculation integration, subcommand routing

## 4. Pi Custom Tools (complete set)

- [x] 4.1 Create `src/pi/tools/coach-copy.ts` — wrapper around copyToClipboard(), returns { success, tool }
- [x] 4.2 Create `src/pi/tools/coach-log.ts` — wrapper around logSession(), returns { sessionId }
- [x] 4.3 Write tool interface descriptions as JSDoc for all 4 tools

## 5. Pi Skill Installer

- [x] 5.1 Create `src/skills/install-pi.ts` — detect skill directory (.pi/skills/, .codex/skills/, .github/skills/), support --dir override
- [x] 5.2 Implement `installPiSkills(targetDir)` — copy all 7 SKILL.md files + tool definitions to target
- [x] 5.3 Implement `uninstallPiSkills(targetDir)` — remove all coach-* directories from target
- [x] 5.4 Implement install confirmation output — list installed skills and tools
- [x] 5.5 Write tests for directory detection, install (files copied), uninstall (files removed)

## 6. Pi Skill Definitions (finalize)

- [x] 6.1 Create `src/pi/skills/coach-stats/SKILL.md` — describe subcommands, dashboard format, profile view
- [x] 6.2 Review and finalize all 7 SKILL.md files for consistency (coach-ask, coach-explain, coach-compare, coach-sandbox, coach-review, coach-project, coach-stats)

## 7. CLI Router Integration

- [x] 7.1 Update `src/cli/router.ts` — replace stats stub with real handler, add install-pi and uninstall-pi subcommands
- [x] 7.2 Route stats subcommands (weekly, lang, topics, profile) from CLI args
- [x] 7.3 Update SUBCOMMANDS map with install-pi and uninstall-pi descriptions

## 8. Project README

- [x] 8.1 Write root `README.md` — project title with ASCII art, description, installation (3 methods)
- [x] 8.2 Document all 7 skills with icons, descriptions, usage examples
- [x] 8.3 Document configuration reference (config.yaml fields and defaults)
- [x] 8.4 Document pi integration guide (install-pi, tools, SKILL.md)
- [x] 8.5 Finalize `deno.json` publish config for JSR

## 9. Integration & Verification

- [x] 9.1 Verify `coach stats` renders ASCII dashboard (even with empty DB)
- [x] 9.2 Verify `coach stats profile` shows inferred profile
- [x] 9.3 Verify `coach install-pi` copies skills to .pi/skills/
- [x] 9.4 Verify `coach uninstall-pi` removes skills
- [x] 9.5 Verify root README is complete with all sections
- [x] 9.6 Run full test suite: `deno test`
