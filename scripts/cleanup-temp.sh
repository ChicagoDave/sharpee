#!/bin/bash
# Clean up temporary files
cd /mnt/c/repotemp/sharpee/packages/engine

rm -f *.bak
rm -f build-test.sh
rm -f test-build.sh
rm -f build-with-deps.sh

echo "Cleanup complete"
