#!/bin/bash
#
# Sharpee Build System (macOS)
# ============================
# Wrapper that handles macOS-specific concerns before running `devkit build`,
# and can also build the legacy Zifmia Tauri desktop app (.dmg).
#
# Usage:
#   ./build-macos.sh dungeo               # devkit build dungeo (sources nvm/cargo first)
#   ./build-macos.sh dungeo --browser     # + browser client
#   ./build-macos.sh --zifmia-deps        # Only install Tauri build dependencies
#   ./build-macos.sh --zifmia             # Build legacy Zifmia Tauri app (.dmg; needs dist/runner)
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

# Source cargo env if present
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# Verify pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

# ============================================================================
# Parse our flags (--zifmia, --zifmia-deps), pass the rest to `devkit build`
# ============================================================================

BUILD_ZIFMIA=false
ZIFMIA_DEPS_ONLY=false
BUILD_SH_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --zifmia)
            BUILD_ZIFMIA=true
            shift
            ;;
        --zifmia-deps)
            ZIFMIA_DEPS_ONLY=true
            shift
            ;;
        *)
            BUILD_SH_ARGS+=("$1")
            shift
            ;;
    esac
done

# ============================================================================
# Zifmia Dependencies (macOS)
# ============================================================================

install_rust() {
    if command -v rustc &> /dev/null; then
        echo -e "  rustc: ${GREEN}$(rustc --version)${NC}"
        return 0
    fi

    echo -e "  rustc: ${YELLOW}not found - installing...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo -e "  rustc: ${GREEN}$(rustc --version)${NC}"
}

install_tauri_cli() {
    if cargo install --list 2>/dev/null | grep -q "^tauri-cli"; then
        local ver
        ver=$(cargo install --list 2>/dev/null | grep "^tauri-cli" | head -1)
        echo -e "  tauri-cli: ${GREEN}${ver}${NC}"
        return 0
    fi

    echo -e "  tauri-cli: ${YELLOW}not found - installing...${NC}"
    cargo install tauri-cli --version "^2"
    echo -e "  tauri-cli: ${GREEN}installed${NC}"
}

ensure_zifmia_deps() {
    echo ""
    echo -e "${BLUE}Zifmia Dependencies (macOS)${NC}"
    echo "==========================="
    echo ""

    # Xcode command line tools (required for Tauri on macOS)
    if xcode-select -p &> /dev/null; then
        echo -e "  xcode-select: ${GREEN}$(xcode-select -p)${NC}"
    else
        echo -e "  xcode-select: ${YELLOW}not found - installing...${NC}"
        xcode-select --install
        echo -e "  xcode-select: ${GREEN}installed (you may need to restart this script)${NC}"
    fi

    install_rust
    install_tauri_cli
    echo ""
}

# ============================================================================
# Zifmia Tauri Build (macOS)
# ============================================================================

build_zifmia() {
    echo -e "${BLUE}Building Zifmia (Tauri - macOS)${NC}"
    echo "================================"
    echo ""

    # Check frontend exists
    if [ ! -f "$REPO_ROOT/dist/runner/index.html" ] || [ ! -f "$REPO_ROOT/dist/runner/runner.js" ]; then
        echo -e "${RED}Error: dist/runner/ not found${NC}"
        echo "The legacy Tauri runner (dist/runner) is no longer built by devkit (ADR-180 dropped --runner)."
        echo "  Build dist/runner via the legacy interpreter toolchain before packaging the .dmg."
        exit 1
    fi
    echo -e "  frontend: ${GREEN}dist/runner/ exists${NC}"

    # Override bundle targets for macOS (tauri.conf.json may have "deb")
    echo ""
    echo "Running cargo tauri build (dmg)..."
    cd "$REPO_ROOT/packages/interpreter/src-tauri"
    cargo tauri build --bundles dmg
    cd "$REPO_ROOT"

    echo ""
    echo -e "${GREEN}Zifmia Build Complete${NC}"
    echo "====================="
    echo ""
    echo "Output:"

    if [ -d "packages/interpreter/src-tauri/target/release/bundle/macos" ]; then
        for f in packages/interpreter/src-tauri/target/release/bundle/macos/*.dmg; do
            [ -f "$f" ] && echo "  .dmg: $(basename "$f") ($(du -h "$f" | cut -f1))"
        done
        for f in packages/interpreter/src-tauri/target/release/bundle/macos/*.app; do
            [ -d "$f" ] && echo "  .app: $(basename "$f")"
        done
    fi
    echo ""
}

# ============================================================================
# Main
# ============================================================================

# Install Zifmia deps if requested
if [ "$ZIFMIA_DEPS_ONLY" = true ]; then
    ensure_zifmia_deps
    echo -e "${GREEN}Zifmia dependencies ready.${NC}"
    echo ""
    exit 0
fi

if [ "$BUILD_ZIFMIA" = true ]; then
    ensure_zifmia_deps
fi

# Run the main build (devkit; ADR-180) if there are args for it.
# Pass-through args are devkit-style, e.g. `dungeo --browser`.
if [ ${#BUILD_SH_ARGS[@]} -gt 0 ]; then
    node "$REPO_ROOT/packages/devkit/dist/cli.js" build "${BUILD_SH_ARGS[@]}"
fi

# Build Zifmia Tauri app
if [ "$BUILD_ZIFMIA" = true ]; then
    build_zifmia
fi

# If nothing was requested, show help
if [ "$BUILD_ZIFMIA" = false ] && [ ${#BUILD_SH_ARGS[@]} -eq 0 ]; then
    echo ""
    echo "Sharpee Build System (macOS)"
    echo "============================"
    echo ""
    echo "Usage: ./build-macos.sh [devkit build options] [zifmia options]"
    echo ""
    echo "Zifmia (legacy Tauri) options:"
    echo "  --zifmia           Build legacy Zifmia Tauri desktop app (.dmg; needs dist/runner)"
    echo "  --zifmia-deps      Only install Tauri build dependencies (Rust, Xcode tools)"
    echo ""
    echo "All other options are passed to 'devkit build'. Run 'node packages/devkit/dist/cli.js' for details."
    echo ""
    echo "Examples:"
    echo "  ./build-macos.sh dungeo                     # devkit build dungeo (sources nvm/cargo)"
    echo "  ./build-macos.sh dungeo --browser           # + browser client"
    echo "  ./build-macos.sh --zifmia-deps              # Install Rust + Tauri CLI"
    echo ""
fi
