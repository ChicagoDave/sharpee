#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
echo "Running verify-world-model test..."
pnpm test verify-world-model.test.ts 2>&1 | grep -E "(Room ID:|Player ID:|Move succeeded:|Player location:|Location is room:|Containing room:|test-utils.ts|PASS|FAIL|Expected|Received|toBe)"
