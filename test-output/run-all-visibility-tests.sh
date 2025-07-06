#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

echo "Running all visibility tests..."
echo "================================="

# Run all visibility tests
pnpm test -- visibility-behavior.test.ts --verbose

echo "================================="
echo "Test run complete"
