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

# ── Guard: the service must serve the tree this script is about to build ──
# This script derives its paths from its own location, while the unit's
# WorkingDirectory is absolute. Run it from a SECOND checkout and it builds
# here, then restarts a service reading from there — and the failure is
# SILENT: systemctl reports active, the deploy prints success, and the site
# keeps serving the other checkout's old build. That is exactly what happened
# on 2026-08-10, when sharpee.net sat months stale (a `sharpee_v2` path in the
# unit) through a deploy that reported no error at all.
# Checked before the build so a misconfigured host fails in a second, not
# after `npm ci`.
SERVICE_DIR="$(systemctl show "$SERVICE" -p WorkingDirectory --value 2>/dev/null || true)"
if [ -n "$SERVICE_DIR" ] && [ "$SERVICE_DIR" != "$WEBSITE_DIR" ]; then
  err "$SERVICE serves:  $SERVICE_DIR"
  err "this script builds: $WEBSITE_DIR"
  err "Deploying would report success and change nothing. Either run deploy.sh from"
  err "the checkout the service reads, or repoint the unit at this one:"
  err "  sudo sed -i 's|^WorkingDirectory=.*|WorkingDirectory=$WEBSITE_DIR|' /etc/systemd/system/$SERVICE.service"
  err "  sudo systemctl daemon-reload"
  exit 1
fi

# ── Analytics data directory ──
# The /api/p collector appends JSONL here and mints its IP-hash salt here on
# first use. It lives OUTSIDE the repo deliberately: a deploy's `git pull`
# must never be able to touch collected data, and the data must survive a
# checkout being moved or rebuilt.
#
# Created here rather than by the app, because /var/lib needs root and the
# service runs as an ordinary user. The collector is written to swallow every
# failure — a visitor must never see an analytics error — which is exactly why
# a missing directory has to be caught HERE. Silently collecting nothing is
# the failure mode this check exists to prevent.
ANALYTICS_DIR="${SHARPEE_ANALYTICS_DIR:-/var/lib/sharpee-analytics}"
if [ ! -d "$ANALYTICS_DIR" ]; then
  log "Creating analytics directory $ANALYTICS_DIR ..."
  sudo mkdir -p "$ANALYTICS_DIR"
  sudo chown "$(id -un):$(id -gn)" "$ANALYTICS_DIR"
  sudo chmod 750 "$ANALYTICS_DIR"
fi
if [ ! -w "$ANALYTICS_DIR" ]; then
  err "$ANALYTICS_DIR exists but is not writable by $(id -un)."
  err "The site would run and collect nothing, silently. Fix with:"
  err "  sudo chown $(id -un) $ANALYTICS_DIR"
  exit 1
fi

if [ "$1" != "--no-pull" ]; then
  log "Pulling latest from main ..."
  git pull --ff-only
fi

# ── Workspace dependencies for the platform build ──
# The playground bundle below is built by repokit out of the pnpm workspace,
# which is a DIFFERENT dependency tree from the website's own npm one further
# down. A pull that changes pnpm-lock.yaml leaves this host's node_modules
# stale, and the failure is indirect: repokit reports a missing package rather
# than a missing install. Retiring zifmia/shite/interpreter on 2026-08-13
# changed that lockfile, which is exactly the case that would bite.
#
# --frozen-lockfile because a deploy host should install what the commit says
# and fail if it cannot, never silently resolve something newer.
#
# Guarded like the playground step: the website deploy does not depend on the
# pnpm workspace, so a failure here warns rather than aborting the site.
if command -v pnpm >/dev/null 2>&1; then
  log "Installing workspace dependencies (pnpm install --frozen-lockfile) ..."
  ( cd "$REPO_ROOT" && pnpm install --frozen-lockfile ) \
    || warn "pnpm install failed — the playground build below will likely fail too."
else
  warn "pnpm not found — skipping workspace install; the playground build needs it."
fi

# ── Playground bundle (ADR-191) — gitignored, so (re)build it on deploy. ──
# Requires the platform toolchain (pnpm workspace + built packages) on this
# host. Guarded: a failure warns but never aborts the website deploy.
#
# ./repokit bootstraps its own engine if tools/repokit/dist/ is missing, which
# is the normal state on a deploy host: that dist is gitignored so git pull
# never supplies it, and tsf build deliberately skips repokit. Nothing extra
# is needed here — see the repokit wrapper for why the obvious manual fix
# does not work on its own. (plover, 2026-08-13.)

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
  # Prove the collector answers, rather than assuming it does. It swallows its
  # own failures by design, so this is the only place a broken endpoint can
  # surface — and a site that quietly stops counting looks exactly like a site
  # nobody visited.
  #
  # The "bot" in the User-Agent is deliberate: the collector's bot filter
  # matches it, so this probes liveness without writing a fake visit into the
  # data every time anyone deploys.
  if curl -fsS -X POST http://localhost:3017/api/p \
       -H 'Content-Type: application/json' \
       -H 'User-Agent: deploy-healthcheck-bot' \
       -d '{"type":"deploy-check"}' >/dev/null 2>&1; then
    log "Analytics collector responding; data in $ANALYTICS_DIR."
  else
    warn "analytics collector did not answer at /api/p — the site is up, but"
    warn "nothing is being recorded. Check: sudo journalctl -u $SERVICE -n 50"
  fi
else
  err "$SERVICE failed to start. Check: sudo journalctl -u $SERVICE -n 50"
  exit 1
fi
