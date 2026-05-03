# Runtime Compatibility

Dev Coach is **Deno-native** but ships as a runtime-agnostic library on JSR. The package is verified by CI on three runtimes:

| Runtime  | Minimum version | SQLite driver                                                        | Status             |
| -------- | --------------- | -------------------------------------------------------------------- | ------------------ |
| **Deno** | 2.x             | `jsr:@db/sqlite` (FFI)                                               | ✅ Primary         |
| **Bun**  | 1.3+            | `bun:sqlite` (built-in)                                              | ✅ Verified per PR |
| **Node** | 22, 24          | `node:sqlite` (built-in) — falls back to `better-sqlite3` on Node 22 | ✅ Verified per PR |

**Out of scope:** browsers and Cloudflare Workers (workerd). The package needs filesystem and SQLite, neither of which is available on those hosts. The JSR
`runtimeCompat` field reflects this: `{ deno, bun, node: true; browser, workerd: false }`.

## How runtime selection works

`src/utils/runtime/detect.ts` sniffs `globalThis` to identify the host, then `src/utils/runtime/index.ts` lazy-imports the matching adapter:

- `runtime/deno.ts` — uses `Deno.*` APIs directly
- `runtime/bun.ts` — uses Bun's built-ins (`Bun.spawn`, etc.) plus a thin shim from `_node-compat.ts`
- `runtime/node.ts` — uses `node:fs`, `node:os`, `node:child_process` via `_node-compat.ts`

The same pattern applies to SQLite — `src/db/sqlite/index.ts` dispatches to the per-runtime adapter at `src/db/sqlite/{deno,bun,node}.ts`.

## CI matrix

Every PR runs the cross-runtime suite under `tests/cross-runtime/`:

- **Test (Bun)** — `bun test --coverage --coverage-reporter=lcov tests/cross-runtime/`
- **Test (Node 22)** — `node --experimental-strip-types --experimental-test-coverage --test ...` with `node:sqlite` (or `better-sqlite3` fallback)
- **Test (Node 24)** — same, native TypeScript stripping, `node:sqlite` built-in

All three plus the Deno `Test` job feed into `CI Gate`, which is the required check for merging to `main`.

## Adding a new runtime claim

To declare support for another runtime (e.g. `"workerd": true` in `runtimeCompat`):

1. Add an adapter under `src/utils/runtime/<name>.ts` and `src/db/sqlite/<name>.ts`
2. Wire it into the dispatcher in `src/utils/runtime/index.ts` and `src/db/sqlite/index.ts`
3. Add a CI job that runs `tests/cross-runtime/` under that runtime
4. Update [`openspec/specs/quality-gate/spec.md`](https://github.com/salmi-dev/dev-coach/blob/main/openspec/specs/quality-gate/spec.md) to list the new job

The principle is **claims are verified, not just declared** — every supported runtime must have a green CI job exercising the cross-runtime suite.
