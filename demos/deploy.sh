#!/bin/bash
#
# demos/deploy.sh — Build and deploy Sharpee demos
# =================================================
# Run from the repo root on the server after git pull.
#
# Usage:
#   ./demos/deploy.sh              # Build all demos and deploy
#   ./demos/deploy.sh dungeo       # Build and deploy one story
#   ./demos/deploy.sh --landing    # Deploy only the landing page
#

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_DIR="/var/www/sharpee-demos"

# Stories to build for demos (name as build.sh knows it → URL path)
# Add new demos here.
declare -A DEMOS=(
  [dungeo]="dungeo"
  [cloak-of-darkness]="cloak"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[demos]${NC} $1"; }
warn() { echo -e "${YELLOW}[demos]${NC} $1"; }
err()  { echo -e "${RED}[demos]${NC} $1"; }

# ── Landing page ──

deploy_landing() {
  log "Deploying landing page..."
  sudo mkdir -p "$DEPLOY_DIR"
  sudo cp demos/index.html "$DEPLOY_DIR/index.html"
  sudo cp demos/style.css  "$DEPLOY_DIR/style.css"
  sudo cp demos/theme.js   "$DEPLOY_DIR/theme.js"
  log "Landing page deployed."
}

# ── Build and deploy a single story ──

build_and_deploy() {
  local STORY_NAME="$1"
  local URL_PATH="$2"

  log "Building $STORY_NAME for browser..."
  ./build.sh --no-version -s "$STORY_NAME" -c browser

  local BUILD_OUTPUT="dist/web/$STORY_NAME"
  if [ ! -d "$BUILD_OUTPUT" ]; then
    err "Build output not found at $BUILD_OUTPUT"
    return 1
  fi

  log "Deploying $STORY_NAME → $DEPLOY_DIR/$URL_PATH/"
  sudo mkdir -p "$DEPLOY_DIR/$URL_PATH"
  sudo rsync -a --delete "$BUILD_OUTPUT/" "$DEPLOY_DIR/$URL_PATH/"
  log "$STORY_NAME deployed."
}

# ── Main ──

case "${1:-all}" in
  --landing)
    deploy_landing
    ;;
  all)
    deploy_landing
    for STORY in "${!DEMOS[@]}"; do
      build_and_deploy "$STORY" "${DEMOS[$STORY]}"
    done
    log "All demos deployed to $DEPLOY_DIR"
    ;;
  *)
    # Single story by name
    STORY="$1"
    if [ -z "${DEMOS[$STORY]}" ]; then
      err "Unknown demo: $STORY"
      err "Available: ${!DEMOS[*]}"
      exit 1
    fi
    deploy_landing
    build_and_deploy "$STORY" "${DEMOS[$STORY]}"
    ;;
esac

echo ""
log "Done. Verify at https://demos.sharpee.net"
