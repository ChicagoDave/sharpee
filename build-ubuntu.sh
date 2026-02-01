#!/bin/bash
#
# Sharpee Build System (Ubuntu)
# =============================
# Wrapper that sources nvm before running build.sh, and can also build
# the Zifmia Tauri desktop app (requires Rust + system libs).
#
# Usage:
#   ./build-ubuntu.sh -s dungeo            # Same as build.sh (sources nvm)
#   ./build-ubuntu.sh --zifmia             # Build Zifmia Tauri app
#   ./build-ubuntu.sh --zifmia-deps        # Only install Zifmia dependencies
#   ./build-ubuntu.sh -s dungeo --zifmia   # Full build + Zifmia
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

# Source cargo env if present
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# Verify pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

# ============================================================================
# Parse our flags (--zifmia, --zifmia-deps), pass the rest to build.sh
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
# Zifmia Dependencies
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

install_tauri_system_deps() {
    # Tauri 2 system dependencies for Ubuntu/Debian
    # https://tauri.app/start/prerequisites/#linux
    local PACKAGES=(
        build-essential
        curl
        wget
        file
        libwebkit2gtk-4.1-dev
        libgtk-3-dev
        libayatana-appindicator3-dev
        libssl-dev
        librsvg2-dev
        libsoup-3.0-dev
        libjavascriptcoregtk-4.1-dev
    )

    local MISSING=()
    for pkg in "${PACKAGES[@]}"; do
        if ! dpkg -s "$pkg" &> /dev/null 2>&1; then
            MISSING+=("$pkg")
        fi
    done

    if [ ${#MISSING[@]} -eq 0 ]; then
        echo -e "  system libs: ${GREEN}all present${NC}"
        return 0
    fi

    echo -e "  system libs: ${YELLOW}installing ${#MISSING[@]} packages...${NC}"
    echo "    ${MISSING[*]}"
    sudo apt-get update -qq
    sudo apt-get install -y -qq "${MISSING[@]}"
    echo -e "  system libs: ${GREEN}installed${NC}"
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
    echo -e "${BLUE}Zifmia Dependencies${NC}"
    echo "==================="
    echo ""

    install_rust
    install_tauri_system_deps
    install_tauri_cli
    echo ""
}

# ============================================================================
# Zifmia Tauri Build
# ============================================================================

build_zifmia() {
    echo -e "${BLUE}Building Zifmia (Tauri)${NC}"
    echo "======================="
    echo ""

    # Check frontend exists
    if [ ! -f "$REPO_ROOT/dist/runner/index.html" ] || [ ! -f "$REPO_ROOT/dist/runner/runner.js" ]; then
        echo -e "${RED}Error: dist/runner/ not found${NC}"
        echo "Build the frontend first:"
        echo "  ./build-ubuntu.sh --runner -s dungeo --zifmia"
        echo "  (or run ./build.sh --runner -s dungeo separately)"
        exit 1
    fi
    echo -e "  frontend: ${GREEN}dist/runner/ exists${NC}"

    echo ""
    echo "Running cargo tauri build..."
    cd "$REPO_ROOT/packages/zifmia/src-tauri"
    cargo tauri build
    cd "$REPO_ROOT"

    echo ""
    echo -e "${GREEN}Zifmia Build Complete${NC}"
    echo "====================="
    echo ""
    echo "Output:"

    if [ -d "packages/zifmia/src-tauri/target/release/bundle/deb" ]; then
        echo "  .deb:"
        for f in packages/zifmia/src-tauri/target/release/bundle/deb/*.deb; do
            [ -f "$f" ] && echo "    $(basename "$f") ($(du -h "$f" | cut -f1))"
        done
    fi
    if [ -d "packages/zifmia/src-tauri/target/release/bundle/appimage" ]; then
        echo "  AppImage:"
        for f in packages/zifmia/src-tauri/target/release/bundle/appimage/*.AppImage; do
            [ -f "$f" ] && echo "    $(basename "$f") ($(du -h "$f" | cut -f1))"
        done
    fi
    if [ -f "packages/zifmia/src-tauri/target/release/sharpee" ]; then
        echo "  binary: packages/zifmia/src-tauri/target/release/sharpee ($(du -h packages/zifmia/src-tauri/target/release/sharpee | cut -f1))"
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

# Create dist-npm -> dist symlinks in all packages
# (package.json points types/main at dist-npm/ for npm publishing,
# but tsc outputs to dist/ — symlink bridges the gap)
for pkg_dir in "$REPO_ROOT"/packages/*/ "$REPO_ROOT"/packages/extensions/*/; do
    if [ -f "$pkg_dir/package.json" ] && grep -q "dist-npm" "$pkg_dir/package.json" 2>/dev/null; then
        if [ ! -e "$pkg_dir/dist-npm" ]; then
            ln -sf dist "$pkg_dir/dist-npm"
        fi
    fi
done

# Run the main build script if there are args for it
if [ ${#BUILD_SH_ARGS[@]} -gt 0 ]; then
    bash "$REPO_ROOT/build.sh" "${BUILD_SH_ARGS[@]}"
fi

# Build Zifmia Tauri app
if [ "$BUILD_ZIFMIA" = true ]; then
    build_zifmia
fi

# If nothing was requested, show help
if [ "$BUILD_ZIFMIA" = false ] && [ ${#BUILD_SH_ARGS[@]} -eq 0 ]; then
    echo ""
    echo "Sharpee Build System (Ubuntu)"
    echo "============================="
    echo ""
    echo "Usage: ./build-ubuntu.sh [build.sh options] [zifmia options]"
    echo ""
    echo "Zifmia options:"
    echo "  --zifmia           Build Zifmia Tauri desktop app"
    echo "  --zifmia-deps      Only install Zifmia dependencies (Rust, system libs)"
    echo ""
    echo "All other options are passed to build.sh. Run ./build.sh --help for details."
    echo ""
    echo "Examples:"
    echo "  ./build-ubuntu.sh -s dungeo                  # Normal build (same as build.sh)"
    echo "  ./build-ubuntu.sh --zifmia-deps              # Install Rust + Tauri deps"
    echo "  ./build-ubuntu.sh --runner -s dungeo --zifmia # Full build + Tauri app"
    echo ""
fi
