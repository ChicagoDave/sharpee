#!/bin/bash
#
# Sharpee Build System (macOS)
# ============================
# Wrapper that handles macOS-specific concerns before running `devkit build`,

#
# Usage:
#   ./build-macos.sh dungeo               # devkit build dungeo (sources nvm/cargo first)
#   ./build-macos.sh dungeo --browser     # + browser client
#

set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Source nvm if present (optional on macOS — node may be installed via Homebrew)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Verify pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

# ============================================================================
# Pass every flag through to `devkit build`
# ============================================================================

BUILD_SH_ARGS=("$@")

# ============================================================================
# Main
# ============================================================================

# Run the main build (devkit; ADR-180) if there are args for it.
# Pass-through args are devkit-style, e.g. `dungeo --browser`.
if [ ${#BUILD_SH_ARGS[@]} -gt 0 ]; then
    "$REPO_ROOT/sharpee" build "${BUILD_SH_ARGS[@]}"
fi

# If nothing was requested, show help
if [ ${#BUILD_SH_ARGS[@]} -eq 0 ]; then
    echo ""
    echo "Sharpee Build System (macOS)"
    echo "============================"
    echo ""
    echo "Usage: ./build-macos.sh [devkit build options]"
    echo ""
    echo "All other options are passed to 'devkit build'. Run 'node packages/devkit/dist/cli.js' for details."
    echo ""
    echo "Examples:"
    echo "  ./build-macos.sh dungeo                     # devkit build dungeo (sources nvm/cargo)"
    echo "  ./build-macos.sh dungeo --browser           # + browser client"
    echo ""
fi
