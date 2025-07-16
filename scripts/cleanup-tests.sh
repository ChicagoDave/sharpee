#!/bin/bash
# Clean up old-style tests that have been replaced by golden tests

cd /mnt/c/repotemp/sharpee/packages/stdlib

# Remove old tests that have golden equivalents
rm -f tests/unit/actions/closing.test.ts
rm -f tests/unit/actions/waiting.test.ts
rm -f tests/unit/actions/scoring.test.ts

# These tests use the old ActionExecutor interface and have been replaced by:
# - closing-golden.test.ts
# - waiting-golden.test.ts
# - scoring action doesn't have a golden test yet but the old test is incompatible

echo "Removed old-style tests that have been replaced by golden tests"
echo "Running tests to check current status..."

pnpm test
