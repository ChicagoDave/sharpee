#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine
echo "Checking TypeScript compilation errors..."
echo "========================================="
npx tsc --noEmit 2>&1 | head -20
echo "========================================="
echo "First 20 errors shown."
