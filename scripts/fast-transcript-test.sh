#!/bin/bash
# Run transcript tests using the bundled Sharpee (140ms vs 81s load time)
#
# Usage:
#   ./scripts/fast-transcript-test.sh stories/dungeo --all
#   ./scripts/fast-transcript-test.sh stories/dungeo path/to/test.transcript

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check bundle exists
if [ ! -f "$PROJECT_ROOT/dist/sharpee.js" ]; then
  echo "Bundle not found. Run ./scripts/bundle-sharpee.sh first"
  exit 1
fi

# Run with bundle preload
node -r "$SCRIPT_DIR/use-bundle.js" \
  "$PROJECT_ROOT/packages/transcript-tester/dist/cli.js" \
  "$@"
