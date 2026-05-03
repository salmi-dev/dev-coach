---
name: coach-ask
description: Quick Q&A skill — answer a single question concisely. Use when the user asks a direct coding question.
---

# coach:ask

Quick Q&A skill — answer a single question concisely.

## Trigger

User asks a direct question about coding, tools, or concepts.

## Input

A single question string, e.g., "how to reverse a list in python"

## Output Format

- Concise answer (respect user's `response_style` preference)
- If answer contains a command, offer clipboard copy
- Always suggest saving as TLDR

## Behavior

1. Answer the question directly
2. If response contains a shell command or code block, ask: "📋 Copy command? [Y/n]"
3. Ask: "💾 Save as tldr? [Y/n]" with suggested title derived from question
4. Log session with detected language and tags

## Tools Available

- `coach-save`: Save the answer as a TLDR
- `coach-copy`: Copy command to clipboard
- `coach-log`: Log the session

## Context Awareness

- Read user's `primary_languages` from config for example preferences
- Read `response_style` (concise/detailed/examples-first) to adapt output
