# Coach 06 — Stats & Pi Integration

## What

Implement `coach:stats` dashboard skill and package everything as installable pi skills with custom tools.

## Scope

### `coach:stats` (`src/skills/stats.ts`)

```
📊  coach:stats
```

#### Default View — Monthly Dashboard

```
┌─────────────────────────────────────────┐
│  📊 Dev Coach Stats — April 2026       │
├─────────────────────────────────────────┤
│  Sessions: 47 total (↑12 vs March)     │
│                                         │
│  By mode:                               │
│    ask: 20  sandbox: 12  explain: 8    │
│    review: 4  project: 2  compare: 1   │
│                                         │
│  Languages:                             │
│    ████████████░░░ TypeScript  40%      │
│    █████████░░░░░░ Rust        35%      │
│    ████░░░░░░░░░░░ Shell       15%      │
│    ██░░░░░░░░░░░░░ Python      10%      │
│                                         │
│  Library:                               │
│    📝 23 snippets  📖 15 tldrs         │
│    🏗️ 3 projects                        │
│                                         │
│  🔥 Streak: 12 days                    │
│  📈 Most active: Tuesday               │
│  🆕 New this month: Rust lifetimes     │
└─────────────────────────────────────────┘
```

#### Subcommands

- `coach stats` — default monthly view
- `coach stats weekly` — this week's activity
- `coach stats lang rust` — stats for a specific language
- `coach stats topics` — most frequent tags/topics
- `coach stats profile` — show inferred profile (languages, patterns, preferences)

#### Profile Builder (`src/db/profile.ts`)

- Rebuild profile from `sessions` table
- Detect: primary languages, peak hours, favorite modes, topic trends
- Used by all skills for context-awareness (change 03-05 reference this)
- Updates `profile` table in DB

#### Dashboard Regeneration

- `coach stats` also triggers `library/README.md` regeneration
- Fresh stats, recent items, project list
- Can be run standalone: `coach dashboard`

### Pi Integration (`src/pi/`)

#### Pi Skills — Final Packaging

All 7 skill SKILL.md files, each containing:

- Description and trigger pattern
- Input expectations
- What tools the skill uses
- Output format
- Example interactions

Skills:

- `coach-ask/SKILL.md`
- `coach-explain/SKILL.md`
- `coach-compare/SKILL.md`
- `coach-sandbox/SKILL.md`
- `coach-review/SKILL.md`
- `coach-project/SKILL.md`
- `coach-stats/SKILL.md`

#### Pi Custom Tools

- `coach-save` — Save a snippet/tldr/project to library
  - Params: type, title, content, lang, tags
  - Handles: frontmatter, file writing, DB sync, dashboard update
- `coach-search` — Search the library
  - Params: query, type?, lang?, tags?
  - Returns: matching items with paths and previews
- `coach-copy` — Copy text to clipboard
  - Params: text
  - Returns: success/failure + which clipboard tool used
- `coach-log` — Log a session
  - Params: mode, lang, tags, query, duration_s, saved_as?
  - Returns: session ID

#### Install Flow

- `coach install-pi` command:
  - Detects pi config directory (`.pi/`)
  - Copies skill SKILL.md files to `.pi/skills/`
  - Registers custom tools
  - Prints confirmation with available skills
- Also works with `.codex/` and `.github/` skill directories
- Uninstall: `coach uninstall-pi`

#### Deno Publish Config

- `deno.json` publish config for JSR
- `jsr:@ssal/dev-coach`
- Exports: `mod.ts` (library API), `cli.ts` (CLI binary)
- `deno install -g` instructions in project README

### Project README (`README.md` at repo root)

- What is Dev Coach
- Installation instructions (JSR + manual)
- All 7 skills with examples
- Configuration reference
- Pi integration guide
- ASCII art and screenshots

## Dependencies

- Requires: all previous changes (01-05)

## Acceptance

- `coach stats` → renders ASCII dashboard with real data
- `coach stats lang rust` → filtered view
- `coach stats profile` → shows inferred user profile
- `coach install-pi` → copies skills to `.pi/skills/`
- Pi skills trigger correctly from agent
- Custom tools work within pi agent context
- `deno publish` succeeds (dry run)
- Project README is complete
- Full end-to-end: init → ask → save → stats shows the session
