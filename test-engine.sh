#!/bin/bash
cd /mnt/c/repotemp/sharpee
echo "Running engine tests..."
pnpm --filter @sharpee/engine test 2>&1 | tee logs/test-eng-$(date +%Y%m%d-%H%M%S).log
