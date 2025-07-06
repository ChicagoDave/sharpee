#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

# Run just the visibility test first to see if our fixes work
echo "Running visibility-chains test..."
pnpm test -- tests/integration/visibility-chains.test.ts
