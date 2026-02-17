#!/bin/bash
#
# Zifmia macOS Release
# ====================
# Copies the built .dmg to /macos-builds and submits it to Apple for notarization.
#
# Prerequisites (one-time setup):
#   xcrun notarytool store-credentials "Zifmia" \
#     --apple-id "your@email.com" \
#     --team-id "YOURTEAMID" \
#     --password "app-specific-password"
#
# Usage:
#   ./scripts/mac-release.sh                # Notarize + staple
#   ./scripts/mac-release.sh --setup        # Store credentials in Keychain
#   ./scripts/mac-release.sh --skip-notarize  # Just copy, don't submit
#

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROFILE_NAME="ledga-notarize"
BUILDS_DIR="$REPO_ROOT/macos-builds"
DMG_SOURCE="packages/zifmia/src-tauri/target/release/bundle/dmg"
SKIP_NOTARIZE=false
SETUP_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --setup)
            SETUP_ONLY=true
            shift
            ;;
        --skip-notarize)
            SKIP_NOTARIZE=true
            shift
            ;;
        -h|--help)
            echo ""
            echo "Zifmia macOS Release"
            echo "===================="
            echo ""
            echo "Usage: ./scripts/mac-release.sh [options]"
            echo ""
            echo "Options:"
            echo "  --setup            Store Apple notarization credentials in Keychain"
            echo "  --skip-notarize    Copy .dmg to $BUILDS_DIR without notarizing"
            echo "  -h, --help         Show this help"
            echo ""
            echo "One-time setup:"
            echo "  ./scripts/mac-release.sh --setup"
            echo ""
            echo "  You'll need:"
            echo "    - Apple ID email"
            echo "    - Team ID (from developer.apple.com)"
            echo "    - App-specific password (from appleid.apple.com)"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# ============================================================================
# Setup (store credentials)
# ============================================================================

if [ "$SETUP_ONLY" = true ]; then
    echo ""
    echo -e "${BLUE}Storing notarization credentials${NC}"
    echo "================================"
    echo ""
    echo "You'll be prompted for:"
    echo "  - Apple ID (email)"
    echo "  - Team ID"
    echo "  - App-specific password (from https://appleid.apple.com)"
    echo ""
    echo "Enter your Apple ID email:"
    read -r APPLE_ID
    echo "Enter app-specific password (from https://appleid.apple.com):"
    read -rs APP_PASSWORD
    echo ""
    xcrun notarytool store-credentials "$PROFILE_NAME" \
        --apple-id "$APPLE_ID" \
        --team-id "54CCCRZJ3X" \
        --password "$APP_PASSWORD"
    echo ""
    echo -e "${GREEN}Credentials stored as '$PROFILE_NAME'${NC}"
    exit 0
fi

# ============================================================================
# Find the .dmg built by Tauri
# ============================================================================

echo ""
echo -e "${BLUE}Zifmia macOS Release${NC}"
echo "===================="
echo ""

VERSION=$(node -p "require('./packages/zifmia/src-tauri/tauri.conf.json').version" 2>/dev/null || echo "0.9.0")
DMG_NAME="Zifmia_${VERSION}_aarch64.dmg"
DMG_FILE="$DMG_SOURCE/$DMG_NAME"

if [ ! -f "$DMG_FILE" ]; then
    echo -e "${RED}Error: DMG not found at $DMG_FILE${NC}"
    echo "Build first: ./build.sh -s dungeo -c zifmia"
    exit 1
fi

echo -e "Found: ${GREEN}$DMG_NAME${NC}"
echo "  Source: $DMG_FILE"
echo "  Size:   $(du -h "$DMG_FILE" | cut -f1)"

SIGNING_IDENTITY="Developer ID Application: David Cornelson (54CCCRZJ3X)"
WORK_DIR=$(mktemp -d)

# ============================================================================
# Extract .app from Tauri DMG, codesign with hardened runtime, rebuild DMG
# ============================================================================

echo ""
echo -e "${BLUE}Extracting .app from DMG${NC}"

# Mount the Tauri-built DMG (may be root-owned, but mounting is read-only)
MOUNT_POINT="$WORK_DIR/mnt"
mkdir -p "$MOUNT_POINT"
hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

# Copy .app out so we can sign it
APP_WORK="$WORK_DIR/Zifmia.app"
cp -R "$MOUNT_POINT/Zifmia.app" "$APP_WORK"
hdiutil detach "$MOUNT_POINT" -quiet

echo -e "  ${GREEN}Extracted Zifmia.app${NC}"

# Sign with hardened runtime + secure timestamp
echo ""
echo -e "${BLUE}Signing Zifmia.app (hardened runtime)${NC}"
codesign --force --deep --sign "$SIGNING_IDENTITY" \
    --options runtime \
    --timestamp \
    "$APP_WORK"
codesign --verify --deep --strict --verbose=2 "$APP_WORK" 2>&1 | tail -1
echo -e "  ${GREEN}Signed with hardened runtime${NC}"

# ============================================================================
# Create release DMG and copy to macos-builds
# ============================================================================

echo ""
echo -e "${BLUE}Creating signed DMG${NC}"

mkdir -p "$BUILDS_DIR"
LATEST_FILE="$BUILDS_DIR/$DMG_NAME"

hdiutil create -volname "Zifmia" \
    -srcfolder "$APP_WORK" \
    -ov -format UDZO \
    "$LATEST_FILE"

# Sign the DMG itself
codesign --force --sign "$SIGNING_IDENTITY" --timestamp "$LATEST_FILE"

# Timestamped copy for archival
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEST_NAME="${DMG_NAME%.dmg}-${TIMESTAMP}.dmg"
DEST_FILE="$BUILDS_DIR/$DEST_NAME"
cp "$LATEST_FILE" "$DEST_FILE"

echo -e "  ${GREEN}$LATEST_FILE${NC} (latest)"
echo -e "  ${GREEN}$DEST_FILE${NC}"

# Clean up temp dir now that DMG is built
rm -rf "$WORK_DIR"

if [ "$SKIP_NOTARIZE" = true ]; then
    echo ""
    echo -e "${GREEN}Done (notarization skipped)${NC}"
    echo ""
    exit 0
fi

# ============================================================================
# Notarize
# ============================================================================

echo ""
echo -e "${BLUE}Submitting to Apple for notarization${NC}"

# Verify credentials exist
if ! xcrun notarytool history --keychain-profile "$PROFILE_NAME" > /dev/null 2>&1; then
    echo -e "${RED}Error: No credentials found for profile '$PROFILE_NAME'${NC}"
    echo "Run: ./scripts/mac-release.sh --setup"
    exit 1
fi

xcrun notarytool submit "$LATEST_FILE" \
    --keychain-profile "$PROFILE_NAME" \
    --wait

echo ""
echo -e "${BLUE}Stapling notarization ticket${NC}"

xcrun stapler staple "$LATEST_FILE"

# Copy stapled version over the timestamped one too
cp "$LATEST_FILE" "$DEST_FILE"

echo ""
echo -e "${GREEN}Release Complete${NC}"
echo "================"
echo ""
echo "Notarized .dmg files:"
echo "  $DEST_FILE"
echo "  $LATEST_FILE"
echo ""
