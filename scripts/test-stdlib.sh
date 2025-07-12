#!/bin/bash
# Run stdlib tests without coverage thresholds

cd "$(dirname "$0")/../packages/stdlib"

# Run tests without coverage
echo "Running stdlib tests..."
pnpm jest --no-coverage

# If you want to see coverage without thresholds:
# pnpm jest --coverage --coverageThreshold='{}'
