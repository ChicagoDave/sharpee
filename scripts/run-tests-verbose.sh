#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine
echo "Running tests with detailed output..."
pnpm test -- --verbose 2>&1 | tee test-output-verbose.log
