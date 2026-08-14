#!/bin/bash
#
# scripts/fix-global-tsc.sh — replace this host's orphaned global TypeScript.
# =========================================================================
# /usr/local/bin/tsc on plover was TypeScript 4.3.4, installed 2021-06-27
# under the /usr/local npm prefix. The current npm's global prefix is /usr, so
# `npm ls -g` does not even list it — it is an orphan from an older Node, and
# invisible to every ordinary inventory.
#
# It is not merely stale, it is actively dangerous. 4.3.4 predates the ES2022
# target this repo compiles with. Handed tsconfig.base.json it reports the
# target as a config error, silently falls back to its ES5 defaults, and EMITS
# ANYWAY. Downlevelled ES5 rewrites every `for...of` over an iterator as an
# index loop over `.length` — `undefined` on an iterator — so the loop body
# never runs and the output is wrong rather than absent. That is how a
# sudo-run website/deploy.sh built a repokit engine whose `grammar` step read
# 0 stdlib action ids out of a file containing 70.
#
# Nothing in this repo needs a global tsc — every package resolves its own.
# This upgrades rather than removes it, so that anything ELSE on the host
# expecting `tsc` on PATH keeps working, and pins it to the same 5.9.3 the
# workspace resolves, so a stray PATH resolution now produces byte-identical
# output to a workspace one instead of silently different output.
#
# Idempotent: re-running on an already-fixed host reinstalls the same version
# and re-verifies.
#
# Usage:  sudo ./scripts/fix-global-tsc.sh
#
set -euo pipefail

TARGET_VERSION=5.9.3
PREFIX=/usr/local

if [ "$(id -u)" -ne 0 ]; then
  echo "error: must run as root — sudo $0" >&2
  exit 1
fi

if [ -x "$PREFIX/bin/tsc" ]; then
  echo "[tsc] current: $("$PREFIX/bin/tsc" --version) at $PREFIX/bin/tsc"
else
  echo "[tsc] no tsc at $PREFIX/bin/tsc — installing fresh"
fi

echo "[tsc] installing typescript@$TARGET_VERSION into $PREFIX ..."
npm install -g --prefix "$PREFIX" "typescript@$TARGET_VERSION"

INSTALLED="$("$PREFIX/bin/tsc" --version)"
echo "[tsc] now: $INSTALLED"
case "$INSTALLED" in
  "Version $TARGET_VERSION") ;;
  *) echo "error: expected Version $TARGET_VERSION, got '$INSTALLED'" >&2; exit 1 ;;
esac

# ── Acceptance test: the exact failure mode, end to end ──
# Compile the repokit extraction loop with the repo's target, then RUN the
# emitted code and count what it actually finds.
#
# It goes through a tsconfig.json ON PURPOSE. Given `--target ES2022` on the
# command line, 4.3.4 rejects the flag outright and emits nothing — a loud,
# harmless failure. Given the same target in a tsconfig it reports TS6046 and
# EMITS ANYWAY under its ES5 defaults, which is the quiet failure that reached
# production. Only the tsconfig path reproduces it, so only the tsconfig path
# can prove it is gone.
#
# For the same reason the assertion is on the runtime count, not on tsc's exit
# status: a broken tsc exits 2 here and still leaves a running program that
# reports 0 ids where there are 2. The exit code was never the signal.
PROBE="$(mktemp -d)"
trap 'rm -rf "$PROBE"' EXIT

cat > "$PROBE/probe.ts" <<'PROBE_TS'
const src = "TAKING: 'if.action.taking', DROPPING: 'if.action.dropping',";
const ids = new Set<string>();
for (const m of src.matchAll(/'(if\.action\.[a-z][a-z0-9_]*)'/g)) ids.add(m[1]);
console.log(ids.size);
PROBE_TS

cat > "$PROBE/tsconfig.json" <<'PROBE_CFG'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "skipLibCheck": true,
    "outDir": "./out"
  },
  "include": ["probe.ts"]
}
PROBE_CFG

"$PREFIX/bin/tsc" -p "$PROBE/tsconfig.json" || true

if [ ! -f "$PROBE/out/probe.js" ]; then
  echo "error: probe did not compile at all — $PREFIX/bin/tsc is unusable." >&2
  exit 1
fi

COUNT="$(node "$PROBE/out/probe.js")"
if [ "$COUNT" != "2" ]; then
  echo "error: the emitted probe found $COUNT ids, expected 2." >&2
  echo "error: this tsc still downlevels 'for...of' over an iterator, so it" >&2
  echo "error: produces code that runs and is wrong. Do not use it." >&2
  exit 1
fi

echo "[tsc] iterator probe passed (found $COUNT ids) — ES2022 emit is correct."
echo "[tsc] done."
