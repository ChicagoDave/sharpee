#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

echo "Running failing visibility tests..."
echo "================================="

# Run only the specific failing tests
pnpm test -- visibility-behavior.test.ts -t "should not benefit from light in closed container" --verbose
pnpm test -- visibility-behavior.test.ts -t "should return false for entity in closed opaque container" --verbose  
pnpm test -- visibility-behavior.test.ts -t "should handle deeply nested visibility" --verbose
pnpm test -- visibility-behavior.test.ts -t "should handle visibility in nested containers" --verbose

echo "================================="
echo "Test run complete"
