#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

echo "Running Phase 4 tests after fixes..."
echo "===================================="

# Run just the interactive trait tests
pnpm test -- tests/unit/traits/openable.test.ts tests/unit/traits/lockable.test.ts tests/unit/traits/switchable.test.ts tests/unit/traits/door.test.ts

echo "===================================="
echo "Test run complete"
