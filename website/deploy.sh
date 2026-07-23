#!/bin/bash
#
# website/deploy.sh — Build and (re)deploy the Sharpee documentation website.
# =========================================================================
# Run from anywhere on the server after pushing changes to main.
# Pulls latest, installs deps, builds the Next.js app, and restarts the
# systemd service that `next start` runs behind Apache (sharpee-website).
#
# Usage:
#   ./website/deploy.sh            # pull + build + restart
#   ./website/deploy.sh --no-pull  # build current working tree + restart
#   ./website/deploy.sh --setup    # one-time: install systemd unit + apache vhost
#
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBSITE_DIR="$REPO_ROOT/website"
SERVICE=sharpee-website

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[website]${NC} $1"; }
warn() { echo -e "${YELLOW}[website]${NC} $1"; }
err()  { echo -e "${RED}[website]${NC} $1"; }

# ── One-time setup: install the systemd unit and Apache vhost ──
if [ "$1" = "--setup" ]; then
  log "Installing systemd unit $SERVICE.service ..."
  sudo cp "$WEBSITE_DIR/deploy/$SERVICE.service" /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE"

  log "Installing Apache vhost sharpee.net.conf ..."
  sudo cp "$WEBSITE_DIR/deploy/sharpee.net.conf" /etc/apache2/sites-available/
  sudo a2ensite sharpee.net
  sudo systemctl reload apache2

  warn "Setup staged. Next steps (manual):"
  warn "  1. Repoint DNS: sharpee.net + www.sharpee.net A records -> 66.228.55.224"
  warn "  2. After DNS propagates, get the cert:"
  warn "     sudo certbot --apache -d sharpee.net -d www.sharpee.net"
  warn "  3. Build + start the app:  ./website/deploy.sh"
  exit 0
fi

# ── Normal deploy: pull, build, restart ──
cd "$REPO_ROOT"

if [ "$1" != "--no-pull" ]; then
  log "Pulling latest from main ..."
  git pull --ff-only
fi

# ── Playground bundle (ADR-191) — gitignored, so (re)build it on deploy. ──
# Requires the platform toolchain (pnpm workspace + built packages) on this
# host. Guarded: a failure warns but never aborts the website deploy.
log "Rebuilding the playground bundle (./repokit build --playground) ..."
if ( cd "$REPO_ROOT" && ./repokit build --playground ); then
  log "Playground bundle refreshed at website/public/playground/."
else
  warn "playground build failed — /playground will 404 until './repokit build --playground' succeeds on this host."
fi

cd "$WEBSITE_DIR"
log "Installing dependencies (npm ci) ..."
npm ci

log "Building (next build) ..."
npm run build

log "Restarting $SERVICE ..."
sudo systemctl restart "$SERVICE"
sleep 2
if sudo systemctl is-active --quiet "$SERVICE"; then
  log "Deployed. $SERVICE is active on port 3017."
else
  err "$SERVICE failed to start. Check: sudo journalctl -u $SERVICE -n 50"
  exit 1
fi
