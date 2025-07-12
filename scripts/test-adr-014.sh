#!/bin/bash
# Test script for ADR-014 implementation

echo "Testing AuthorModel implementation..."
echo "====================================="

# Change to world-model directory
cd packages/world-model

# Run the specific tests
echo "Running AuthorModel unit tests..."
npx jest tests/unit/author-model.test.ts --verbose

echo ""
echo "Running container hierarchies integration test..."
npx jest tests/integration/container-hierarchies.test.ts --testNamePattern="should update visibility when opening/closing containers" --verbose

echo ""
echo "Test complete!"
