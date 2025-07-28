#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib

# Run just the first failing test
echo "Running first failing test from turning action..."
pnpm jest tests/unit/actions/turning-golden.test.ts -t "should fail when target is not visible" --no-coverage

