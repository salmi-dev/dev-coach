#!/usr/bin/env bash
# scripts/test-bun.sh — run the cross-runtime test suite under Bun with
# line coverage and gate on scripts/check-coverage.ts (≥ 80% on the
# `cross-runtime` preset).
#
# This is the canonical recipe for the Bun gate; CI calls this script too,
# so the local and CI execution paths cannot drift.
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf coverage
mkdir -p coverage

bun test --coverage --coverage-reporter=lcov tests/cross-runtime/

deno run --allow-read --allow-run scripts/check-coverage.ts \
  --lcov coverage/lcov.info --profile cross-runtime
