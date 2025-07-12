#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
echo "Building world-model..."
pnpm build
echo -e "\nRunning integration tests..."
pnpm test tests/integration 2>&1 | tee ../../logs/test-wm-integration-$(date +%Y%m%d-%H%M%S).log
