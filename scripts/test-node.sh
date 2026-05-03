#!/usr/bin/env bash
# scripts/test-node.sh — run the cross-runtime test suite under Node with
# line coverage and gate on scripts/check-coverage.ts (≥ 80% on the
# `cross-runtime` preset).
#
# Auto-detects Node major to decide whether --experimental-strip-types is
# needed (Node 22: yes, Node 24+: no — TS stripping is on by default).
#
# Honors $NODE_TEST_FLAGS as a passthrough escape hatch for emergency
# overrides (e.g. NODE_TEST_FLAGS='--no-warnings').
#
# This is the canonical recipe for the Node gate; CI calls this script too.
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf coverage
mkdir -p coverage

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
TS_FLAG=''
if [ "$NODE_MAJOR" -lt 24 ]; then
  TS_FLAG='--experimental-strip-types'
fi

# `node --test` doesn't recursively discover from a bare directory; pass
# explicit file paths via shell glob.
shopt -s nullglob
files=(tests/cross-runtime/*.test.ts)

# shellcheck disable=SC2086 # intentional word splitting on flag vars
node ${TS_FLAG} ${NODE_TEST_FLAGS:-} \
  --experimental-test-coverage \
  --test-reporter=lcov --test-reporter-destination=coverage/node-lcov.info \
  --test-reporter=spec --test-reporter-destination=stdout \
  --test "${files[@]}"

deno run --allow-read --allow-run scripts/check-coverage.ts \
  --lcov coverage/node-lcov.info --profile cross-runtime
