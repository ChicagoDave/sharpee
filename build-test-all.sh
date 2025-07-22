#!/bin/bash
# Build and test all Sharpee packages in dependency order
# Stops on first failure and logs all output
#
# Usage: ./build-test-all.sh [--skip-until PACKAGE_NAME]
# Example: ./build-test-all.sh --skip-until lang-en-us

set -e  # Exit on first error

# Setup
REPO_ROOT="/mnt/c/repotemp/sharpee"
LOG_DIR="$REPO_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SKIP_UNTIL=""
SKIPPING=false
AUTO_INSTALL=false

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-until PACKAGE_NAME  Skip all packages until PACKAGE_NAME (inclusive)"
    echo "  --install                  Run 'pnpm install' before building"
    echo "  --help, -h                 Show this help message"
    echo ""
    echo "Package names (in build order):"
    echo "  core, if-domain, lang-en-us, if-services, world-model, event-processor,"
    echo "  parser-en-us, stdlib, text-service-template, engine, forge, client-core,"
    echo "  extension-conversation, client-react, client-electron, sharpee"
    echo ""
    echo "Examples:"
    echo "  $0                           # Build and test all packages"
    echo "  $0 --install                 # Install deps, then build and test all"
    echo "  $0 --skip-until lang-en-us  # Start from lang-en-us (skip core through event-processor)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-until)
            SKIP_UNTIL="$2"
            SKIPPING=true
            shift 2
            ;;
        --install)
            AUTO_INSTALL=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

cd "$REPO_ROOT"

# Function to build and test a package
build_and_test() {
    local package=$1
    local name=$2
    local skip_test=${3:-false}
    
    # Check if we should start processing
    if [ "$SKIPPING" = "true" ] && [ "$name" = "$SKIP_UNTIL" ]; then
        SKIPPING=false
        echo "Starting from package: $name"
    fi
    
    # Skip if we haven't reached the target package yet
    if [ "$SKIPPING" = "true" ]; then
        echo "[$name] - skipped"
        return
    fi
    
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

# Check if node_modules exists at root
if [ ! -d "$REPO_ROOT/node_modules" ]; then
    if [ "$AUTO_INSTALL" = "true" ]; then
        echo "Running 'pnpm install' to install dependencies..."
        pnpm install
        echo ""
    else
        echo "WARNING: node_modules not found at root. You may need to run 'pnpm install' first."
        echo "         Or use --install option to run it automatically."
        echo ""
    fi
fi

echo "Building and testing all packages..."
echo "Timestamp: $TIMESTAMP"
if [ -n "$SKIP_UNTIL" ]; then
    echo "Skipping packages until: $SKIP_UNTIL"
fi
echo ""

# Build order based on dependencies
# Core packages (no dependencies)
build_and_test "@sharpee/core" "core"

# Level 1 dependencies (depend only on core)
build_and_test "@sharpee/if-domain" "if-domain" true  # Skip tests - no tests defined
build_and_test "@sharpee/lang-en-us" "lang-en-us"  # No dependencies

# Level 2 dependencies
build_and_test "@sharpee/world-model" "world-model"  # Depends on core + if-domain

# Level 3 dependencies  
build_and_test "@sharpee/if-services" "if-services" true  # Skip tests - no tests yet
build_and_test "@sharpee/event-processor" "event-processor"  # Depends on core + if-domain + world-model
build_and_test "@sharpee/parser-en-us" "parser-en-us"  # Depends on core + if-domain + world-model
build_and_test "@sharpee/stdlib" "stdlib"  # Depends on core + world-model + if-domain

# Level 4 dependencies
build_and_test "@sharpee/text-service-template" "text-service-template" true  # Skip tests - no tests defined
build_and_test "@sharpee/engine" "engine"
build_and_test "@sharpee/forge" "forge"
build_and_test "@sharpee/client-core" "client-core"

# Extensions (can be built after core)
build_and_test "@sharpee/extension-conversation" "extension-conversation"

# Client packages (depend on client-core)
build_and_test "@sharpee/client-react" "client-react"
build_and_test "@sharpee/client-electron" "client-electron"

# Aggregator package
build_and_test "@sharpee/sharpee" "sharpee" true  # Skip tests - aggregator package

echo ""
echo "======================================"
echo "All packages built and tested successfully!"
echo "======================================"
echo ""
echo "Packages built (in dependency order):"
echo "  1. Core packages:"
echo "     - @sharpee/core"
echo "  2. Foundation packages (depend only on core):"
echo "     - @sharpee/if-domain (no tests)"
echo "     - @sharpee/lang-en-us (no dependencies)"
echo "  3. Second-level packages:"
echo "     - @sharpee/world-model (depends on core + if-domain)"
echo "  4. Third-level packages:"
echo "     - @sharpee/if-services (depends on core + if-domain + world-model)"
echo "     - @sharpee/event-processor (depends on core + if-domain + world-model)"
echo "     - @sharpee/parser-en-us (depends on core + if-domain + world-model)"
echo "     - @sharpee/stdlib (depends on core + world-model + if-domain)"
echo "  5. Fourth-level packages:"
echo "     - @sharpee/text-service-template (depends on if-services)"
echo "     - @sharpee/engine"
echo "     - @sharpee/forge"
echo "     - @sharpee/client-core"
echo "  6. Extensions:"
echo "     - @sharpee/extension-conversation"
echo "  7. Client implementations:"
echo "     - @sharpee/client-react"
echo "     - @sharpee/client-electron"
echo "  8. Main package:"
echo "     - @sharpee/sharpee (aggregator, no tests)"
echo ""
echo "Logs available in: $LOG_DIR"
