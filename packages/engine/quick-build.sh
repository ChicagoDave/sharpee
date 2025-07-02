#!/bin/bash
# Quick build test for engine

cd /mnt/c/repotemp/sharpee/packages/engine
echo "Testing engine build..."
npm run build 2>&1 | tee engine-build-test-$(date +%Y%m%d-%H%M%S).log
