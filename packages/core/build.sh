#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/core
echo "🧹 Cleaning dist..."
pnpm clean
echo "🔨 Building..."
pnpm build
echo "✅ Build complete!"
