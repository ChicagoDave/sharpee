#!/bin/bash
# Build only the packages that should work

echo "Building working packages only..."
cd /mnt/c/repotemp/sharpee

# First ensure packages are linked
echo "Bootstrapping packages..."
npx lerna bootstrap

# Build in dependency order
echo "Building @sharpee/core..."
npx lerna run build --scope=@sharpee/core

echo "Building @sharpee/world-model..."  
npx lerna run build --scope=@sharpee/world-model

echo "Building @sharpee/client-core..."
npx lerna run build --scope=@sharpee/client-core

echo "Building @sharpee/lang-en-us..."
npx lerna run build --scope=@sharpee/lang-en-us

echo "Building @sharpee/ext-daemon..."
npx lerna run build --scope=@sharpee/ext-daemon

echo "Building @sharpee/extension-conversation..."
npx lerna run build --scope=@sharpee/extension-conversation

echo ""
echo "Skipping packages with known issues:"
echo "- @sharpee/stdlib (needs major refactoring)"
echo "- @sharpee/forge (depends on stdlib)"
echo "- @sharpee/story-cloak-of-darkness (depends on stdlib)"

echo ""
echo "Build complete for working packages!"
