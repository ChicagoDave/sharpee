#!/bin/bash
# Build a specific story
#
# Usage:
#   ./scripts/build-story.sh dungeo
#   ./scripts/build-story.sh reflections
#
# Requires: Platform must be built first (run build-platform.sh or use build.sh)
# Note: Version updates are handled by update-versions.sh, called by build.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Require story name
if [ -z "$1" ]; then
    echo "Usage: $0 <story-name>"
    echo "Example: $0 dungeo"
    exit 1
fi

STORY="$1"
STORY_DIR="stories/${STORY}"
STORY_PKG="@sharpee/story-${STORY}"

# Verify story exists
if [ ! -d "$STORY_DIR" ]; then
    echo "Error: Story not found: $STORY_DIR"
    exit 1
fi

echo "=== Building Story: ${STORY} ==="

echo -n "[${STORY}] "
if pnpm --filter "$STORY_PKG" build > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ FAILED"
    pnpm --filter "$STORY_PKG" build 2>&1 | tail -20
    exit 1
fi

echo ""
echo "=== Story Build Complete ==="
echo "Test with: node dist/sharpee.js --play"
