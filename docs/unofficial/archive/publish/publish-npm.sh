#!/bin/bash
# Publish all @sharpee packages to npm
# Usage: ./scripts/publish-npm.sh [--dry-run] [--version X.Y.Z]
#
# Requires: tsf (npm install -D tsf)

set -e

# Default version (can be overridden with --version)
VERSION="0.9.64-beta"
DRY_RUN=""
TSF="node /mnt/c/repotemp/tsf/dist/cli/index.js"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="--dry-run"
      shift
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--version X.Y.Z]"
      echo ""
      echo "Options:"
      echo "  --dry-run       Show what would be published without actually publishing"
      echo "  --version X.Y.Z Set version for all packages (default: $VERSION)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Sharpee npm Publish ===${NC}"
echo "Version: $VERSION"
[ -n "$DRY_RUN" ] && echo -e "${YELLOW}DRY RUN MODE${NC}"
echo ""

# Check npm login status
if [ -z "$DRY_RUN" ]; then
  echo "Checking npm login status..."
  NPM_USER=$(npm whoami 2>/dev/null) || {
    echo -e "${RED}Not logged in to npm. Run 'npm login' first.${NC}"
    exit 1
  }
  echo -e "Logged in as: ${GREEN}$NPM_USER${NC}"
  echo ""
fi

# Version, build, and validate via tsf
echo -e "${GREEN}=== Updating versions to $VERSION ===${NC}"
$TSF version "$VERSION" --condition publish

echo ""
echo -e "${GREEN}=== Building packages ===${NC}"
$TSF build --all

echo ""
echo -e "${GREEN}=== Validating outputs ===${NC}"
$TSF validate

# Publish each package with publishConfig
echo ""
echo -e "${GREEN}=== Publishing packages ===${NC}"
ROOT_DIR=$(pwd)
for PKG_JSON in packages/*/package.json packages/*/*/package.json; do
  [ -f "$PKG_JSON" ] || continue

  # Only publish packages that have publishConfig
  HAS_PUBLISH=$(node -p "!!require('./$PKG_JSON').publishConfig" 2>/dev/null)
  [ "$HAS_PUBLISH" = "true" ] || continue

  PKG_DIR=$(dirname "$PKG_JSON")
  PKG_NAME=$(node -p "require('./$PKG_JSON').name" 2>/dev/null)

  echo ""
  echo -e "${YELLOW}Publishing $PKG_NAME...${NC}"
  cd "$ROOT_DIR/$PKG_DIR"
  pnpm publish --access public --no-git-checks --tag latest $DRY_RUN || {
    echo -e "${RED}Failed to publish $PKG_NAME${NC}"
    cd "$ROOT_DIR"
    exit 1
  }
  cd "$ROOT_DIR"
done

echo ""
echo -e "${GREEN}=== Done! ===${NC}"
echo ""
echo "Install with: npm install @sharpee/sharpee@$VERSION"
