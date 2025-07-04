#!/bin/bash
# Build and test Core package in WSL

# Navigate to the core package
cd /mnt/c/repotemp/sharpee/packages/core

# Build first
echo "Building Core package..."
pnpm exec tsc

# Run the tests
echo "Running Core package tests..."
pnpm test
