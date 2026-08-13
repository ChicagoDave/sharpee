#!/bin/bash
#
# Sharpee Build System (Ubuntu)
# =============================
# Wrapper that sources nvm before running `devkit build`.
#
# Usage:
#   ./build-ubuntu.sh dungeo               # devkit build dungeo (sources nvm)
#   ./build-ubuntu.sh dungeo --browser     # + browser client
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

# Source nvm - required for node/npm/pnpm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Use home-based tmp dir to avoid noexec /tmp (common on hardened servers)
export TMPDIR="$HOME/tmp"
mkdir -p "$TMPDIR"

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

# Run the main build script if there are args for it
if [ ${#BUILD_SH_ARGS[@]} -gt 0 ]; then
    "$REPO_ROOT/sharpee" build "${BUILD_SH_ARGS[@]}"
fi

# If nothing was requested, show help
if [ ${#BUILD_SH_ARGS[@]} -eq 0 ]; then
    echo ""
    echo "Sharpee Build System (Ubuntu)"
    echo "============================="
    echo ""
    echo "Usage: ./build-ubuntu.sh [devkit build options]"
    echo ""
    echo "All other options are passed to 'devkit build'. Run 'node packages/devkit/dist/cli.js' for details."
    echo ""
    echo "Examples:"
    echo "  ./build-ubuntu.sh dungeo                     # devkit build dungeo (sources nvm)"
    echo "  ./build-ubuntu.sh dungeo --browser           # + browser client"
    echo ""
fi
