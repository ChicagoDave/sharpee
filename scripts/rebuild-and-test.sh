#!/bin/bash
cd /mnt/c/repotemp/sharpee

# Rebuild stdlib first since engine depends on it
echo "Rebuilding stdlib..."
cd packages/stdlib
pnpm build

# Now rebuild engine
echo -e "\nRebuilding engine..."
cd ../engine
pnpm build

# Run tests
echo -e "\nRunning tests..."
pnpm test:coverage 2>&1 | tee test-after-rebuild.log

# Show results
echo -e "\n\nTest Results:"
tail -20 test-after-rebuild.log | grep -E "Test Suites:|Tests:|Snapshots:|Time:|Coverage:"
