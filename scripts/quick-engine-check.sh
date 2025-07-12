#!/bin/bash
echo "=== Quick Engine Build Test ==="
echo ""

cd /mnt/c/repotemp/sharpee/packages/engine

echo "Running TypeScript compiler..."
npx tsc --noEmit 2>&1 | head -30

echo ""
echo "=== First 30 errors shown ==="
