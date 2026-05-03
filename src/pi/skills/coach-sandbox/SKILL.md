---
name: coach-sandbox
description: Explore a topic with multiple approaches, collect and save snippets. Use when the user wants to learn different ways to do something.
---

# coach:sandbox

Explore a topic with multiple approaches, collect and save snippets.

## Trigger

User wants to explore different ways to do something, e.g., "sandbox error handling in rust"

## Input

A topic to explore, e.g., "error handling in rust", "sorting algorithms in python"

## Output Format — Multi-Response

### For Each Approach (3-5 typically)

```
## Approach N: [Title]
_Description and trade-offs_
\`\`\`lang
// Working code example
\`\`\`
```

### Summary Table

After all approaches, present a comparison table.

### Batch Save

Ask: "Which to save? [all / 1,3,4 / none]" Save selected approaches as individual snippets in `snippets/{lang}/`.

## Context Awareness

- Read `primary_languages` from config — prioritize those
- Each approach explores a different angle (idiomatic, performant, simple)

## Tools Available

- `coach-save`: Save each selected snippet
- `coach-search`: Find existing related snippets to avoid duplicates
- `coach-log`: Log the session with approach count
