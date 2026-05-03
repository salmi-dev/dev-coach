---
name: coach-stats
description: View your learning dashboard and stats. Use when the user wants to see their progress, streaks, or language breakdown.
---

# coach:stats

View your learning dashboard and stats.

## Trigger

User wants to see their progress, e.g., "show me my stats"

## Subcommands

### `coach stats` (default)

Monthly dashboard with: session count, mode breakdown, language bar charts, library counts, streak, most active day.

### `coach stats weekly`

This week's activity: session count and mode breakdown.

### `coach stats lang <lang>`

Stats for a specific language: session count, common topics, recent items.

### `coach stats topics`

Most frequent tags across all sessions, ranked by frequency.

### `coach stats profile`

Inferred user profile: primary languages, peak hours, favorite modes, recent topics.

## Output

ASCII box-drawn dashboard with block-character bar charts for languages.

## Side Effects

- Triggers `regenerateDashboard()` to update `library/README.md`
- `coach stats profile` rebuilds the profile table

## Tools Available

- `coach-log`: Log the session (optional)
