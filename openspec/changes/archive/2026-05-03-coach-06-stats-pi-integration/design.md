## Context

Changes 01–05 built: Deno CLI foundation, storage layer, 3 simple skills (ask, explain, compare), 2 interactive skills (sandbox, review), and the project skill. All skills log sessions and save items. The database has `sessions`, `items`, `profile`, and `items_fts` tables. The stats stub exists in the CLI router. Pi skill SKILL.md files exist for skills from changes 03–05 but aren't installable as a package.

This change completes the tool: stats dashboard to visualize progress, profile builder for cross-session intelligence, pi installer for agent integration, and a polished README for publishing.

## Goals / Non-Goals

**Goals:**
- Stats skill with rich ASCII dashboard (bar charts, streaks, breakdowns)
- 5 stats subcommands: default monthly, weekly, per-language, topics, profile
- Profile builder that infers user patterns from session history
- Pi installer that works with `.pi/`, `.codex/`, `.github/` skill directories
- 4 complete pi custom tools
- Publication-ready README and deno.json

**Non-Goals:**
- Web-based dashboard or GUI
- Remote sync or cloud backup of stats
- Auto-updating profile in background — rebuild on demand
- Actually publishing to JSR (just ensure config is correct)

## Decisions

### 1. ASCII bar charts for language stats

**Choice**: Simple block-character bar charts (████░░░) with percentage labels. Fixed width (15 chars), top 5 languages shown.

**Alternatives considered**:
- Sparklines: too small to read
- Full-width terminal bars: terminal width detection adds complexity
- Just numbers: loses visual impact

**Rationale**: Block bars are immediately readable, work in any terminal, and look good in the box-drawing dashboard.

### 2. Streak calculation — consecutive days with sessions

**Choice**: Count consecutive days backward from today that have at least one session. A gap of 1 day resets the streak.

**Rationale**: Simple, motivating, and matches how other tools (GitHub, Duolingo) calculate streaks.

### 3. Profile builder — statistical aggregation

**Choice**: Profile is rebuilt on demand (`coach stats profile` or `rebuildProfile()`). It aggregates `sessions` table to compute: top languages (by session count), peak hours (by hour-of-day distribution), favorite modes, and recent topic trends (most frequent tags in last 30 days).

**Rationale**: On-demand rebuild avoids complexity of triggers/watchers. The sessions table is small (personal tool), so aggregation is instant.

### 4. Pi installer — directory auto-detection

**Choice**: `coach install-pi` checks for directories in order: `.pi/skills/`, `.codex/skills/`, `.github/skills/`. Uses the first one found. If none exist, creates `.pi/skills/`. User can override with `--dir <path>`.

**Rationale**: Supports all three agent config conventions. Auto-detect is convenient; override handles edge cases.

### 5. Pi tools — 4 thin wrappers

**Choice**: coach-save (change 04), coach-search (change 04), coach-copy (new), coach-log (new). Each is a standalone function with clear parameter types.

**Rationale**: Minimal surface area. Agents only need save, search, copy, and log. Everything else is internal.

## Risks / Trade-offs

- **[Risk] Stats with empty DB look barren** → Mitigation: show "No sessions yet. Start with `coach ask`!" placeholder.
- **[Trade-off] Profile rebuilt on demand, not auto** → Acceptable: instant for personal tool volume.
- **[Trade-off] Pi installer copies files, doesn't symlink** → Acceptable: copies are simpler, no broken symlinks if tool is uninstalled.
- **[Risk] SKILL.md format may change across pi/codex/github** → Mitigation: all three use the same SKILL.md format currently.
