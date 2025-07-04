#!/bin/bash
# Clean and rebuild script

set -e

echo "🧹 Cleaning all build artifacts..."

# Clean all tsbuildinfo files
find . -name "tsconfig.tsbuildinfo" -type f -delete

# Clean all dist directories
pnpm run clean

echo "📦 Installing dependencies..."
pnpm install

echo "🏗️ Building packages in order..."

# Build each package
for package in core world-model event-processor stdlib lang-en-us engine; do
  echo "  → Building @sharpee/$package..."
  cd packages/$package
  
  # Clean any existing build artifacts
  rm -rf dist
  rm -f tsconfig.tsbuildinfo
  
  # Build the package
  pnpm run build
  
  # Verify the build created files
  if [ -d "dist" ] && [ -f "dist/index.js" ]; then
    echo "    ✓ Build successful"
  else
    echo "    ✗ Build failed - no dist/index.js found"
    exit 1
  fi
  
  cd ../..
done

echo "✅ All packages built successfully!"
