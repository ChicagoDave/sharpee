#!/usr/bin/env bash
# -------------------------------------------------------------------
# Sharpee NPM Regression Test — Dungeo
#
# Copies Dungeo's source to a temp folder outside the repo, installs
# dependencies from the npm registry, compiles, and runs the walkthrough
# chain. Proves the published packages can compile and run a real-world
# story (191 rooms, NPCs, daemons, custom actions).
#
# Usage:
#   ./npm-test-dungeo/run.sh              # Full: install, compile, walkthroughs
#   ./npm-test-dungeo/run.sh --quick      # Compile-only (no walkthroughs)
#   ./npm-test-dungeo/run.sh --walkthrough # Local build, walkthroughs only
# -------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUNGEO_SRC="$REPO_ROOT/stories/dungeo/src"
DUNGEO_WALKTHROUGHS="$REPO_ROOT/stories/dungeo/walkthroughs"
QUICK=false
WALKTHROUGH=false
TMPDIR_BASE=""

case "${1:-}" in
  --quick)      QUICK=true ;;
  --walkthrough) WALKTHROUGH=true ;;
esac

# Verify Dungeo source exists
if [[ ! -d "$DUNGEO_SRC" ]]; then
  echo "ERROR: Dungeo source not found at $DUNGEO_SRC"
  exit 1
fi

# ── Walkthrough mode: skip install/compile, use local bundle ──

if $WALKTHROUGH; then
  SHARPEE_CLI="$REPO_ROOT/dist/cli/sharpee.js"
  if [[ ! -f "$SHARPEE_CLI" ]]; then
    echo "ERROR: Bundle not found at $SHARPEE_CLI — run ./build.sh -s dungeo first"
    exit 1
  fi

  echo "=== Sharpee NPM Regression Test — Dungeo (walkthrough only) ==="
  echo ""
  echo "Using bundle: $SHARPEE_CLI"
  echo ""

  node "$SHARPEE_CLI" --test --chain "$DUNGEO_WALKTHROUGHS"/wt-*.transcript
  exit $?
fi

# ── Full mode: isolated temp directory with npm packages ──

cleanup() {
  if [[ -n "$TMPDIR_BASE" && -d "$TMPDIR_BASE" ]]; then
    echo ""
    echo "Cleaning up temp directory: $TMPDIR_BASE"
    rm -rf "$TMPDIR_BASE"
  fi
}
trap cleanup EXIT

TMPDIR_BASE=$(mktemp -d)
echo "=== Sharpee NPM Regression Test — Dungeo ==="
echo ""
echo "Temp directory: $TMPDIR_BASE"
echo ""

# Copy project scaffold
echo "--- Copying project files ---"
cp "$SCRIPT_DIR/package.json" "$TMPDIR_BASE/"
cp "$SCRIPT_DIR/tsconfig.json" "$TMPDIR_BASE/"

# Copy Dungeo source (excluding browser/react entry points)
cp -r "$DUNGEO_SRC" "$TMPDIR_BASE/src"
rm -f "$TMPDIR_BASE/src/browser-entry.ts" "$TMPDIR_BASE/src/react-entry.tsx"

# Copy walkthroughs
mkdir -p "$TMPDIR_BASE/walkthroughs"
cp "$DUNGEO_WALKTHROUGHS"/wt-*.transcript "$TMPDIR_BASE/walkthroughs/"
echo "Copied: package.json, tsconfig.json, src/ ($( ls "$TMPDIR_BASE/src/" | wc -l | tr -d ' ') entries), $(ls "$TMPDIR_BASE/walkthroughs/" | wc -l | tr -d ' ') walkthroughs"

# Install from npm registry
echo ""
echo "--- Installing npm packages ---"
cd "$TMPDIR_BASE"
npm install --no-fund --no-audit 2>&1
echo ""

# Show installed versions
echo "--- Installed versions ---"
npm ls @sharpee/sharpee @sharpee/engine @sharpee/world-model @sharpee/stdlib --depth=0 2>/dev/null || true
echo ""

# Compile the story
echo "--- Compiling Dungeo ---"
npx tsc
echo "Compiled to dist/ ($( find dist -name '*.js' | wc -l | tr -d ' ') files)"
echo ""

if $QUICK; then
  echo "==========================================="
  echo "  RESULT: Compilation succeeded (--quick)"
  echo "==========================================="
  exit 0
fi

# Run walkthrough chain
echo "--- Running walkthrough chain ---"
echo ""

npx transcript-test . --chain walkthroughs/wt-*.transcript
RESULT=$?

echo ""
echo "Ran from: $(pwd)"
exit $RESULT
