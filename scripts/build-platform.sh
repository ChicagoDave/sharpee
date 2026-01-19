#!/bin/bash
# Build all Sharpee platform packages and create the node bundle
#
# Usage:
#   ./scripts/build-platform.sh              # Build everything
#   ./scripts/build-platform.sh --skip stdlib  # Skip to stdlib and build from there
#
# Output: dist/sharpee.js (node bundle with all platform packages)

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Increment patch version (patch only, prerelease tags untouched)
# If patch reaches 999, roll to next minor
increment_sharpee_version() {
    local SHARPEE_PKG="packages/sharpee/package.json"

    if [ ! -f "$SHARPEE_PKG" ]; then
        return
    fi

    # Read current version
    CURRENT_VERSION=$(node -p "require('./$SHARPEE_PKG').version")

    # Extract base version and prerelease separately
    BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-.*//')
    PRERELEASE=$(echo "$CURRENT_VERSION" | grep -oP '(?<=-).*' || echo "")

    # Parse base version parts
    MAJOR=$(echo "$BASE_VERSION" | cut -d. -f1)
    MINOR=$(echo "$BASE_VERSION" | cut -d. -f2)
    PATCH=$(echo "$BASE_VERSION" | cut -d. -f3)

    # Increment patch, roll minor if needed
    if [ "$PATCH" -ge 999 ]; then
        MINOR=$((MINOR + 1))
        PATCH=0
    else
        PATCH=$((PATCH + 1))
    fi

    # Reconstruct version (preserve prerelease if present)
    if [ -n "$PRERELEASE" ]; then
        NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-${PRERELEASE}"
    else
        NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
    fi

    # Update package.json
    node -e "
      const fs = require('fs');
      const pkg = require('./$SHARPEE_PKG');
      pkg.version = '$NEW_VERSION';
      fs.writeFileSync('$SHARPEE_PKG', JSON.stringify(pkg, null, 2) + '\n');
    "

    echo "[sharpee version] $CURRENT_VERSION → $NEW_VERSION"
}

# Parse arguments
SKIP_TO=""
if [ "$1" = "--skip" ] && [ -n "$2" ]; then
    SKIP_TO="$2"
fi

SKIPPING=true
if [ -z "$SKIP_TO" ]; then
    SKIPPING=false
fi

# Function to build a package
build_package() {
    local package=$1
    local name=$2

    # Check if we should skip this package
    if [ "$SKIPPING" = true ]; then
        if [ "$name" = "$SKIP_TO" ]; then
            SKIPPING=false
        else
            echo "[$name] skipped"
            return
        fi
    fi

    echo -n "[$name] "
    if pnpm --filter "$package" build > /dev/null 2>&1; then
        echo "✓"
    else
        echo "✗ FAILED"
        pnpm --filter "$package" build 2>&1 | tail -20
        exit 1
    fi
}

echo "=== Building Sharpee Platform ==="
if [ -n "$SKIP_TO" ]; then
    echo "(skipping to: $SKIP_TO)"
fi
increment_sharpee_version
echo ""

# Build order based on dependencies
build_package "@sharpee/core" "core"
build_package "@sharpee/if-domain" "if-domain"
build_package "@sharpee/world-model" "world-model"
build_package "@sharpee/event-processor" "event-processor"
build_package "@sharpee/lang-en-us" "lang-en-us"
build_package "@sharpee/parser-en-us" "parser-en-us"
build_package "@sharpee/if-services" "if-services"
build_package "@sharpee/text-blocks" "text-blocks"
build_package "@sharpee/text-service" "text-service"
build_package "@sharpee/stdlib" "stdlib"
build_package "@sharpee/engine" "engine"
build_package "@sharpee/sharpee" "sharpee"
build_package "@sharpee/transcript-tester" "transcript-tester"

echo ""
echo "=== Bundling ==="

# Create dist directory
mkdir -p dist

# Use esbuild to bundle everything
echo -n "[bundle] "
if npx esbuild \
  scripts/bundle-entry.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=dist/sharpee.js \
  --external:readline \
  --format=cjs \
  --sourcemap > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ FAILED"
    npx esbuild scripts/bundle-entry.js --bundle --platform=node --target=node18 --outfile=dist/sharpee.js --external:readline --format=cjs 2>&1 | tail -20
    exit 1
fi

# Generate TypeScript declarations
cat > dist/sharpee.d.ts << 'EOF'
// Auto-generated Sharpee type declarations
export * from '../packages/core/dist/index';
export * from '../packages/if-domain/dist/index';
export * from '../packages/world-model/dist/index';
export * from '../packages/stdlib/dist/index';
export * from '../packages/engine/dist/index';
export * from '../packages/parser-en-us/dist/index';
export * from '../packages/lang-en-us/dist/index';
export * from '../packages/event-processor/dist/index';
export * from '../packages/text-blocks/dist/index';
export * from '../packages/text-service/dist/index';
EOF

# Measure bundle size
BUNDLE_SIZE=$(ls -lh dist/sharpee.js | awk '{print $5}')

echo ""
echo "=== Platform Build Complete ==="
echo "Bundle: dist/sharpee.js ($BUNDLE_SIZE)"

# Quick load test
echo -n "Load test: "
node -e "const s=Date.now();require('./dist/sharpee.js');console.log((Date.now()-s)+'ms')"
