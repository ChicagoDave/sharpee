#!/bin/bash
# Build script to check current errors

echo "Building @sharpee/core..."
cd packages/core
npx tsc --noEmit 2>&1 | head -20

echo -e "\n\nBuilding @sharpee/stdlib..."
cd ../stdlib
npx tsc --noEmit 2>&1 | head -20

echo -e "\n\nBuilding @sharpee/actions..."
cd ../actions
npx tsc --noEmit 2>&1 | head -20
