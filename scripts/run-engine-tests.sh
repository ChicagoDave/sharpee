#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine

echo "Running engine tests..."
pnpm test 2>&1 | tee ../../logs/test-eng-progress-$(date +%Y%m%d-%H%M%S).log

echo ""
echo "Test summary:"
grep -E "(Test Suites:|Tests:)" ../../logs/test-eng-progress-*.log | tail -2
