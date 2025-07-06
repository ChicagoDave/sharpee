#!/bin/bash
echo "Running Core tests..."
cd /mnt/c/repotemp/sharpee
pnpm --filter @sharpee/core test 2>&1 | tee test-core-$(date +%Y%m%d-%H%M%S).log
