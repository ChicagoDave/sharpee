#!/bin/bash

# Script to update platform-actions.test.ts to use setupSharedData helper

cd /mnt/c/repotemp/sharpee/packages/stdlib

# Backup the file first
cp tests/actions/platform-actions.test.ts tests/actions/platform-actions.test.ts.backup

# Replace world.setSharedData calls
# Pattern 1: Simple single property
sed -i "s/world\.setSharedData('\([^']*\)', \(.*\));/setupSharedData(world, { \1: \2 });/g" tests/actions/platform-actions.test.ts

# Pattern 2: Handle cases where the value spans multiple lines (like objects)
# This is trickier and might need manual fixes for complex cases

echo "Replacements complete. Check the diff:"
diff -u tests/actions/platform-actions.test.ts.backup tests/actions/platform-actions.test.ts | head -50

echo ""
echo "To see full diff: diff -u tests/actions/platform-actions.test.ts.backup tests/actions/platform-actions.test.ts"
echo "To revert: mv tests/actions/platform-actions.test.ts.backup tests/actions/platform-actions.test.ts"
