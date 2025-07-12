#!/bin/bash
# Build all Sharpee packages in dependency order (no tests)
# Stops on first failure and logs all output

set -e  # Exit on first error

# Setup
REPO_ROOT="/mnt/c/repotemp/sharpee"
LOG_DIR="$REPO_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$REPO_ROOT"

# Function to build a package
build_package() {
    local package=$1
    local name=$2
    
    echo -n "[$name] "
    if pnpm --filter "$package" build > "$LOG_DIR/build-$name-$TIMESTAMP.log" 2>&1; then
        echo "✓"
    else
        echo "✗"
        echo "Failed. See: logs/build-$name-$TIMESTAMP.log"
        exit 1
    fi
}

echo "Building all packages..."
echo ""

# Build order based on dependencies
build_package "@sharpee/core" "core"
build_package "@sharpee/world-model" "world-model"
build_package "@sharpee/if-domain" "if-domain"
build_package "@sharpee/event-processor" "event-processor"
build_package "@sharpee/lang-en-us" "lang-en-us"
build_package "@sharpee/stdlib" "stdlib"
build_package "@sharpee/engine" "engine"
build_package "@sharpee/test-stories" "test-stories"

echo ""
echo "Build complete. Logs: $LOG_DIR"
