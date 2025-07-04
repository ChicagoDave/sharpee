#!/bin/bash
# Test only the event ID uniqueness test

cd /mnt/c/repotemp/sharpee/packages/core

# Build first
echo "Building Core package..."
pnpm exec tsc

# Run just the specific test
echo "Running event ID uniqueness test..."
pnpm exec jest tests/events/event-system.test.ts -t "should generate unique IDs"
