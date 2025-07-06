#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

echo "Running clean visibility tests..."
echo "================================="

# Run all world tests to ensure clean output
pnpm test -- tests/unit/world/

echo "================================="
echo "Test run complete - should be clean with no console output"
