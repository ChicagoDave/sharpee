#!/bin/bash

# Test a single action test file
filename=$1
if [ -z "$filename" ]; then
  echo "Usage: $0 <test-filename>"
  exit 1
fi

echo "Testing $filename..."
npm test -- "tests/unit/actions/$filename" 2>&1 | grep -E "(PASS|FAIL|Error:|ERROR:|✓|×)" | head -10