#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/core
echo "🧪 Running Core tests..."
pnpm test 2>&1 | tee test-results/test-run-after-changes.log
