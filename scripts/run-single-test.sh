#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine
echo "Running single test file..."
pnpm test -- command-executor.test.ts --verbose 2>&1 | head -100
