# 🎓 Dev Coach

```
┌──────────────────────────────────────┐
│  🎓 DEV COACH                       │
│  AI-powered coding coach             │
│                                      │
│  Ask · Explain · Compare · Sandbox   │
│  Review · Project · Stats            │
└──────────────────────────────────────┘
```

Your personal AI-powered coding coach. Ask questions, explore topics, review code, build mini-projects, and track your learning progress.

## Installation

### From JSR (recommended)

```bash
deno install -g --allow-read --allow-write --allow-env --allow-run --allow-ffi jsr:@salmidev/dev-coach
```

### From source

```bash
git clone https://github.com/salmi-dev/dev-coach
cd dev-coach
deno task install
```

### First run

```bash
coach init
```

## Supported runtimes

`@salmidev/dev-coach` runs on **Deno**, **Bun**, and **Node.js**. The CLI itself is distributed for Deno; the library API works on all three.

| Runtime                       | Status                         | SQLite driver                                                                                                                                         |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deno ≥ 2.0                    | ✅ first-class (CLI + library) | [`jsr:@db/sqlite`](https://jsr.io/@db/sqlite) (FFI)                                                                                                   |
| Bun ≥ 1.1                     | ✅ library                     | built-in [`bun:sqlite`](https://bun.com/docs/api/sqlite)                                                                                              |
| Node.js ≥ 22                  | ✅ library                     | built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) (Node ≥ 22.5) or [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) fallback |
| Browsers / Cloudflare Workers | ❌                             | n/a (filesystem + native SQLite required)                                                                                                             |

Node 22 itself ships `node:sqlite` only behind `--experimental-sqlite`; the adapter falls back to `better-sqlite3` if you have it installed. Node 24 supports
`node:sqlite` out of the box.

```ts
// Same import on every runtime
import { loadConfig, saveItem, search } from '@salmidev/dev-coach';
```

Under the hood, `src/utils/runtime/` and `src/db/sqlite/` dispatch to per-runtime adapters at module load — application code never sees `Deno.*`, `Bun.*`, or
`node:*` directly. See
[`openspec/changes/boost-jsr-score-and-runtime-compat/specs/runtime-compat/spec.md`](openspec/changes/boost-jsr-score-and-runtime-compat/specs/runtime-compat/spec.md)
for the contract (will move to `openspec/specs/runtime-compat/spec.md` when the change is archived).

## Skills

### ╺━╸ coach:ask — Quick Q&A

```bash
coach ask "how to reverse a list in python"
```

Get a concise answer. Commands are auto-detected for clipboard copy. Save answers as TLDRs.

### 📖 coach:explain — Deep Dive

```bash
coach explain "closures in rust"
```

5-layer explanation: one-liner → core concept → how it works → example → gotchas. Cross-references your library.

### ⚖ coach:compare — Side by Side

```bash
coach compare "REST vs GraphQL for mobile"
```

ASCII comparison table with dimensions, verdict, and code examples.

### ⧉ coach:sandbox — Explore & Collect

```bash
coach sandbox "error handling in rust"
```

Multiple approaches to a topic. Batch-select which to save as snippets.

### ◉ coach:review — Code Review

```bash
coach review ./src/main.rs
cat broken.py | coach review
```

Structured review: 🐛 Bugs, 🎨 Style, ⚡ Performance, 🔒 Security, 📐 Architecture, ✨ Refactored version, 📊 Score.

### ⚙ coach:project — Mini Project Builder

```bash
coach project "CLI that converts CSV to JSON"
```

4-phase flow: clarify → plan → implement → wrap-up. Produces a runnable project.

### 📊 coach:stats — Learning Dashboard

```bash
coach stats              # Monthly dashboard
coach stats weekly       # This week
coach stats lang rust    # Language-specific
coach stats topics       # Top topics
coach stats profile      # Inferred profile
```

## Browsing your library

Saved snippets and TLDRs are first-class CLI citizens — list, view, search, edit, or delete them without ever leaving the terminal.

```bash
coach tldr                       # Interactive picker over all TLDRs
coach tldr list                  # Print all TLDRs (slug — title — tags)
coach tldr show reverse-a-list   # Render a TLDR (paged when interactive)
coach tldr search json           # Full-text search within TLDRs
coach tldr edit reverse-a-list   # Open in $EDITOR, auto re-index on save
coach tldr path reverse-a-list   # Print absolute path (useful in shell pipes)
coach tldr delete reverse-a-list # Confirm + remove (use --yes to skip prompt)

coach snippet                    # Same actions for snippets
coach snippet show parse-json    # Resolves across all language subfolders
```

Fuzzy slug resolution kicks in when you don't remember the exact name: `coach tldr show parse` will match a unique prefix, or open a picker when several items
match.

### Quick-access aliases

Install short aliases (`c-tldr` → `coach tldr`, `c-snip` → `coach snippet`) into your shell rc:

```bash
coach install-aliases     # Append fenced block to ~/.zshrc or ~/.bashrc
coach uninstall-aliases   # Cleanly remove the block

# Then:
c-tldr                    # picker
c-tldr search json
c-snip show parse-json
```

`coach init` also offers to install the aliases for you on first run.

## Configuration

Config lives at `~/.config/dev-coach/config.yaml`:

```yaml
library_path: ~/dev-coach # Where snippets, tldrs, projects are stored
primary_languages: # Your preferred languages
  - typescript
  - rust
frameworks: # Your tools/frameworks
  - deno
  - react
response_style: concise # concise | detailed | examples-first
```

## Library Structure

```
~/dev-coach/
├── README.md                    # Auto-generated dashboard
├── snippets/
│   ├── rust/
│   │   └── json-parse.md
│   └── typescript/
│       └── zod-validation.md
├── tldr/
│   ├── docker-basics.md
│   └── git-advanced.md
└── projects/
    └── csv-to-json/
        ├── README.md
        └── main.ts
```

## Pi Integration

Install skills into your project for use with pi, codex, or GitHub agents:

```bash
coach install-pi          # Auto-detects .pi/, .codex/, .github/
coach install-pi --dir ./custom/skills
coach uninstall-pi        # Remove skills
```

### Available Pi Tools

| Tool           | Description                            |
| -------------- | -------------------------------------- |
| `coach-save`   | Save a snippet/tldr/project to library |
| `coach-search` | Search the library by text, tags, type |
| `coach-copy`   | Copy text to system clipboard          |
| `coach-log`    | Log a session to the database          |

## Data Storage

| What     | Where                               |
| -------- | ----------------------------------- |
| Config   | `~/.config/dev-coach/config.yaml`   |
| Database | `~/.local/share/dev-coach/coach.db` |
| Library  | `~/dev-coach/` (configurable)       |

Follows [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/).

## Development

```bash
deno task dev              # Run CLI in dev mode
deno task test             # Run tests
deno task verify           # Quality gate (see below)
deno task build            # Compile binary
```

### JSR package & overview

Published at [`@salmidev/dev-coach`](https://jsr.io/@salmidev/dev-coach) on JSR. The JSR landing page (the "Overview" tab) is rendered from the **module-level
JSDoc at the top of [`mod.ts`](./mod.ts)** — not from this README. This is pinned via `publish.readmeSource:
"jsdoc"` in [`deno.json`](./deno.json).

**If you edit `mod.ts`'s top JSDoc you are editing the JSR landing page.** Keep the overview block dense, code-heavy, and library-focused (three `@example`
blocks minimum). This README stays as the GitHub-side long-form doc covering CLI install, skills, and configuration.

We target a **100% JSR score** for the package; current breakdown is visible at the JSR package URL above.

### Quality gate

`deno task verify` is the single command that gates a change before archive. It runs, in order:

1. `deno fmt --check` — enforces 160-col / single-quote / semicolon style.
2. `deno lint` — zero errors required.
3. `deno task coverage:report` — full test suite with coverage instrumentation (writes `cov_profile/`).
4. `deno task coverage:check` — fails when overall **line coverage of `src/` falls below 80%**.

Steps 3 and 4 are also exposed as standalone tasks so CI can run the test pass once and check the threshold separately (see `.github/workflows/pipeline.yml`)
without a second `deno test` invocation. Locally, `deno task verify` chains them.

The threshold lives in `scripts/check-coverage.ts` as a single constant (`THRESHOLD = 80`). Update it there and nowhere else. The same 80% bar applies to the
**cross-runtime** suite on Bun and Node — see below. Every OpenSpec change's `tasks.md` ends with a `deno task verify` step so regressions can't slip in
silently.

#### Run cross-runtime gates locally

The Bun and Node cross-runtime jobs in CI are reproducible locally via two small driver scripts. Both run the curated suite under `tests/cross-runtime/`,
collect lcov coverage, and gate on ≥ 80% line coverage of the `cross-runtime` preset (`src/utils/runtime/**`, `src/db/sqlite/**`, `src/utils/prompt.ts`):

```bash
deno task test:bun     # bash scripts/test-bun.sh   (needs `bun` on PATH)
deno task test:node    # bash scripts/test-node.sh  (needs Node ≥ 22 on PATH)
```

CI calls these same scripts — the local and CI execution paths are a single recipe and cannot drift.

### Documentation

User-facing pages are mirrored from [`docs/`](./docs) to the [GitHub wiki](https://github.com/salmi-dev/dev-coach/wiki) by the
[`Sync Wiki`](.github/workflows/sync-wiki.yml) workflow on every push to `main`. Edit `docs/*.md` on a branch and open a PR — wiki edits made via the UI are
overwritten on the next sync.

## License

MIT
