#!/bin/bash
cd /mnt/c/repotemp/sharpee
echo "Building stdlib..."
pnpm --filter @sharpee/stdlib build 2>&1 | tee logs/build-std-$(date +%Y%m%d-%H%M%S).log
