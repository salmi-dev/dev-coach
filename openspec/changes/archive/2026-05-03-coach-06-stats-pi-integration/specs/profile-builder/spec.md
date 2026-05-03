## ADDED Requirements

### Requirement: Rebuild profile from sessions
The system SHALL provide a `rebuildProfile(db)` function that aggregates the `sessions` table and writes computed profile data to the `profile` table. Computed fields: `primary_languages` (top 5 by session count), `peak_hours` (top 3 hours by session count), `favorite_modes` (modes ranked by usage), `recent_topics` (top 10 tags from last 30 days).

#### Scenario: Profile rebuilt with data
- **WHEN** `rebuildProfile()` is called with 50 sessions across 3 languages
- **THEN** `profile` table SHALL contain keys for primary_languages, peak_hours, favorite_modes, recent_topics

#### Scenario: Profile rebuilt with empty sessions
- **WHEN** `rebuildProfile()` is called with zero sessions
- **THEN** `profile` table SHALL contain keys with empty arrays

### Requirement: Streak calculation
The system SHALL provide a `calculateStreak(db)` function that counts consecutive days (backward from today) with at least one session.

#### Scenario: Active streak
- **WHEN** sessions exist for today, yesterday, and the day before
- **THEN** streak SHALL be 3

#### Scenario: Broken streak
- **WHEN** sessions exist for today but not yesterday
- **THEN** streak SHALL be 1

#### Scenario: No sessions today
- **WHEN** no session exists for today
- **THEN** streak SHALL be 0

### Requirement: Month-over-month delta
The system SHALL provide a function to calculate the session count delta between current month and previous month.

#### Scenario: Positive delta
- **WHEN** this month has 47 sessions and last month had 35
- **THEN** delta SHALL be "+12"
