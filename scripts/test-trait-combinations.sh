#!/bin/bash
cd /mnt/c/repotemp/sharpee
echo "Building world-model package..."
cd packages/world-model
pnpm build
echo "Running integration tests..."
pnpm test tests/integration/trait-combinations.test.ts 2>&1 | tee ../../logs/test-wm-trait-combinations-$(date +%Y%m%d-%H%M%S).log
