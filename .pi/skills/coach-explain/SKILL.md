---
name: coach-explain
description: Deep-dive explanation of a concept with structured layers. Use when the user wants to understand something in depth.
---

# coach:explain

Deep-dive explanation of a concept with structured layers.

## Trigger

User wants to understand a concept in depth, e.g., "explain closures in rust"

## Input

A concept to explain, e.g., "event loop", "closures in rust", "TCP handshake"

## Output Format — 5 Structured Sections

### 1. One-liner

ELI5 summary in one sentence.

### 2. Core Concept

One paragraph explanation.

### 3. How It Works

Step-by-step with ASCII diagram if applicable.

### 4. Example

Working code in user's preferred language.

### 5. Gotchas

Common mistakes and misconceptions.

### 6. Related (auto-generated)

Cross-references to existing snippets/TLDRs in user's library (searched by tags).

## Post-Response

- Ask: "💾 Save as tldr? [Y/n]" with title derived from concept
- Log session

## Tools Available

- `coach-search`: Find related items in library for cross-references
- `coach-save`: Save explanation as TLDR
- `coach-log`: Log the session
