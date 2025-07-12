#!/bin/bash
cd /mnt/c/repotemp/sharpee
echo "Building engine package..."
cd packages/engine
pnpm build 2>&1 | tee ../../logs/build-eng-$(date +%Y%m%d-%H%M%S).log
echo "Build log saved to logs/build-eng-$(date +%Y%m%d-%H%M%S).log"
