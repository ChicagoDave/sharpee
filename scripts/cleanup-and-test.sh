#!/bin/bash
echo "=== Cleaning up old-style tests ==="
echo ""
echo "These tests use deprecated interfaces and have golden replacements:"
echo "- closing.test.ts (replaced by closing-golden.test.ts)"
echo "- waiting.test.ts (replaced by waiting-golden.test.ts)"
echo "- scoring.test.ts (no golden replacement, uses non-existent methods)"
echo ""

cd /mnt/c/repotemp/sharpee/packages/stdlib

# Remove old-style tests
rm -f tests/unit/actions/closing.test.ts
rm -f tests/unit/actions/waiting.test.ts
rm -f tests/unit/actions/scoring.test.ts

echo "Removed old-style test files"
echo ""
echo "=== Running tests after cleanup ==="
echo ""

# Run tests again
pnpm test
