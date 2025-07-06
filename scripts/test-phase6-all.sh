#!/bin/bash
# test-phase6-all.sh - Run all Phase 6 tests at once

echo "Running all Phase 6 tests..."

cd /mnt/c/repotemp/sharpee/packages/world-model

# Run jest with pattern matching for Phase 6 directories
npx jest \
  --testPathPattern="(services|extensions|integration)" \
  --verbose \
  2>&1 | tee /mnt/c/repotemp/sharpee/test-wm-phase6-all-$(date +%Y%m%d-%H%M%S).log
