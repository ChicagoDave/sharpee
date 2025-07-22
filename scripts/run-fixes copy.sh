#!/bin/bash
# Run the test fixes from the correct directory

echo "Changing to test-fixes directory..."
cd /mnt/c/repotemp/sharpee/test-fixes

echo "Running simple fixes..."
node run-simple-fixes.js

echo "Done! Check the output above for results."
