## Why

Changes 01–05 built all 6 interactive skills, but there's no way to see your learning progress, no `coach:stats` dashboard, and the pi integration is scattered across changes. This final change adds the stats skill (ASCII dashboard with language bars, streaks, trends), the profile builder (auto-infer user patterns from session data), the pi skill installer (`coach install-pi`), and the project README. It ties everything together into a publishable, installable package.

## What Changes

- **`coach:stats` skill** — ASCII dashboard with monthly/weekly/per-language views, streaks, mode breakdown, language bar charts, and library counts
- **Stats subcommands** — `coach stats`, `coach stats weekly`, `coach stats lang <lang>`, `coach stats topics`, `coach stats profile`
- **Profile builder** (`src/db/profile.ts`) — Rebuild user profile from sessions table: primary languages, peak hours, favorite modes, topic trends; updates `profile` table
- **Pi skill installer** — `coach install-pi` copies SKILL.md files + tool definitions to `.pi/skills/`, `.codex/skills/`, or `.github/skills/`; `coach uninstall-pi` reverses
- **Pi custom tools** — `coach-copy` (clipboard) and `coach-log` (session logging) tools alongside existing `coach-save` and `coach-search` from change 04
- **Project README** — Complete README.md at repo root with installation, all 7 skills, config reference, pi guide
- **CLI router update** — Replace stats stub with real handler, add `install-pi`/`uninstall-pi` subcommands

## Capabilities

### New Capabilities

- `skill-stats`: ASCII stats dashboard with monthly/weekly/language/topics/profile views, bar charts, streaks, mode breakdowns
- `profile-builder`: Auto-infer user profile from sessions data — languages, peak hours, modes, trends; update profile table
- `pi-installer`: `coach install-pi` / `coach uninstall-pi` — detect skill directory, copy/remove SKILL.md files and tool definitions
- `pi-tools-complete`: Complete set of 4 pi custom tools (coach-save, coach-search, coach-copy, coach-log)
- `project-readme`: Root README.md with installation guide, skill reference, config docs, pi integration guide

### Modified Capabilities

(none)

## Impact

- **New files**: `src/skills/stats.ts`, `src/db/profile.ts`, `src/skills/install-pi.ts`, `src/pi/tools/coach-copy.ts`, `src/pi/tools/coach-log.ts`, `src/pi/skills/coach-stats/SKILL.md`, `README.md` (root)
- **Modified files**: `src/cli/router.ts` (add stats, install-pi, uninstall-pi), `deno.json` (final publish config)
- **Database**: Reads `sessions` table for stats; writes `profile` table
