#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
echo "Running debug visibility test..."
pnpm test -- debug-visibility.test.ts --verbose
