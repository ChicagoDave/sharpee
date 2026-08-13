#!/usr/bin/env bash
#
# deploy-zifmia.sh — pull and (re)start the Zifmia container (ADR-179).
#
# Idempotent. Safe to re-run: if the requested image is already pulled,
# its digest matches the running container, and the container is healthy,
# the script exits 0 without touching state. Otherwise it pulls, removes
# the old container, starts a new one against the same named volumes,
# and waits for the healthcheck.
#
# Usage:
#   ./deploy-zifmia.sh                  # default tag: 1.0.0
#   ./deploy-zifmia.sh 1.0.1            # specific tag
#   ZIFMIA_BIND=0.0.0.0 ./deploy-zifmia.sh   # expose externally (no reverse proxy)
#
# Env knobs:
#   ZIFMIA_IMAGE_NAME    ghcr.io/chicagodave/zifmia
#   ZIFMIA_TAG           1.0.0          (overridden by positional arg)
#   ZIFMIA_CONTAINER     zifmia
#   ZIFMIA_PORT          3000           (host port)
#   ZIFMIA_BIND          127.0.0.1      (loopback by default — Apache fronts)
#   ZIFMIA_DATA_VOL      zifmia-data
#   ZIFMIA_STORIES_VOL   zifmia-stories
#
# Does NOT invoke sudo. If the current user can't reach the Docker
# daemon, the script prints how to fix it and exits 1.
#
# Sister script: setup-zifmia-apache.sh (TLS + reverse proxy front).

set -euo pipefail

IMAGE_NAME="${ZIFMIA_IMAGE_NAME:-ghcr.io/chicagodave/zifmia}"
TAG="${1:-${ZIFMIA_TAG:-1.0.0}}"
IMAGE_REF="${IMAGE_NAME}:${TAG}"
CONTAINER="${ZIFMIA_CONTAINER:-zifmia}"
HOST_PORT="${ZIFMIA_PORT:-3000}"
HOST_BIND="${ZIFMIA_BIND:-127.0.0.1}"
DATA_VOL="${ZIFMIA_DATA_VOL:-zifmia-data}"
STORIES_VOL="${ZIFMIA_STORIES_VOL:-zifmia-stories}"

log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

# --- Pre-flight ---

command -v docker >/dev/null 2>&1 || fail "docker not installed."

if ! docker info >/dev/null 2>&1; then
  fail "Cannot talk to the Docker daemon. Either add your user to the 'docker' group ('sudo usermod -aG docker \$USER' then re-login) or rerun this script as root."
fi

# --- Pull image ---

log "Pulling ${IMAGE_REF}..."
docker pull "${IMAGE_REF}"

NEW_DIGEST=$(docker image inspect "${IMAGE_REF}" --format '{{.Id}}')
log "Image digest: ${NEW_DIGEST}"

# --- Ensure named volumes exist (idempotent) ---

for vol in "${DATA_VOL}" "${STORIES_VOL}"; do
  if docker volume inspect "${vol}" >/dev/null 2>&1; then
    log "Volume '${vol}' already exists."
  else
    log "Creating volume '${vol}'..."
    docker volume create "${vol}" >/dev/null
  fi
done

# --- Decide whether the current container is already correct ---

EXISTING_DIGEST=""
EXISTING_IMAGE_REF=""
EXISTING_BINDING=""
RUNNING="false"
if docker inspect "${CONTAINER}" >/dev/null 2>&1; then
  EXISTING_DIGEST=$(docker inspect "${CONTAINER}" --format '{{.Image}}')
  EXISTING_IMAGE_REF=$(docker inspect "${CONTAINER}" --format '{{.Config.Image}}')
  RUNNING=$(docker inspect "${CONTAINER}" --format '{{.State.Running}}')
  # Host port + bind from the first published port binding (we only ever bind one).
  EXISTING_BINDING=$(docker inspect "${CONTAINER}" \
    --format '{{ range $p, $confs := .NetworkSettings.Ports }}{{ range $confs }}{{ .HostIp }}:{{ .HostPort }}{{ end }}{{ end }}' 2>/dev/null || true)
fi

WANTED_BINDING="${HOST_BIND}:${HOST_PORT}"

if [ "${EXISTING_DIGEST}" = "${NEW_DIGEST}" ] \
   && [ "${RUNNING}" = "true" ] \
   && [ "${EXISTING_IMAGE_REF}" = "${IMAGE_REF}" ] \
   && [ "${EXISTING_BINDING}" = "${WANTED_BINDING}" ]; then
  log "Container '${CONTAINER}' already running ${IMAGE_REF} bound to ${WANTED_BINDING} — nothing to do."
  exit 0
fi

# --- Remove the old container (if any) ---

if [ -n "${EXISTING_DIGEST}" ]; then
  log "Removing existing container '${CONTAINER}' (was ${EXISTING_IMAGE_REF:-unknown})..."
  docker rm -f "${CONTAINER}" >/dev/null
fi

# --- Start fresh ---

log "Starting '${CONTAINER}' bound to ${WANTED_BINDING}..."
docker run -d \
  --name "${CONTAINER}" \
  --restart unless-stopped \
  -p "${WANTED_BINDING}:3000" \
  -v "${DATA_VOL}:/data" \
  -v "${STORIES_VOL}:/stories" \
  "${IMAGE_REF}" >/dev/null

# --- Wait for healthy ---

log "Waiting for healthcheck..."
STATUS=""
for _ in $(seq 1 60); do
  STATUS=$(docker inspect "${CONTAINER}" --format '{{.State.Health.Status}}' 2>/dev/null || echo "")
  case "${STATUS}" in
    healthy)   log "Container is healthy."; break ;;
    unhealthy) fail "Container reported unhealthy — see 'docker logs ${CONTAINER}'." ;;
    *)         sleep 1 ;;
  esac
done

if [ "${STATUS}" != "healthy" ]; then
  fail "Container not healthy after 60s (status: ${STATUS:-unknown}). Check 'docker logs ${CONTAINER}'."
fi

# --- Smoke check ---

log "Smoke testing GET /api/stories..."
RESP_FILE=$(mktemp)
trap 'rm -f "${RESP_FILE}"' EXIT
if curl -fsS "http://${HOST_BIND}:${HOST_PORT}/api/stories" -o "${RESP_FILE}"; then
  log "API responded: $(cat "${RESP_FILE}")"
else
  fail "Smoke check failed — container is healthy but /api/stories did not respond at http://${HOST_BIND}:${HOST_PORT}/."
fi

# --- Summary ---

BASELINE=$(docker inspect "${IMAGE_REF}" \
  --format '{{ index .Config.Labels "org.sharpee.story-runtime-baseline" }}' 2>/dev/null || echo '?')
log "Deploy complete."
log "  Image:    ${IMAGE_REF}"
log "  Digest:   ${NEW_DIGEST}"
log "  Baseline: ${BASELINE}"
log "  Bound:    http://${HOST_BIND}:${HOST_PORT}  (run setup-zifmia-apache.sh to put Apache + TLS in front)"
