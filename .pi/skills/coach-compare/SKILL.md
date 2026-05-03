---
name: coach-compare
description: Compare two or more approaches side by side. Use when the user wants to weigh options or technologies.
---

# coach:compare

Compare two or more approaches side by side.

## Trigger

User wants to compare technologies, approaches, or patterns, e.g., "compare REST vs GraphQL"

## Input

Comparison string with items separated by "vs", "or", "versus", "compared to". Optional context after "in/for/on", e.g., "mutex vs rwlock in Rust"

## Input Parsing

- "X vs Y" → items: [X, Y]
- "X or Y for Z" → items: [X, Y], context: Z
- "X vs Y vs Z" → items: [X, Y, Z]

## Output Format

### Comparison Table

ASCII table with dimensions (Speed, Memory, Readability, Use-case) as rows and items as columns.

### Verdict

Recommendation for when to use each approach.

### Code Examples

Working code example for each approach.

## Post-Response

- Ask: "💾 Save comparison as snippet? [Y/n]" with title "X vs Y"
- Log session with items as tags

## Tools Available

- `coach-save`: Save comparison as snippet
- `coach-log`: Log the session
