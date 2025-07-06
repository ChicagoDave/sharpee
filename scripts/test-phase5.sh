#!/bin/bash
# test-phase5.sh - Run all Phase 5 tests

echo "Running Phase 5 tests..."

cd /mnt/c/repotemp/sharpee/packages/world-model

# Run jest directly with the test files
npx jest \
  tests/unit/traits/actor.test.ts \
  tests/unit/traits/wearable.test.ts \
  tests/unit/traits/readable.test.ts \
  tests/unit/traits/edible.test.ts \
  tests/unit/traits/scenery.test.ts \
  tests/unit/traits/supporter.test.ts \
  tests/unit/traits/light-source.test.ts \
  2>&1 | tee /mnt/c/repotemp/sharpee/test-wm-phase5-$(date +%Y%m%d-%H%M%S).log
