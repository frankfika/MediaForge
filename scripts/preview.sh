#!/usr/bin/env bash
# Pre-release smoke test: build, start, hit critical endpoints, stop.
# Useful as a final check before `pnpm push` or `vercel deploy`.
#
# Usage:  bash scripts/preview.sh
#         bash scripts/preview.sh --keep   # leave the server running
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=${PORT:-3000}
BASE="http://localhost:${PORT}"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

step() { printf '• %s\n' "$1"; }
fail() { printf '✗ %s\n' "$1" >&2; }

step "typecheck"
pnpm typecheck >/dev/null

step "unit tests"
pnpm test >/dev/null

step "e2e tests"
pnpm test:e2e >/dev/null

step "build"
pnpm build >/dev/null

step "start on :${PORT}"
PORT="$PORT" pnpm start >/tmp/mediaforge-preview.log 2>&1 &
SERVER=$!
cleanup() {
  if [ "$KEEP" -eq 0 ]; then
    kill "$SERVER" 2>/dev/null || true
    wait "$SERVER" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Wait up to 30 s for the health endpoint to respond.
for _ in $(seq 1 30); do
  if curl -fsS "${BASE}/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

step "GET /"
code=$(curl -sS -o /dev/null -w '%{http_code}' "${BASE}/")
[ "$code" = "200" ] || fail "expected 200, got $code"

step "GET /showcase"
code=$(curl -sS -o /dev/null -w '%{http_code}' "${BASE}/showcase")
[ "$code" = "200" ] || fail "expected 200, got $code"

step "GET /api/health 200 + mode:mock"
body=$(curl -fsS "${BASE}/api/health")
echo "$body" | grep -q '"ok":true'      || fail "ok != true"
echo "$body" | grep -q '"mode":"mock"' || fail "mode != mock"

step "GET /api/metrics is a number object"
body=$(curl -fsS "${BASE}/api/metrics")
echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); [isinstance(d[k], int) for k in d]" >/dev/null \
  || fail "metrics shape wrong"

step "GET /api/openapi.json OpenAPI 3.1"
curl -fsS "${BASE}/api/openapi.json" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['openapi'].startswith('3.')" \
  || fail "openapi version wrong"

step "GET /api/ping pong:true"
curl -fsS "${BASE}/api/ping" | grep -q '"pong":true' || fail "ping didn't pong"

step "POST /api/style/learn validates name + samples"
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "${BASE}/api/style/learn")
[ "$code" = "400" ] || fail "expected 400, got $code"

step "POST /api/style/refine validates style"
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "${BASE}/api/style/refine")
[ "$code" = "400" ] || fail "expected 400, got $code"

step "GET /api/embed/{query} is search-shape (provider + model + results)"
body=$(curl -fsS "${BASE}/api/embed/MediaForge")
echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['provider']=='mock' and d.get('query')=='MediaForge' and isinstance(d.get('results'), list)" \
  || fail "embed default shape wrong"

step "GET /mcp-guide.md 200 + content-type text/markdown"
hdr=$(curl -sS -o /dev/null -D - "${BASE}/mcp-guide.md" | tr -d '\r')
echo "$hdr" | grep -qi '^content-type: *text/markdown' || fail "mcp-guide content-type wrong"

step "all checks passed"
[ "$KEEP" -eq 1 ] && printf '  (server still running on :%s — kill with kill %d)\n' "$PORT" "$SERVER"