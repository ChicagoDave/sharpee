#!/bin/bash
#
# Sharpee Build System (Ubuntu)
# =============================
# Wrapper that sources nvm before running build.sh
#

# Source nvm - required for node/npm/pnpm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Verify pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

# Run the main build script with inherited environment
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$SCRIPT_DIR/build.sh" "$@"
