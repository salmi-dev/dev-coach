#!/usr/bin/env bash
# Configure JSR-server-side settings for @salmidev/dev-coach.
# These fields cannot live in deno.json (deno publish rejects unknown publish.* fields)
# and JSR does NOT auto-read `description` from deno.json either.
#
# Usage:
#   export JSR_TOKEN=<token from https://jsr.io/account/tokens>
#   scripts/configure-jsr-package.sh

set -euo pipefail

if [[ -z "${JSR_TOKEN:-}" ]]; then
  echo "error: JSR_TOKEN env var not set." >&2
  echo "  Get one at https://jsr.io/account/tokens (scope: write)" >&2
  exit 1
fi

PKG="https://api.jsr.io/scopes/salmidev/packages/dev-coach"
AUTH=("-H" "Authorization: Bearer $JSR_TOKEN")
JSON=("-H" "Content-Type: application/json")

echo "→ Setting description"
curl -fsS -X PATCH "$PKG" "${AUTH[@]}" "${JSON[@]}" \
  -d '{"description":"AI-powered coding coach: save snippets, TLDRs, and projects with SQLite-backed search."}' \
  | python3 -m json.tool | grep -E '"description"' || true

echo "→ Setting runtimeCompat (Track B complete: deno + bun + node)"
curl -fsS -X PATCH "$PKG" "${AUTH[@]}" "${JSON[@]}" \
  -d '{"runtimeCompat":{"deno":true,"bun":true,"node":true,"browser":false,"workerd":false}}' \
  | python3 -m json.tool | grep -E '"runtimeCompat"' || true

echo "→ Final state:"
curl -fsS "$PKG" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'  score: {d[\"score\"]}%  description: {d[\"description\"]!r}  runtimeCompat: {d[\"runtimeCompat\"]}')"
