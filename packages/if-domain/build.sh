#!/bin/bash
# Build script for if-domain package

set -e

echo "Building @sharpee/if-domain..."

# Clean previous build
rm -rf dist/

# Build TypeScript
npx tsc

echo "✅ Build complete!"
