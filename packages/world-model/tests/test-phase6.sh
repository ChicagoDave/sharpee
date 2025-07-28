#!/bin/bash
# test-phase6.sh - Run all Phase 6 tests

echo "Running Phase 6 tests..."

cd /mnt/c/repotemp/sharpee/packages/world-model

# Run jest directly with the test files
npx jest \
  tests/integration/trait-combinations.test.ts \
  tests/integration/container-hierarchies.test.ts \
  tests/integration/room-navigation.test.ts \
  tests/integration/door-mechanics.test.ts \
  tests/integration/visibility-chains.test.ts \
  2>&1 | tee /mnt/c/repotemp/sharpee/test-wm-phase6-$(date +%Y%m%d-%H%M%S).log
