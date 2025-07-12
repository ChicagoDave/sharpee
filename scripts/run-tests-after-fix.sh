#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine

# Clean up test files we created
rm -f test-lang-provider.js test-import.ts
rm -f tests/debug-vocab.test.ts tests/vocab-debug.test.ts tests/verb-structure.test.ts

# Run tests again with coverage
echo "Running tests with real language provider..."
pnpm test:coverage 2>&1 | tee test-run-after-fix.log

# Show summary
echo -e "\n\nTest Summary:"
grep -E "Test Suites:|Tests:|Coverage:" test-run-after-fix.log | tail -10
