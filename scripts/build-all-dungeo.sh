#!/bin/bash
# Build all Sharpee packages + dungeo + bundle
# Stops on first failure

set -e  # Exit on first error

REPO_ROOT="/mnt/c/repotemp/sharpee"
cd "$REPO_ROOT"

# Function to build a package
build_package() {
    local package=$1
    local name=$2

    echo -n "[$name] "
    if pnpm --filter "$package" build > /dev/null 2>&1; then
        echo "✓"
    else
        echo "✗ FAILED"
        # Show the error
        pnpm --filter "$package" build 2>&1 | tail -20
        exit 1
    fi
}

echo "=== Building All Packages + Dungeo ==="
echo ""

# Build order based on dependencies
build_package "@sharpee/core" "core"
build_package "@sharpee/if-domain" "if-domain"
build_package "@sharpee/world-model" "world-model"
build_package "@sharpee/event-processor" "event-processor"
build_package "@sharpee/lang-en-us" "lang-en-us"
build_package "@sharpee/parser-en-us" "parser-en-us"
build_package "@sharpee/if-services" "if-services"
build_package "@sharpee/text-services" "text-services"
build_package "@sharpee/stdlib" "stdlib"
build_package "@sharpee/engine" "engine"
build_package "@sharpee/sharpee" "sharpee"
build_package "@sharpee/transcript-tester" "transcript-tester"
build_package "@sharpee/story-dungeo" "dungeo"

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
export * from '../packages/text-services/dist/index';
EOF

# Measure bundle size
BUNDLE_SIZE=$(ls -lh dist/sharpee.js | awk '{print $5}')

echo ""
echo "=== Complete ==="
echo "Bundle: dist/sharpee.js ($BUNDLE_SIZE)"

# Quick load test
echo -n "Load test: "
node -e "const s=Date.now();require('./dist/sharpee.js');console.log((Date.now()-s)+'ms')"
