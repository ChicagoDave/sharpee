#!/usr/bin/env bash
# -------------------------------------------------------------------
# Sharpee NPM Regression Test — Dungeo
#
# Copies Dungeo's source to a temp folder outside the repo, installs
# dependencies from the npm registry, compiles, and runs a subset of
# transcript tests. Proves the published packages can compile and run
# a real-world story (191 rooms, NPCs, daemons, custom actions).
#
# Usage:
#   ./npm-test-dungeo/run.sh            # Run all regression transcripts
#   ./npm-test-dungeo/run.sh --quick    # Compile-only check (no transcripts)
# -------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUNGEO_SRC="$REPO_ROOT/stories/dungeo/src"
DUNGEO_TRANSCRIPTS="$REPO_ROOT/stories/dungeo/tests/transcripts"
QUICK=false
TMPDIR_BASE=""

if [[ "${1:-}" == "--quick" ]]; then
  QUICK=true
fi

# Cleanup on exit
cleanup() {
  if [[ -n "$TMPDIR_BASE" && -d "$TMPDIR_BASE" ]]; then
    echo ""
    echo "Cleaning up temp directory: $TMPDIR_BASE"
    rm -rf "$TMPDIR_BASE"
  fi
}
trap cleanup EXIT

# Verify Dungeo source exists
if [[ ! -d "$DUNGEO_SRC" ]]; then
  echo "ERROR: Dungeo source not found at $DUNGEO_SRC"
  exit 1
fi

# Create isolated temp directory
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

# Copy a representative set of transcript tests
mkdir -p "$TMPDIR_BASE/tests/transcripts"

# These transcripts cover major subsystems without depending on RNG
REGRESSION_TRANSCRIPTS=(
  # Core navigation and rooms
  "navigation.transcript"
  "attic-dark.transcript"
  "chimney-restriction.transcript"
  # Dam and water mechanics
  "dam-drain.transcript"
  "dam-puzzle.transcript"
  # Objects, containers, and inventory
  "boat-inflate-deflate.transcript"
  "cage-puzzle.transcript"
  "rug-trapdoor.transcript"
  "mailbox.transcript"
  # Locked doors and keys
  "grating-key.transcript"
  # Custom actions and puzzles
  "coal-machine.transcript"
  "mirror-room-toggle.transcript"
  "cyclops-magic-word.transcript"
  "tiny-room-puzzle.transcript"
  # NPCs
  "robot-commands.transcript"
  "troll-blocking.transcript"
  # Scoring
  "trophy-case-scoring.transcript"
  "room-scoring.transcript"
  # Save/restore
  "save-restore-basic.transcript"
)

COPIED=0
for t in "${REGRESSION_TRANSCRIPTS[@]}"; do
  if [[ -f "$DUNGEO_TRANSCRIPTS/$t" ]]; then
    cp "$DUNGEO_TRANSCRIPTS/$t" "$TMPDIR_BASE/tests/transcripts/"
    COPIED=$((COPIED + 1))
  else
    echo "  SKIP: $t (not found)"
  fi
done
echo "Copied: package.json, tsconfig.json, src/ ($( ls "$TMPDIR_BASE/src/" | wc -l | tr -d ' ') entries), $COPIED transcripts"

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

# Run transcript tests
echo "--- Running transcript tests ---"
echo ""

PASS=0
FAIL=0
SKIP=0
ERRORS=""

for transcript in tests/transcripts/*.transcript; do
  if [[ ! -f "$transcript" ]]; then
    continue
  fi
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
  echo "All Dungeo transcript tests passed against npm packages."
  exit 0
fi
