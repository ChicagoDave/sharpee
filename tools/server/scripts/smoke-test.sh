#!/usr/bin/env bash
# Sharpee Multiuser Server — smoke test (ADR-153 AC8 acceptance gate).
#
# Purpose:
#   1. Verify `docker compose up` produces a running container with /health
#      returning 200 within the start_period grace window.
#   2. Verify `docker compose down && docker compose up` preserves DB state —
#      a room created before `down` is still resolvable after re-`up`.
#
# Requirements (fails fast if missing):
#   - docker (with the `compose` plugin)
#   - curl, jq
#   - CAPTCHA_BYPASS=1 in the environment (/api/rooms rejects without it)
#   - At least one `.sharpee` file in ./stories/ (the compose file bind-mounts
#     it read-only into /data/stories)
#
# Usage (from tools/server/):
#   CAPTCHA_BYPASS=1 ./scripts/smoke-test.sh
#
# Exit: 0 on PASS, non-zero on any failure. Trap always runs `down` on exit.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${SERVER_DIR}"

PORT="${PORT:-8080}"
HEALTH_URL="http://localhost:${PORT}/health"
API_BASE="http://localhost:${PORT}/api"
RESOLVE_BASE="http://localhost:${PORT}/r"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-60}"

log()  { echo "[smoke] $*"; }
fail() { echo "[smoke] FAIL: $*" >&2; exit 1; }

# --- Preconditions ---------------------------------------------------------
command -v docker >/dev/null || fail "docker not found"
command -v jq     >/dev/null || fail "jq not found (brew install jq / apt install jq)"
command -v curl   >/dev/null || fail "curl not found"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin not installed"

[ -d stories ] || fail "./stories directory missing; create it and drop a .sharpee file"
shopt -s nullglob
STORY_FILES=(stories/*.sharpee)
shopt -u nullglob
[ "${#STORY_FILES[@]}" -gt 0 ] || fail "no .sharpee files found under ./stories"

[ "${CAPTCHA_BYPASS:-0}" = "1" ] || fail "set CAPTCHA_BYPASS=1 before invoking"
export CAPTCHA_BYPASS

# --- Cleanup ---------------------------------------------------------------
cleanup() {
  log "cleanup: docker compose down"
  docker compose down --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_for_health() {
  local label="$1"
  log "waiting for ${HEALTH_URL} (${label}, up to ${HEALTH_TIMEOUT_SEC}s)..."
  local i
  for ((i=1; i<=HEALTH_TIMEOUT_SEC; i++)); do
    if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
      log "health 200 after ${i}s (${label})"
      return 0
    fi
    sleep 1
  done
  fail "health check never succeeded (${label})"
}

# --- Up #1 -----------------------------------------------------------------
log "up #1: docker compose up -d --build"
docker compose up -d --build
wait_for_health "initial"

log "listing stories..."
STORIES_JSON="$(curl -fsS "${API_BASE}/stories")"
SLUG="$(echo "${STORIES_JSON}" | jq -er '.stories[0].slug')" \
  || fail "no stories returned by /api/stories (check ./stories mount)"
log "using story slug: ${SLUG}"

log "creating room..."
ROOM_JSON="$(curl -fsS \
  -H 'Content-Type: application/json' \
  -d "{\"story_slug\":\"${SLUG}\",\"display_name\":\"smoke-bot\",\"captcha_token\":\"bypass\"}" \
  "${API_BASE}/rooms")"
ROOM_ID="$(echo "${ROOM_JSON}"    | jq -er '.room_id')"
JOIN_CODE="$(echo "${ROOM_JSON}"  | jq -er '.join_code')"
log "room created: room_id=${ROOM_ID}, join_code=${JOIN_CODE}"

# --- Down → Up #2 ----------------------------------------------------------
log "down"
docker compose down

log "up #2: docker compose up -d"
docker compose up -d
wait_for_health "after restart"

# --- Verify room survived the restart --------------------------------------
log "resolving /r/${JOIN_CODE} after restart..."
RESOLVE_JSON="$(curl -fsS "${RESOLVE_BASE}/${JOIN_CODE}")" \
  || fail "resolve request failed — room did not survive restart"
RESOLVED_ID="$(echo "${RESOLVE_JSON}" | jq -er '.room_id')"

[ "${RESOLVED_ID}" = "${ROOM_ID}" ] \
  || fail "room_id mismatch after restart: expected ${ROOM_ID}, got ${RESOLVED_ID}"

log "PASS: room ${ROOM_ID} survived docker compose down/up"
