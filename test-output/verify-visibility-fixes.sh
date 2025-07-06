#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

echo "Running visibility tests after fixes..."
echo "================================="

# Run the specific tests that were failing
pnpm test -- visibility-behavior.test.ts -t "should not benefit from light in closed container" 
pnpm test -- visibility-behavior.test.ts -t "should return false for entity in closed opaque container"
pnpm test -- visibility-behavior.test.ts -t "should handle deeply nested visibility"
pnpm test -- visibility-behavior.test.ts -t "should handle visibility in nested containers"

echo "================================="
echo "Running all visibility tests..."
pnpm test -- visibility-behavior.test.ts

echo "================================="
echo "Test run complete"
