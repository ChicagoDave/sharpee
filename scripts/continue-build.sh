#!/bin/bash
echo "=== Continuing Build Process ==="
echo ""

cd /mnt/c/repotemp/sharpee

echo "Building stdlib again..."
cd packages/stdlib
if pnpm build > /tmp/build-stdlib.log 2>&1; then
    echo "✅ Stdlib build successful!"
else
    echo "❌ Stdlib build failed!"
    echo "Error output:"
    tail -30 /tmp/build-stdlib.log
    exit 1
fi

echo ""
echo "Building engine..."
cd ../engine
rm -rf dist
if pnpm build 2>&1 | tee ../../logs/build-engine-$(date +%Y%m%d-%H%M%S).log; then
    echo ""
    echo "✅ Engine build successful!"
    echo ""
    echo "Running tests..."
    pnpm test 2>&1 | tee ../../logs/test-engine-$(date +%Y%m%d-%H%M%S).log
else
    echo ""
    echo "❌ Engine build failed!"
fi
