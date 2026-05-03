---
name: coach-review
description: Structured code review with categorized feedback. Use when the user wants code reviewed for bugs, style, performance, and security.
---

# coach:review

Structured code review with categorized feedback.

## Trigger

User wants code reviewed, e.g., "review ./src/main.rs" or pipes code via stdin.

## Input Sources (priority order)

1. **File path**: `coach review ./file.rs` — reads file, detects lang from extension
2. **Stdin**: `cat file.rs | coach review` — reads piped input
3. **Inline**: `coach review "fn main() { ... }"` — treats arg as code

## Output Format — 7 Sections

### 🐛 Bugs

Actual bugs or potential runtime errors. Each tagged: ℹ️ info, ⚠️ warning, 🔴 error

### 🎨 Style

Naming, formatting, idiomatic patterns.

### ⚡ Performance

Inefficiencies, unnecessary allocations.

### 🔒 Security

Injection, leaks, unsafe patterns.

### 📐 Architecture

Structure, separation of concerns.

### ✨ Refactored Version

Improved code with comments explaining each change.

### 📊 Score: X/10

Brief rationale for the rating.

## Post-Response

1. "📋 Copy refactored code? [Y/n]"
2. "💾 Save lesson learned as tldr? [Y/n]"

## Tools Available

- `coach-copy`: Copy refactored code to clipboard
- `coach-save`: Save lesson learned as TLDR
- `coach-log`: Log the session
