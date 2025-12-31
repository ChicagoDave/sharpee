#!/bin/bash
# Build script for Dungeo story
# Usage:
#   ./scripts/build-dungeo.sh          # Build dungeo only (fast, assumes Sharpee is built)
#   ./scripts/build-dungeo.sh --full   # Rebuild all Sharpee packages + dungeo
#   ./scripts/build-dungeo.sh --clean  # Clean everything and rebuild from scratch

set -e

# Check if Sharpee core packages are built
check_sharpee_built() {
    local missing=0
    for pkg in core if-domain world-model lang-en-us if-services parser-en-us event-processor text-services stdlib engine; do
        if [ ! -d "packages/$pkg/dist" ]; then
            missing=1
            break
        fi
    done
    return $missing
}

case "$1" in
    --clean)
        echo "=== Clean Build: Sharpee + Dungeo ==="
        echo ""
        echo "Cleaning dist folders..."
        rm -rf packages/*/dist
        rm -rf stories/dungeo/dist
        echo ""

        # Fall through to full build
        ;&
    --full)
        echo "=== Full Build: Sharpee + Dungeo ==="
        echo ""

        echo "1/12 Building @sharpee/core..."
        pnpm --filter '@sharpee/core' build

        echo "2/12 Building @sharpee/if-domain..."
        pnpm --filter '@sharpee/if-domain' build

        echo "3/12 Building @sharpee/world-model..."
        pnpm --filter '@sharpee/world-model' build

        echo "4/12 Building @sharpee/lang-en-us..."
        pnpm --filter '@sharpee/lang-en-us' build

        echo "5/12 Building @sharpee/if-services..."
        pnpm --filter '@sharpee/if-services' build

        echo "6/12 Building @sharpee/parser-en-us..."
        pnpm --filter '@sharpee/parser-en-us' build

        echo "7/12 Building @sharpee/event-processor..."
        pnpm --filter '@sharpee/event-processor' build

        echo "8/12 Building @sharpee/text-services..."
        pnpm --filter '@sharpee/text-services' build

        echo "9/12 Building @sharpee/stdlib..."
        pnpm --filter '@sharpee/stdlib' build

        echo "10/12 Building @sharpee/engine..."
        pnpm --filter '@sharpee/engine' build

        echo "11/12 Building @sharpee/transcript-tester..."
        pnpm --filter '@sharpee/transcript-tester' build

        echo "12/12 Building dungeo story..."
        pnpm --filter '@sharpee/story-dungeo' build
        ;;

    *)
        # Default: just build dungeo (fast path)
        if ! check_sharpee_built; then
            echo "WARNING: Some Sharpee packages are not built."
            echo "Run with --full to build everything, or --clean for a fresh start."
            echo ""
        fi

        echo "=== Building Dungeo ==="
        pnpm --filter '@sharpee/story-dungeo' build
        ;;
esac

echo ""
echo "=== Build Complete ==="
echo ""

# Quick sanity check - try to load the story
echo "Verifying story loads..."
if timeout 180 node -e "
const start = Date.now();
require('./stories/dungeo/dist/index.js');
console.log('Story loaded in ' + (Date.now() - start) + 'ms');
" 2>&1; then
    echo ""
    echo "Done."
else
    echo ""
    echo "WARNING: Story load timed out or failed!"
    exit 1
fi
