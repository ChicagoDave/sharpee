#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine
echo "Running minimal vocabulary test..."
pnpm test minimal-vocab.test.ts --verbose 2>&1 | head -100
