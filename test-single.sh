#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
echo "Testing turning action..."
pnpm jest tests/unit/actions/turning-golden.test.ts --no-coverage --silent 2>&1 | grep -E "(PASS|FAIL|●)"
