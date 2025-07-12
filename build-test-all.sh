#!/bin/bash
# Build and test all Sharpee packages in dependency order
# Stops on first failure and logs all output

set -e  # Exit on first error

# Setup
REPO_ROOT="/mnt/c/repotemp/sharpee"
LOG_DIR="$REPO_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$REPO_ROOT"

# Function to build and test a package
build_and_test() {
    local package=$1
    local name=$2
    local skip_test=${3:-false}
    
    echo "[$name]"
    
    # Build
    echo -n "  Building... "
    if pnpm --filter "$package" build > "$LOG_DIR/build-$name-$TIMESTAMP.log" 2>&1; then
        echo "✓"
    else
        echo "✗"
        echo "  See: logs/build-$name-$TIMESTAMP.log"
        exit 1
    fi
    
    # Test (skip if requested)
    if [ "$skip_test" = "true" ]; then
        echo "  Testing... skipped"
    else
        echo -n "  Testing... "
        if pnpm --filter "$package" test > "$LOG_DIR/test-$name-$TIMESTAMP.log" 2>&1; then
            echo "✓"
        else
            echo "✗"
            echo "  See: logs/test-$name-$TIMESTAMP.log"
            exit 1
        fi
    fi
}

echo "Building and testing all packages..."
echo "Timestamp: $TIMESTAMP"
echo ""

# Build order based on dependencies
build_and_test "@sharpee/core" "core"
build_and_test "@sharpee/world-model" "world-model"
build_and_test "@sharpee/if-domain" "if-domain" true  # Skip tests - no tests defined
build_and_test "@sharpee/event-processor" "event-processor"
build_and_test "@sharpee/lang-en-us" "lang-en-us"
build_and_test "@sharpee/stdlib" "stdlib"
build_and_test "@sharpee/engine" "engine"
build_and_test "@sharpee/test-stories" "test-stories"

echo ""
echo "All packages built and tested successfully!"
echo "Logs available in: $LOG_DIR"
