#!/bin/bash
# Test all Sharpee packages (assumes already built)
# Stops on first failure and logs all output

set -e  # Exit on first error

# Setup
REPO_ROOT="/mnt/c/repotemp/sharpee"
LOG_DIR="$REPO_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$REPO_ROOT"

# Function to test a package
test_package() {
    local package=$1
    local name=$2
    
    echo -n "[$name] "
    if pnpm --filter "$package" test > "$LOG_DIR/test-$name-$TIMESTAMP.log" 2>&1; then
        echo "✓"
    else
        echo "✗"
        echo "Failed. See: logs/test-$name-$TIMESTAMP.log"
        exit 1
    fi
}

echo "Testing all packages..."
echo ""

# Test in dependency order (skip if-domain - no tests)
test_package "@sharpee/core" "core"
test_package "@sharpee/world-model" "world-model"
# Skip @sharpee/if-domain - no tests defined
echo "[if-domain] skipped (no tests)"
test_package "@sharpee/event-processor" "event-processor"
test_package "@sharpee/lang-en-us" "lang-en-us"
test_package "@sharpee/parser-en-us" "parser-en-us"
test_package "@sharpee/stdlib" "stdlib"
test_package "@sharpee/engine" "engine"
test_package "@sharpee/test-stories" "test-stories"

echo ""
echo "Tests complete. Logs: $LOG_DIR"
