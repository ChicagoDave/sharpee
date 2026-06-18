#!/usr/bin/env bash
# -------------------------------------------------------------------
# Sharpee NPM Local-Build Test — Family Zoo
#
# Compiles and runs the familyzoo tutorial against the LOCALLY BUILT npm
# packages in ~/.tsf-publish (the output of `tsf build --npm`) — NOT the
# registry. Packs each needed @sharpee package into a tarball and installs
# via file: refs, so nothing escapes to npm. Proves the local build's npm
# output works for an external consumer BEFORE you publish.
#
# Sibling of npm-test-dungeo/ (which installs from the registry); this one
# closes the pre-publish gap by testing what `tsf build --npm` just staged.
#
# Usage:
#   ./npm-test-familyzoo/run.sh            # use existing ~/.tsf-publish staging
#   ./npm-test-familyzoo/run.sh --build    # run `tsf build --npm` first, then test
# -------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FZ_DIR="$REPO_ROOT/tutorials/familyzoo"
FZ_SRC="$FZ_DIR/src"
FZ_TRANSCRIPTS="$FZ_DIR/tests/transcripts"
STAGING="$HOME/.tsf-publish/sharpee"
TMPDIR_BASE=""

cleanup() {
  if [[ -n "$TMPDIR_BASE" && -d "$TMPDIR_BASE" ]]; then
    echo ""
    echo "Cleaning up temp directory: $TMPDIR_BASE"
    rm -rf "$TMPDIR_BASE"
  fi
}
trap cleanup EXIT

if [[ "${1:-}" == "--build" ]]; then
  echo "--- Building local npm packages (tsf build --npm) ---"
  ( cd "$REPO_ROOT" && tsf build --npm )
  echo ""
fi

# Preconditions
[[ -d "$FZ_SRC" ]] || { echo "ERROR: familyzoo source not found at $FZ_SRC"; exit 1; }
if [[ ! -d "$STAGING" ]]; then
  echo "ERROR: local npm staging not found at $STAGING"
  echo "Run \`tsf build --npm\` from the repo root (or re-run with --build) first."
  exit 1
fi

TMPDIR_BASE=$(mktemp -d)
VENDOR="$TMPDIR_BASE/vendor"
mkdir -p "$VENDOR"

echo "=== Sharpee NPM Local-Build Test — Family Zoo ==="
echo ""
echo "Temp directory: $TMPDIR_BASE"
echo "Local staging:  $STAGING"
echo ""

# 1. Pack the local @sharpee closure into tarballs + emit consumer package.json
echo "--- Packing local @sharpee packages (transitive closure) ---"
node "$SCRIPT_DIR/gen-consumer.mjs" "$STAGING" "$FZ_DIR/package.json" "$VENDOR" "$TMPDIR_BASE/package.json"
echo ""

# 2. Copy familyzoo source + transcripts + consumer tsconfig
echo "--- Copying familyzoo source + transcripts ---"
cp -r "$FZ_SRC" "$TMPDIR_BASE/src"
rm -f "$TMPDIR_BASE/src/browser-entry.ts"
mkdir -p "$TMPDIR_BASE/tests/transcripts"
cp "$FZ_TRANSCRIPTS"/*.transcript "$TMPDIR_BASE/tests/transcripts/"
cp "$SCRIPT_DIR/tsconfig.json" "$TMPDIR_BASE/tsconfig.json"
echo "Copied: src/ ($(ls "$TMPDIR_BASE/src" | wc -l | tr -d ' ') files), $(ls "$TMPDIR_BASE/tests/transcripts" | wc -l | tr -d ' ') transcripts"
echo ""

# 3. Install (local tarballs only for @sharpee; registry for third-party) + compile
cd "$TMPDIR_BASE"
echo "--- npm install (local @sharpee tarballs) ---"
npm install --no-fund --no-audit
echo ""
echo "--- Installed @sharpee versions ---"
npm ls --depth=0 2>/dev/null | grep '@sharpee/' || true
echo ""
echo "--- Compiling familyzoo (tsc) ---"
npx tsc
echo "Compiled to dist/ ($(find dist -name '*.js' | wc -l | tr -d ' ') files)"
echo ""

# 4. Run all transcripts
echo "--- Running familyzoo transcripts ---"
echo ""
PASS=0
FAIL=0
ERRORS=""
for transcript in tests/transcripts/*.transcript; do
  name=$(basename "$transcript" .transcript)
  if npx transcript-test . "$transcript"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS  FAIL: $name\n"
  fi
  echo ""
done

echo "==========================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "==========================================="
if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
echo ""
echo "All familyzoo transcripts passed against the LOCAL npm build."
exit 0
