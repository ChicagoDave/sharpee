#!/bin/bash
# Build dependencies first, then engine

echo "Building engine dependencies..."
cd ../..

# Build dependencies in order
pnpm --filter '@sharpee/core' run build
pnpm --filter '@sharpee/if-domain' run build  
pnpm --filter '@sharpee/world-model' run build
pnpm --filter '@sharpee/event-processor' run build
pnpm --filter '@sharpee/stdlib' run build
pnpm --filter '@sharpee/lang-en-us' run build

echo "Building engine..."
cd packages/engine
pnpm run build

echo "Build complete!"
