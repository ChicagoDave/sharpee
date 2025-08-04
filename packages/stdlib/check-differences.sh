#!/bin/bash

echo "Checking which action test files have changes..."
for f in /tmp/stdlib-tests-old/unit/actions/*.test.ts; do
  filename=$(basename "$f")
  if [ -f "tests/unit/actions/$filename" ]; then
    if ! diff -q "$f" "tests/unit/actions/$filename" >/dev/null 2>&1; then
      echo "  Changed: $filename"
    else
      echo "  Unchanged: $filename"
    fi
  else
    echo "  Missing: $filename"
  fi
done