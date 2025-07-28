#!/bin/bash
# Quick test script to check if tests run

cd "$(dirname "$0")"

echo "Building event-processor..."
pnpm run build

echo "Running tests..."
pnpm test
