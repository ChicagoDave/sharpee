#!/bin/bash
# Bundle all Sharpee packages into a single distributable
# Usage: ./scripts/bundle-sharpee.sh

set -e

echo "=== Bundling Sharpee ==="

# Ensure packages are built first (only @sharpee/* packages, not stories)
echo "Building Sharpee packages..."
pnpm --filter '@sharpee/*' \
  --filter '!@sharpee/text-service-browser' \
  --filter '!@sharpee/text-service-template' \
  --filter '!@sharpee/story-*' \
  --filter '!@sharpee/platform-*' \
  build

# Create dist directory
mkdir -p dist

# Use esbuild to bundle everything
echo "Bundling with esbuild..."
npx esbuild \
  scripts/bundle-entry.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=dist/sharpee.js \
  --external:readline \
  --format=cjs \
  --sourcemap

# Generate TypeScript declarations (combine from packages)
echo "Generating type declarations..."
cat > dist/sharpee.d.ts << 'EOF'
// Auto-generated Sharpee type declarations
// This is a combined re-export of all package types

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
echo "=== Bundle Complete ==="
echo "Output: dist/sharpee.js ($BUNDLE_SIZE)"
echo ""

# Test load time
echo "Testing load time..."
node -e "
const start = Date.now();
require('./dist/sharpee.js');
console.log('Bundle loaded in ' + (Date.now() - start) + 'ms');
"
