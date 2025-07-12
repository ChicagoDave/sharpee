#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
echo "Building world-model..."
pnpm build 2>&1 | tee ../../logs/build-wm-$(date +%Y%m%d-%H%M%S).log
echo -e "\nRunning trait combination tests..."
pnpm test tests/integration/trait-combinations.test.ts 2>&1 | tee ../../logs/test-wm-trait-combinations-$(date +%Y%m%d-%H%M%S).log
