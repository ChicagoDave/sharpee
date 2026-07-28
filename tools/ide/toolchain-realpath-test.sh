#!/usr/bin/env bash
# -------------------------------------------------------------------
# toolchain-realpath-test.sh — the rule 13a REAL-PATH TEST for ADR-279 D4's
# bundled toolchain, and the mechanical stand-in for Acceptance 6 ("on a machine
# with no Node, no npm, and no Sharpee checkout…").
#
# Owner context: tools/ide — packaging.
#
# Public interface:
#   toolchain-realpath-test.sh <toolchain-dir | resources-dir | .app>
#
# Drives the ASSEMBLED shim — no stub, no injected path, no monorepo. The
# environment is scrubbed with `env -i`: PATH reduced to system binaries, HOME
# pointed at a fresh empty directory (no .npmrc, no global node_modules), and
# the work directory placed outside any checkout. If the toolchain reaches for
# anything it does not ship, the run fails here rather than on an author's Mac.
#
# The scrub is asserted before any assertion about the toolchain: a PATH that
# still carries node/npm/npx would let this script pass while proving nothing.
# That guard is the difference between a real-path test and theatre.
#
# Exit 0 = the bundled toolchain is self-contained. Any other exit = it is not.
# -------------------------------------------------------------------
set -uo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

fail() { echo "FAIL: $*" >&2; exit 1; }
ok()   { echo "  ✓ $*"; }

[ $# -eq 1 ] || fail "usage: toolchain-realpath-test.sh <toolchain-dir | resources-dir | .app>"

# --- Locate the assembled toolchain --------------------------------
# Accepts whichever handle the caller has: the toolchain itself, the Resources
# directory vendor-toolchain.sh was pointed at, or a built .app.
target="${1%/}"
if [ -x "$target/bin/sharpee" ]; then
  TOOLCHAIN="$target"
elif [ -x "$target/toolchain/bin/sharpee" ]; then
  TOOLCHAIN="$target/toolchain"
elif [ -x "$target/Contents/Resources/toolchain/bin/sharpee" ]; then
  TOOLCHAIN="$target/Contents/Resources/toolchain"
else
  fail "no executable bin/sharpee under '$target'.
  Assemble one first: tools/ide/vendor-toolchain.sh <resources-dir>"
fi
echo "=== Real-path test: $TOOLCHAIN ==="

# --- Sandbox --------------------------------------------------------
SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT
FAKE_HOME="$SANDBOX/home"
WORK="$SANDBOX/work"
mkdir -p "$FAKE_HOME" "$WORK"

# The scrubbed environment, defined once so every step below is provably run
# under the same no-toolchain conditions.
readonly SCRUBBED_PATH="/usr/bin:/bin:/usr/sbin:/sbin"
sealed() { env -i HOME="$FAKE_HOME" PATH="$SCRUBBED_PATH" USER=realpath-test "$@"; }

# --- 0. Assert the scrub is real ------------------------------------
for forbidden in node npm npx sharpee pnpm; do
  if sealed command -v "$forbidden" >/dev/null 2>&1; then
    fail "'$forbidden' is reachable on the scrubbed PATH ($SCRUBBED_PATH).
  This test cannot prove self-containment while a system toolchain is visible."
  fi
done
ok "scrubbed environment carries no node/npm/npx/sharpee/pnpm"

# --- 1. The CLI answers at all --------------------------------------
version_out="$(sealed "$TOOLCHAIN/bin/sharpee" --version 2>&1)" \
  || fail "bundled 'sharpee --version' exited non-zero:
$version_out"
echo "$version_out" | grep -Eq 'Sharpee [0-9]+\.[0-9]+\.[0-9]+ · Chord [0-9]+\.[0-9]+\.[0-9]+' \
  || fail "unexpected --version output (the status bar and ADR-258 D9 check parse this):
$version_out"
ok "sharpee --version → $version_out"

# --- 2. Scaffold a story, outside any checkout ----------------------
init_out="$(cd "$WORK" && sealed "$TOOLCHAIN/bin/sharpee" init mystory -y 2>&1)" \
  || fail "bundled 'sharpee init' exited non-zero:
$init_out"
story_file="$(find "$WORK/mystory" -maxdepth 1 -name '*.story' | head -1)"
[ -n "$story_file" ] || fail "'sharpee init' scaffolded no .story file under $WORK/mystory:
$init_out"
ok "sharpee init mystory -y → $(basename "$story_file")"

# --- 3. Build it ----------------------------------------------------
# The step that exercises the whole sealed closure: the Chord compiler, the
# generated browser entry, esbuild resolving @sharpee/* through NODE_PATH, and
# platform-browser's styles.
build_out="$(cd "$WORK/mystory" && sealed "$TOOLCHAIN/bin/sharpee" build "$story_file" 2>&1)" \
  || fail "bundled 'sharpee build' exited non-zero:
$build_out"

game_js="$(find "$WORK/mystory/dist/web" -name 'game.js' | head -1)"
[ -n "$game_js" ] || fail "build reported success but emitted no game.js (silent no-op):
$build_out"
[ -s "$game_js" ] || fail "build emitted an EMPTY game.js at $game_js"
ok "sharpee build → $(basename "$(dirname "$game_js")")/game.js ($(wc -c < "$game_js" | tr -d ' ') bytes)"

# Engine CSS proves platform-browser resolved from the sealed node_modules
# rather than from a project or global install that is not there.
[ -f "$(dirname "$game_js")/engine.css" ] \
  || fail "no engine.css beside game.js — platform-browser styles did not resolve."
ok "platform-browser styles resolved from the sealed toolchain"

echo "PASS — the bundled toolchain is self-contained (ADR-279 Acceptance 6)."
