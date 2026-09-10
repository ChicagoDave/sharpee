#!/bin/bash
#
# website/scripts/fix-node-modules-owner.sh — reclaim root-owned npm artifacts.
# ============================================================================
# Hands every entry under website/node_modules/ back to the user who deploys,
# so `npm ci` can unlink and replace them again.
#
# WHY THIS EXISTS
# ---------------
# npm writes into node_modules/ as whoever invoked it. Run ANY npm command in
# website/ under sudo — `npm audit fix`, `npm install`, `npm ci` — and every
# package it rewrites comes back owned by root. The next ordinary-user deploy
# then dies on the first file it tries to replace:
#
#   npm error code EACCES
#   npm error syscall unlink
#   npm error path .../node_modules/baseline-browser-mapping/LICENSE.txt
#
# That is a permissions problem, not the dependency problem it looks like, and
# it does not clear on its own: `npm ci` removes node_modules wholesale, which
# is exactly the operation it lacks permission to perform.
#
# deploy.sh already refuses to run as root (see its guard, and the ES5 hazard
# documented there). This script covers the other half — an npm command run by
# hand under sudo ALONGSIDE the deploy, which that guard cannot see. Measured
# instance: 2026-09-10, `npm audit fix` under sudo left 1016 entries across
# eight packages (sharp, js-yaml, browserslist, baseline-browser-mapping and
# browserslist's four dependencies) owned by root, blocking the deploy.
#
# The durable fix is not to run npm under sudo in website/ at all. This script
# is the repair for when that has already happened.
#
# USAGE
# -----
#   sudo ./website/scripts/fix-node-modules-owner.sh
#
# Idempotent: a run with nothing to repair changes nothing and exits 0.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET="$REPO_ROOT/website/node_modules"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[owner-fix]${NC} $1"; }
warn() { echo -e "${YELLOW}[owner-fix]${NC} $1"; }
err()  { echo -e "${RED}[owner-fix]${NC} $1"; }

# ── Who should own these files ──
# Under sudo, SUDO_USER is the invoking account — the one that runs deploy.sh
# and therefore the one npm must be able to write as. Without sudo we fall back
# to the owner of the repository itself, which is the same account on a normal
# checkout. Never assume a hardcoded name: this repo is deployed from more than
# one host.
OWNER="${SUDO_USER:-$(stat -c '%U' "$REPO_ROOT")}"
GROUP="$(id -gn "$OWNER")"

if [ ! -d "$TARGET" ]; then
  log "nothing to do — $TARGET does not exist"
  exit 0
fi

BEFORE="$(find "$TARGET" ! -user "$OWNER" -printf . 2>/dev/null | wc -c)"

if [ "$BEFORE" -eq 0 ]; then
  log "already clean — every entry under node_modules/ is owned by $OWNER"
  exit 0
fi

warn "$BEFORE entries under node_modules/ are not owned by $OWNER"

# Show which top-level packages are affected before touching anything, so a
# surprising result (the whole tree, rather than the handful npm just rewrote)
# is visible rather than silently repaired.
warn "affected packages:"
find "$TARGET" -maxdepth 2 ! -user "$OWNER" -printf '  %u  %p\n' 2>/dev/null \
  | sort -u | head -20

if [ "$(id -u)" -ne 0 ]; then
  err "cannot repair without root — re-run as:"
  err "  sudo ./website/scripts/fix-node-modules-owner.sh"
  exit 1
fi

log "returning $BEFORE entries to $OWNER:$GROUP ..."

# -h so a symlink is retargeted as the link itself, never followed to a file
# outside node_modules/. npm creates .bin/ links and workspace links freely.
find "$TARGET" ! -user "$OWNER" -exec chown -h "$OWNER:$GROUP" {} +

AFTER="$(find "$TARGET" ! -user "$OWNER" -printf . 2>/dev/null | wc -c)"

if [ "$AFTER" -ne 0 ]; then
  err "FAILED — $AFTER entries still not owned by $OWNER"
  exit 1
fi

log "OK — $BEFORE entries returned to $OWNER:$GROUP"
log "deploy again with: ./website/deploy.sh"
