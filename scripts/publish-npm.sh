#!/bin/bash
# Publish all @sharpee packages to npm
# Usage: ./scripts/publish-npm.sh [--dry-run] [--version X.Y.Z]

set -e

# Default version (can be overridden with --version)
VERSION="0.9.50-beta"
DRY_RUN=""

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

# Packages in dependency order (excludes alpha/experimental packages)
PACKAGES=(
  "core"
  "if-domain"
  "world-model"
  "event-processor"
  "lang-en-us"
  "parser-en-us"
  "if-services"
  "text-blocks"
  "text-service"
  "stdlib"
  "engine"
  "sharpee"
)

# Update versions in all packages
echo -e "${GREEN}=== Updating versions to $VERSION ===${NC}"
for pkg in "${PACKAGES[@]}"; do
  PKG_JSON="packages/$pkg/package.json"
  if [ -f "$PKG_JSON" ]; then
    # Update version using node to preserve JSON formatting
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('$PKG_JSON', 'utf8'));
      pkg.version = '$VERSION';
      fs.writeFileSync('$PKG_JSON', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "  Updated $pkg"
  fi
done

# Build all packages
echo ""
echo -e "${GREEN}=== Building packages ===${NC}"
if command -v pnpm &> /dev/null; then
  ./scripts/build-platform.sh
else
  ./scripts/build-platform-ubuntu.sh
fi

# Publish each package
echo ""
echo -e "${GREEN}=== Publishing packages ===${NC}"
for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="packages/$pkg"
  if [ -d "$PKG_DIR" ]; then
    echo ""
    echo -e "${YELLOW}Publishing @sharpee/$pkg...${NC}"
    cd "$PKG_DIR"
    pnpm publish --access public --no-git-checks --tag beta $DRY_RUN || {
      echo -e "${RED}Failed to publish @sharpee/$pkg${NC}"
      cd ../..
      exit 1
    }
    cd ../..
  fi
done

echo ""
echo -e "${GREEN}=== Done! ===${NC}"
echo ""
echo "Published packages:"
for pkg in "${PACKAGES[@]}"; do
  echo "  @sharpee/$pkg@$VERSION"
done
echo ""
echo "Install with: npm install @sharpee/sharpee@$VERSION"
