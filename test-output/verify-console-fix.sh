#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

echo "Verifying all tests pass after console.warn fix..."
echo "================================================="

# Run just the world-model test to verify the fix
pnpm test -- world-model.test.ts

echo "================================================="
echo "Running full test suite to confirm total count..."
pnpm test

echo "================================================="
echo "Test verification complete"
