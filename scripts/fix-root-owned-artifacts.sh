#!/bin/bash
#
# scripts/fix-root-owned-artifacts.sh — repair a checkout damaged by a
# root-run deploy.
# =========================================================================
# Running `sudo ./website/deploy.sh` (rather than letting the script call
# sudo for the two steps that need it) leaves every artifact it produces
# owned by root: website/.next, website/node_modules, packages/*/dist,
# tools/repokit/dist, .git/ORIG_HEAD. The service runs as `dave` and every
# later build runs as `dave`, so those builds then fail with EACCES — and
# the repokit engine compiled during that run is worse than broken (see
# below), it is silently wrong.
#
# This script does only the part that needs privilege: restoring ownership.
# Rebuilding is left to the ordinary, unprivileged build commands.
#
# Idempotent: safe to run repeatedly; a healthy checkout is left unchanged.
#
# Usage:  sudo ./scripts/fix-root-owned-artifacts.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OWNER=dave
GROUP=dave

if [ "$(id -u)" -ne 0 ]; then
  echo "error: must run as root — sudo $0" >&2
  exit 1
fi

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "error: $REPO_ROOT is not a git checkout" >&2
  exit 1
fi

BEFORE="$(find "$REPO_ROOT" ! -user "$OWNER" -print 2>/dev/null | wc -l)"
echo "[fix] $BEFORE path(s) under $REPO_ROOT are not owned by $OWNER"

if [ "$BEFORE" -gt 0 ]; then
  echo "[fix] restoring ownership to $OWNER:$GROUP ..."
  chown -R "$OWNER:$GROUP" "$REPO_ROOT"
  AFTER="$(find "$REPO_ROOT" ! -user "$OWNER" -print 2>/dev/null | wc -l)"
  echo "[fix] remaining not owned by $OWNER: $AFTER"
fi

# ── The analytics directory, which lives OUTSIDE the repo ──
# deploy.sh creates it on first run with `chown $(id -un)`, so a root-run
# deploy makes it root:root and every later deploy as the service user is
# refused by deploy.sh's own writability guard. Repaired here because it is
# the same incident's damage, reached by the same wrong `sudo`.
#
# Recursive on purpose. Chowning only the directory lets the service create
# NEW files while leaving the existing IP-hash salt and collected .jsonl
# unwritable — and the collector swallows every failure by design, so that
# state collects nothing and looks exactly like a site nobody visited. The
# data is preserved, never removed: chown changes ownership, not content.
ANALYTICS_DIR="${SHARPEE_ANALYTICS_DIR:-/var/lib/sharpee-analytics}"
if [ -d "$ANALYTICS_DIR" ]; then
  ANALYTICS_BAD="$(find "$ANALYTICS_DIR" ! -user "$OWNER" -print 2>/dev/null | wc -l)"
  if [ "$ANALYTICS_BAD" -gt 0 ]; then
    echo "[fix] $ANALYTICS_DIR: $ANALYTICS_BAD path(s) not owned by $OWNER — repairing ..."
    chown -R "$OWNER:$GROUP" "$ANALYTICS_DIR"
    echo "[fix] $ANALYTICS_DIR now $(stat -c '%U:%G %a' "$ANALYTICS_DIR"), $(find "$ANALYTICS_DIR" -type f | wc -l) data file(s) preserved."
  else
    echo "[fix] $ANALYTICS_DIR already owned by $OWNER."
  fi
else
  echo "[fix] $ANALYTICS_DIR does not exist yet — deploy.sh will create it."
fi

if [ "$BEFORE" -eq 0 ] && [ "${ANALYTICS_BAD:-0}" -eq 0 ]; then
  echo "[fix] nothing to repair."
  exit 0
fi

cat <<'EOF'

[fix] Ownership restored. Now, as dave (NOT root), discard the artifacts a
      root build produced and rebuild them:

        cd /home/dave/repos/sharpee
        rm -rf tools/repokit/dist tools/repokit/tsconfig.tsbuildinfo
        rm -rf website/.next
        ./website/deploy.sh --no-pull        # never with sudo

      tools/repokit/dist in particular must be discarded rather than reused.
      A root-run build resolves `tsc` off PATH instead of the workspace, and
      this host's /usr/local/bin/tsc is TypeScript 4.3.4, which does not know
      the `ES2022` target this repo compiles with. It reports that as a config
      error, silently falls back to its ES5 defaults, and EMITS ANYWAY. Under
      ES5 every `for...of` over an iterator is downlevelled to an index loop
      over `.length` — which is `undefined` on an iterator — so the loop body
      never runs. The engine loads and reports nonsense: `repokit grammar`
      read the stdlib action ids as 0 and failed the build claiming the
      constants file had moved.
EOF
