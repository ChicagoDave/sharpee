#!/bin/bash
# Run all Core tests and save results

cd /mnt/c/repotemp/sharpee/packages/core

# Build first
echo "Building Core package..."
pnpm exec tsc

# Create timestamp for log file
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/mnt/c/repotemp/sharpee/test-core-${TIMESTAMP}.log"

# Run all tests
echo "Running all Core tests..."
pnpm test 2>&1 | tee "$LOG_FILE"

# Check exit status
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed. Check $LOG_FILE for details."
fi
