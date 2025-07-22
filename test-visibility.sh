#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib

# Run just the specific test with more output
echo "Running turning action visibility test..."
pnpm jest tests/unit/actions/turning-golden.test.ts -t "should fail when target is not visible" --no-coverage --verbose

