#!/bin/bash
# Clean and rebuild all packages in the correct order

echo "Cleaning all packages..."
cd /mnt/c/repotemp/sharpee

# Clean all dist directories
npm run clean

# Clean node_modules to ensure fresh installs
echo "Cleaning node_modules..."
lerna clean -y

# Reinstall dependencies
echo "Installing dependencies..."
npm install
lerna bootstrap

# Build packages in dependency order
echo "Building packages in order..."

# 1. Build core first (no dependencies)
echo "Building @sharpee/core..."
cd packages/core
npm run build
cd ../..

# 2. Build world-model (depends on core)
echo "Building @sharpee/world-model..."
cd packages/world-model
npm run build
cd ../..

# 3. Build other packages that depend on world-model
echo "Building remaining packages..."
npm run build

echo "Build complete!"
