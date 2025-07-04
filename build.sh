#!/bin/bash
# Build script that handles dependencies properly

set -e

echo "🔧 Setting up Sharpee build environment..."

# Ensure we're in the root directory
cd /mnt/c/repotemp/sharpee

# Install all dependencies and create symlinks
echo "📦 Installing dependencies..."
pnpm install

# Build packages in dependency order
echo "🏗️ Building core packages..."

echo "  → Building @sharpee/core..."
cd packages/core
pnpm run build
cd ../..

echo "  → Building @sharpee/world-model..."
cd packages/world-model  
pnpm run build
cd ../..

echo "  → Building @sharpee/event-processor..."
cd packages/event-processor
pnpm run build
cd ../..

echo "  → Building @sharpee/stdlib..."
cd packages/stdlib
pnpm run build
cd ../..

echo "  → Building @sharpee/lang-en-us..."
cd packages/lang-en-us
pnpm run build
cd ../..

echo "  → Building @sharpee/engine..."
cd packages/engine
pnpm run build
cd ../..

echo "✅ Build complete!"
