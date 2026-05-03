# Dev Coach Wiki

> 🎓 **AI-powered coding coach CLI** — ask, explain, compare, sandbox, review code, build mini-projects, track learning. Deno-native, runs on Bun & Node ≥ 22.

This wiki is the user-facing reference for [`@salmidev/dev-coach`](https://jsr.io/@salmidev/dev-coach). Source-of-truth specs live in
[`openspec/specs/`](https://github.com/salmi-dev/dev-coach/tree/main/openspec/specs); this wiki summarises the parts that matter to a user or contributor.

## How this wiki is maintained

The wiki content is **mirrored from the [`docs/` folder on `main`](https://github.com/salmi-dev/dev-coach/tree/main/docs)** by the
[`Sync Wiki`](https://github.com/salmi-dev/dev-coach/blob/main/.github/workflows/sync-wiki.yml) workflow on every push.

**Edits made in the wiki UI will be overwritten on the next push to `main`.** Send PRs against `docs/` instead.

## Pages

- **[Runtime Compatibility](Runtime-Compatibility)** — supported runtimes, SQLite drivers, what the cross-runtime CI matrix tests
- **[Coverage Gates](Coverage-Gates)** — the 80% bar across Deno/Bun/Node, how to run the same gates locally
- **[Local Development](Local-Development)** — clone, install, the `deno task` cheat-sheet

## Quick links

- 📦 JSR package: <https://jsr.io/@salmidev/dev-coach>
- 🐛 Issues: <https://github.com/salmi-dev/dev-coach/issues>
- 📜 OpenSpec specs: <https://github.com/salmi-dev/dev-coach/tree/main/openspec/specs>
- 📝 Changelog (archive): <https://github.com/salmi-dev/dev-coach/tree/main/openspec/changes/archive>
