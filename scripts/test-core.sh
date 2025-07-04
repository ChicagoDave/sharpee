#!/bin/bash
# Test Core package in WSL

# Navigate to the core package
cd /mnt/c/repotemp/sharpee/packages/core

# Run the tests
echo "Running Core package tests..."
pnpm test

# Save the output to a log file
pnpm test > /mnt/c/repotemp/sharpee/test-core-$(date +%Y%m%d-%H%M%S).log 2>&1

echo "Test complete. Check the log file for results."
