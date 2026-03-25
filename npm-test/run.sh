#!/usr/bin/env bash
# -------------------------------------------------------------------
# Sharpee NPM Regression Test
#
# Copies this project to a temp folder outside the repo, installs
# dependencies from the npm registry, compiles, and runs transcript
# tests. Proves the published packages work in isolation.
# -------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMPDIR_BASE=""

# Cleanup on exit (success or failure)
cleanup() {
  if [[ -n "$TMPDIR_BASE" && -d "$TMPDIR_BASE" ]]; then
    echo ""
    echo "Cleaning up temp directory: $TMPDIR_BASE"
    rm -rf "$TMPDIR_BASE"
  fi
}
trap cleanup EXIT

# Create isolated temp directory
TMPDIR_BASE=$(mktemp -d)
echo "=== Sharpee NPM Regression Test ==="
echo ""
echo "Temp directory: $TMPDIR_BASE"
echo ""

# Copy project files (not node_modules or dist)
echo "--- Copying test project ---"
cp "$SCRIPT_DIR/package.json" "$TMPDIR_BASE/"
cp "$SCRIPT_DIR/tsconfig.json" "$TMPDIR_BASE/"
cp -r "$SCRIPT_DIR/src" "$TMPDIR_BASE/src"
cp -r "$SCRIPT_DIR/tests" "$TMPDIR_BASE/tests"
echo "Copied: package.json, tsconfig.json, src/, tests/"

# Install from npm registry
echo ""
echo "--- Installing npm packages ---"
cd "$TMPDIR_BASE"
npm install --no-fund --no-audit 2>&1
echo ""

# Show installed versions
echo "--- Installed versions ---"
npm ls @sharpee/sharpee @sharpee/transcript-tester --depth=0 2>/dev/null || true
echo ""

# Compile the story
echo "--- Compiling story ---"
npx tsc
echo "Compiled to dist/"
echo ""

# Run transcript tests
echo "--- Running transcript tests ---"
echo ""

PASS=0
FAIL=0
ERRORS=""

for transcript in tests/transcripts/*.transcript; do
  name=$(basename "$transcript" .transcript)
  if npx transcript-test . "$transcript" 2>&1; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS  FAIL: $name\n"
  fi
  echo ""
done

# Report
echo "==========================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "==========================================="

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
else
  echo ""
  echo "All transcript tests passed against npm packages."
  exit 0
fi
