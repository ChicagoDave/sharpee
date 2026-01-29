#!/bin/bash
#
# Pack all @sharpee packages into a single downloadable release tarball.
#
# Usage: ./pack-release.sh
#
# Output: release/sharpee-0.9.60-beta.tgz
#
# This creates a self-contained tarball where the main @sharpee/sharpee
# package references all its dependencies as local file: tarballs.
# Users install with:
#   npm install -g ./sharpee-0.9.60-beta.tgz
#
set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

RELEASE_DIR="$REPO_ROOT/release"
STAGE_DIR="$RELEASE_DIR/stage"
VERSION="0.9.60-beta"

# These are the packages to include (order matters for packing)
PACKAGES=(
  "packages/core"
  "packages/if-domain"
  "packages/text-blocks"
  "packages/text-service"
  "packages/world-model"
  "packages/event-processor"
  "packages/if-services"
  "packages/engine"
  "packages/stdlib"
  "packages/parser-en-us"
  "packages/lang-en-us"
  "packages/extensions/testing"
  "packages/sharpee"
)

echo -e "${GREEN}=== Sharpee Release Packer ===${NC}"
echo ""

# Clean previous release
rm -rf "$RELEASE_DIR"
mkdir -p "$STAGE_DIR"

# Step 1: Build everything
echo -e "${YELLOW}[1/4] Building all packages...${NC}"
./build.sh --no-version 2>&1 | tail -5
echo ""

# Step 2: Pack each package
echo -e "${YELLOW}[2/4] Packing packages...${NC}"
declare -A TARBALL_MAP
for pkg in "${PACKAGES[@]}"; do
  pkg_dir="$REPO_ROOT/$pkg"
  name=$(node -e "console.log(require('$pkg_dir/package.json').name)")
  echo "  Packing $name..."
  tarball=$(cd "$pkg_dir" && pnpm pack --pack-destination "$STAGE_DIR" 2>/dev/null | tail -1)
  # pnpm pack outputs the full path
  tarball_file=$(basename "$tarball")
  TARBALL_MAP["$name"]="$tarball_file"
done
echo ""

# Step 3: Rewrite main package.json to use file: references
echo -e "${YELLOW}[3/4] Rewriting dependencies to local tarballs...${NC}"
MAIN_PKG="$STAGE_DIR/${TARBALL_MAP["@sharpee/sharpee"]}"

# Extract the main tarball, rewrite package.json, repack
REWRITE_DIR="$RELEASE_DIR/rewrite"
mkdir -p "$REWRITE_DIR"
tar xzf "$MAIN_PKG" -C "$REWRITE_DIR"

node -e "
const fs = require('fs');
const path = require('path');
const pkgPath = path.join('$REWRITE_DIR', 'package', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const tarballs = JSON.parse('$(node -e "
const m = {};
$(for pkg in "${PACKAGES[@]}"; do
  name=$(node -e "console.log(require('$REPO_ROOT/$pkg/package.json').name)")
  echo "m['$name']='${TARBALL_MAP[$name]}';"
done)
console.log(JSON.stringify(m));
")');

// Rewrite dependencies to file: references
for (const [dep, range] of Object.entries(pkg.dependencies || {})) {
  if (tarballs[dep]) {
    pkg.dependencies[dep] = 'file:' + tarballs[dep];
  }
}

// Also include bundledDependencies so npm packs them in
pkg.bundledDependencies = Object.keys(pkg.dependencies || {}).filter(d => tarballs[d]);

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('  Rewrote dependencies:');
for (const dep of pkg.bundledDependencies) {
  console.log('    ' + dep + ' -> file:' + tarballs[dep]);
}
"

# Copy dependency tarballs into the package directory so file: refs resolve
for pkg in "${PACKAGES[@]}"; do
  name=$(node -e "console.log(require('$REPO_ROOT/$pkg/package.json').name)")
  if [ "$name" != "@sharpee/sharpee" ]; then
    cp "$STAGE_DIR/${TARBALL_MAP[$name]}" "$REWRITE_DIR/package/"
  fi
done

# Repack
echo ""
echo -e "${YELLOW}[4/4] Creating release tarball...${NC}"
FINAL_TARBALL="$RELEASE_DIR/sharpee-$VERSION.tgz"
tar czf "$FINAL_TARBALL" -C "$REWRITE_DIR" package

# Clean up staging
rm -rf "$STAGE_DIR" "$REWRITE_DIR"

# Summary
SIZE=$(du -h "$FINAL_TARBALL" | cut -f1)
echo ""
echo -e "${GREEN}=== Release Ready ===${NC}"
echo "  File: $FINAL_TARBALL"
echo "  Size: $SIZE"
echo ""
echo "Install globally:"
echo "  npm install -g ./release/sharpee-$VERSION.tgz"
echo ""
echo "Or host on GitHub Releases and install via URL:"
echo "  npm install -g https://github.com/ChicagoDave/sharpee/releases/download/v$VERSION/sharpee-$VERSION.tgz"
echo ""
echo "Then create a story:"
echo "  sharpee init my-adventure"
echo ""
