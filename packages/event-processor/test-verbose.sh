#!/bin/bash
# Run tests for event-processor with detailed output

cd "$(dirname "$0")"

echo "======================================"
echo "Event Processor Test Run"
echo "======================================"
echo ""

# First ensure dependencies are installed
echo "1. Installing dependencies..."
pnpm install

echo ""
echo "2. Building package..."
pnpm run build

echo ""
echo "3. Running tests..."
pnpm test -- --verbose

echo ""
echo "======================================"
echo "Test run complete"
echo "======================================"
