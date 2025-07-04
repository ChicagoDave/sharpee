#!/bin/bash
# Build Sharpee packages in dependency order

set -e  # Exit on error

echo "Building Sharpee packages in dependency order..."

# Core packages (no dependencies)
echo "Building @sharpee/core..."
cd packages/core && pnpm run build && cd ../..

# Packages that depend on core
echo "Building @sharpee/world-model..."
cd packages/world-model && pnpm run build && cd ../..

echo "Building @sharpee/event-processor..."
cd packages/event-processor && pnpm run build && cd ../..

# Packages that depend on core and world-model
echo "Building @sharpee/stdlib..."
cd packages/stdlib && pnpm run build && cd ../..

# Language packages
echo "Building @sharpee/lang-en-us..."
cd packages/lang-en-us && pnpm run build && cd ../..

# Engine (depends on most other packages)
echo "Building @sharpee/engine..."
cd packages/engine && pnpm run build && cd ../..

# Story packages (optional)
if [ "$1" == "--stories" ]; then
  echo "Building stories..."
  cd stories/cloak-of-darkness && pnpm run build && cd ../..
fi

echo "Build complete!"
