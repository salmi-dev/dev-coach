# Coverage Gates

Dev Coach enforces a uniform **80% line-coverage** bar across all three runtimes. The threshold is the same on Deno, Bun, and Node — the project ships a single
quality promise.

| Runtime      | Scope                  | Threshold | Enforced by                                      |
| ------------ | ---------------------- | --------: | ------------------------------------------------ |
| Deno         | `src/` (all files)     |     ≥ 80% | `Verify` job → `deno task coverage:check`        |
| Bun          | `cross-runtime` preset |     ≥ 80% | `Test (Bun)` job → `bash scripts/test-bun.sh`    |
| Node 22 / 24 | `cross-runtime` preset |     ≥ 80% | `Test (Node)` jobs → `bash scripts/test-node.sh` |

The `cross-runtime` preset is defined as a constant in
[`scripts/check-coverage.ts`](https://github.com/salmi-dev/dev-coach/blob/main/scripts/check-coverage.ts):

- `src/utils/runtime/**` — runtime adapter
- `src/db/sqlite/**` — SQLite adapter
- `src/utils/prompt.ts` — prompt utilities

## Single source of truth for the threshold

The constant `THRESHOLD = 80` lives in `scripts/check-coverage.ts` and is the only place to tune it. **Workflows must not pass `--threshold`**; they inherit the
script's default. This means lifting or lowering the bar is a one-line edit, and CI always agrees with local runs.

## Run the gates locally

```bash
# Deno gate (full src/)
deno task verify

# Bun cross-runtime gate
deno task test:bun        # or: bash scripts/test-bun.sh

# Node cross-runtime gate (Node ≥ 22)
deno task test:node       # or: bash scripts/test-node.sh
```

The CI workflow invokes these same scripts — local and CI execution paths share a single recipe and cannot drift. Each script:

1. Cleans `coverage/`
2. Runs the runtime's test command with lcov coverage
3. Pipes the lcov file to `scripts/check-coverage.ts --profile cross-runtime`
4. Propagates the failing exit code

## What to do when coverage drops

The most common failure mode is "I added a new module under `src/utils/runtime/**` and the cross-runtime preset coverage dropped".

Two correct responses:

1. **Add a `tests/cross-runtime/<feature>.test.ts` exercising the new module.** This is the default — the preset's purpose is exactly to catch this.
2. **If the new module is genuinely Deno-only** (e.g. uses a Deno-only API the cross-runtime suite can't exercise), narrow `CROSS_RUNTIME_INCLUDE` rather than
   diluting it with broad globs that pull in unreachable code.

The wrong response is to lower the threshold. The 80% bar exists to make regressions visible.

## Reference

- Spec: [`openspec/specs/quality-gate/spec.md`](https://github.com/salmi-dev/dev-coach/blob/main/openspec/specs/quality-gate/spec.md)
- Script: [`scripts/check-coverage.ts`](https://github.com/salmi-dev/dev-coach/blob/main/scripts/check-coverage.ts)
- Local recipes: [`scripts/test-bun.sh`](https://github.com/salmi-dev/dev-coach/blob/main/scripts/test-bun.sh),
  [`scripts/test-node.sh`](https://github.com/salmi-dev/dev-coach/blob/main/scripts/test-node.sh)
