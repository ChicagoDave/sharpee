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

# ── Guard: this script must NOT be run as root ──
# It calls sudo itself for the three steps that need it (the analytics dir,
# the systemd restart, --setup). Running the whole thing under sudo instead
# leaves every artifact it builds owned by root — website/.next,
# website/node_modules, packages/*/dist, tools/repokit/dist — and the service
# runs as an ordinary user, as does every later build. Those builds then die
# on EACCES.
#
# The worse half is silent: a root build resolves `tsc` off PATH rather than
# the workspace, and a tsc too old for this repo's ES2022 target emits ES5
# ANYWAY after reporting the target as a config error. Downlevelled ES5 turns
# `for...of` over an iterator into an index loop over `.length` — undefined on
# an iterator — so the engine runs and reads every such loop as empty.
# `repokit grammar` reported 0 stdlib action ids and blamed a moved file.
# Repair with scripts/fix-root-owned-artifacts.sh. (plover, 2026-08-14.)
if [ "$(id -u)" -eq 0 ]; then
  err "do not run this script as root (or with sudo)."
  err "It calls sudo itself for the steps that need it. Running it as root"
  err "leaves .next/, node_modules/ and every dist/ owned by root, and builds"
  err "the repokit engine with the wrong tsc — which fails silently, not loudly."
  err "Run it as the service user:  ./website/deploy.sh"
  exit 1
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
  err "The site would run and collect nothing, silently."
  err "Usually means an earlier deploy was run under sudo, so the directory"
  err "was created owned by root. Fix with:"
  err "  sudo ./scripts/fix-root-owned-artifacts.sh"
  err "or directly — note the -R, so the existing salt and .jsonl data become"
  err "writable too, not just the directory:"
  err "  sudo chown -R $(id -un):$(id -gn) $ANALYTICS_DIR"
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

# ── Fernhill browser client — same deal: /play embeds
# public/web/fernhill/index.html in an iframe, generated by repokit's --browser
# mirror (mirrorToWebsite) and ignored by .gitignore:152, so git pull can never
# supply it either. Without it a fresh checkout serves /play with an empty
# iframe. That regressed once: ADR-302 D16 moved the story from stories/ to
# branch-stories/ (18d65ab3, 2026-08-05), repokit's resolver knew only
# stories/|tutorials/, the mirror stopped running, and nobody noticed for nine
# days — the artifact is untracked, so no test and no git status mentioned it.
#
# ── ONE build, both clients. ──
# `--browser` and `--playground` are independent flags on a single runBuild
# (tools/repokit/src/commands/build.ts), which emits both clients after ONE
# platform pass. Two separate `./repokit build` invocations each recompile all
# ~30 packages and re-run the tsf ESM pass first, so splitting them made the
# deploy pay for the whole platform build twice. Keep them in one command.
log "Rebuilding the web clients (./repokit build fernhill --browser --playground) ..."
if ( cd "$REPO_ROOT" && ./repokit build fernhill --browser --playground ); then
  log "Web clients rebuilt (Fernhill + playground)."
else
  warn "client build failed — /play and/or /playground may be broken; see above."
fi

# Assert the ARTIFACTS, not the exit code — and assert each one separately, so a
# partial build names which surface broke rather than reporting a generic
# failure. A build that reports success while mirroring nothing looks identical
# to one that worked, which is precisely how the nine-day outage stayed
# invisible. Check the exact files the pages request.
if [ ! -f "$WEBSITE_DIR/public/web/fernhill/index.html" ]; then
  warn "public/web/fernhill/index.html is MISSING — /play is broken even though the build step above did not fail."
fi
if [ ! -d "$WEBSITE_DIR/public/playground" ]; then
  warn "public/playground/ is MISSING — /playground is broken even though the build step above did not fail."
fi

# ── The playground's seeded examples must actually compile ──
# They are strings in a website source file, so nothing in the platform's own
# test suite ever sees them: they drifted a whole Chord major behind (the
# ADR-298 fielded story block) and the starter a first-time visitor lands on
# failed with three parse errors. Checked here because this is the only step
# that has both the website source and the workspace's @sharpee/chord to hand.
#
# Warn rather than abort, matching the playground step above: a stale example
# is a bad first impression, not a reason to leave sharpee.net unbuilt.
if command -v node >/dev/null 2>&1; then
  log "Checking the playground examples compile ..."
  ( cd "$REPO_ROOT" && node scripts/playground-examples-check.mjs ) \
    || warn "playground examples do not compile — see above. The editor will open on a broken story."
fi

cd "$WEBSITE_DIR"
log "Installing dependencies (npm ci) ..."
npm ci

# ── Dependency advisories — report, never mutate ──
# `npm ci` installs the lockfile EXACTLY, which is the whole point: the deploy
# gets what the commit says. That also means a fix is only real once
# package-lock.json is committed — `npm audit fix` run on a host patches that
# host's node_modules and nothing else, and the next deploy silently reinstalls
# the vulnerable versions over it.
#
# So this step reports and never repairs. Putting `npm audit fix` here would
# mutate dependencies mid-deploy, ship a tree nobody built or tested, and
# undo the determinism `npm ci` and the pnpm `--frozen-lockfile` above exist
# to provide.
#
# Warns rather than aborts, matching the playground and examples steps: an
# advisory published upstream an hour ago is worth knowing about, but it is
# not a reason to block an unrelated content fix from reaching the site.
log "Auditing website dependencies (npm audit --audit-level=high) ..."
if npm audit --audit-level=high >/dev/null 2>&1; then
  log "No high or critical advisories."
else
  warn "npm audit reports high/critical advisories:"
  npm audit --audit-level=high || true
  warn "Fix with 'npm audit fix' in website/ and COMMIT package-lock.json —"
  warn "npm ci installs the lockfile exactly, so an uncommitted fix is lost."
fi

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
