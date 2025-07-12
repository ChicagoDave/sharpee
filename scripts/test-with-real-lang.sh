#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine

echo "Installing dependencies..."
pnpm install

echo -e "\nRunning tests..."
pnpm test 2>&1 | tee ../../logs/test-eng-real-lang-$(date +%Y%m%d-%H%M%S).log

echo ""
echo "Test summary:"
tail -10 ../../logs/test-eng-real-lang-*.log | grep -E "(Test Suites:|Tests:|Time:)"
