# Local Development

## Prerequisites

- **Deno 2.x** — primary toolchain
- **Bun 1.3+** _(optional)_ — to run the Bun cross-runtime gate locally
- **Node 22+** _(optional)_ — to run the Node cross-runtime gate locally

## Install from source

```bash
git clone https://github.com/salmi-dev/dev-coach
cd dev-coach
deno task install
```

This compiles a Deno binary into `~/.deno/bin/dev-coach`.

## Daily commands

```bash
deno task verify           # fmt + lint + tests + 80% coverage on src/
deno task test             # tests only (no coverage instrumentation)
deno task coverage:report  # full test suite with coverage profile
deno task coverage:check   # gate on 80% threshold (uses existing profile)
deno task build            # compile binary to ./dev-coach
deno task install          # install binary to ~/.deno/bin/
```

### Cross-runtime gates

```bash
deno task test:bun         # bash scripts/test-bun.sh   (needs `bun`)
deno task test:node        # bash scripts/test-node.sh  (needs Node ≥ 22)
```

These are the exact same recipes CI uses — see [Coverage Gates](Coverage-Gates).

## Code style

- **160-column** lines, **single quotes**, **semicolons required** — enforced by `deno fmt`.
- Lint: `deno lint` with the standard ruleset.
- All exported symbols carry JSDoc with at least a one-line summary; runtime detection and SQLite dispatch carry deeper notes because they're cross-runtime
  contracts.

## OpenSpec workflow

Substantial changes (anything spanning multiple files or touching contracts) go through [OpenSpec](https://github.com/salmi-dev/dev-coach/tree/main/openspec):

1. `/opsx:new <change-name>` — create proposal + design + delta specs + tasks
2. `/opsx:apply` — implement against the tasks
3. `/opsx:archive` — sync deltas to main specs and move the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`

Trivial changes (typo fixes, one-line bug fixes) skip OpenSpec.

## Branch + PR conventions

- Branch off `main`. Use `feat/`, `fix/`, `chore/`, `ci/`, or `docs/` prefixes.
- Bump commits and meta-only changes use `[skip ci]` in the commit message.
- All 9 CI checks must pass before merge: `Fmt`, `Lint`, `Build`, `Test`, `Test (Bun)`, `Test (Node 22)`, `Test (Node 24)`, `Verify`, `CI Gate`.

## Editing this wiki

Wiki pages are mirrored from [`docs/`](https://github.com/salmi-dev/dev-coach/tree/main/docs). To change a page:

1. Edit the corresponding `docs/<Page-Name>.md` on a branch
2. Open a PR
3. Once merged to `main`, the [`Sync Wiki`](https://github.com/salmi-dev/dev-coach/blob/main/.github/workflows/sync-wiki.yml) workflow pushes the change to the
   wiki

Direct edits via the wiki UI will be overwritten on the next sync.
