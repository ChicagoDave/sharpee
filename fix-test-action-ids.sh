#!/bin/bash

echo "Fixing action IDs in test files..."

# Fix all test files to use the correct action ID
for file in /mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/action-behaviors/pulling/*.test.ts; do
  echo "Fixing $file"
  sed -i "s/'pulling'/'if.action.pulling'/g" "$file"
done

# Also fix the integration test registry
sed -i "s/action: 'pulling'/action: 'if.action.pulling'/g" /mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/action-behaviors/pulling/pulling-refactored.integration.test.ts

echo "All test files have been fixed to use correct action IDs!"