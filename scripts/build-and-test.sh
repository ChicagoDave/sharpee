#!/bin/bash
cd /mnt/c/repotemp/sharpee

echo "Building stdlib..."
cd packages/stdlib
if pnpm build; then
    echo "✅ Stdlib build successful!"
else
    echo "❌ Stdlib build failed!"
    exit 1
fi

echo -e "\nBuilding engine..."
cd ../engine
if pnpm build; then
    echo "✅ Engine build successful!"
    echo -e "\nRunning tests..."
    pnpm test --passWithNoTests
else
    echo "❌ Engine build failed!"
fi
