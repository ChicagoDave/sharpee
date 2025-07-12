#!/bin/bash
echo "=== Building and Testing Engine with Real Language Package ==="
echo ""

cd /mnt/c/repotemp/sharpee

# Build lang-en-us first
echo "Step 1: Building @sharpee/lang-en-us..."
cd packages/lang-en-us
if pnpm build > /tmp/build-lang.log 2>&1; then
    echo "  ✅ Language package built successfully"
else
    echo "  ❌ Language package build failed!"
    cat /tmp/build-lang.log
    exit 1
fi

# Install dependencies in engine
echo ""
echo "Step 2: Installing engine dependencies..."
cd ../engine
pnpm install

echo ""
echo "Step 3: Running engine tests..."
pnpm test 2>&1 | tee ../../logs/test-eng-final-$(date +%Y%m%d-%H%M%S).log

echo ""
echo "=== Test Summary ==="
tail -15 ../../logs/test-eng-final-*.log | grep -E "(Test Suites:|Tests:|Time:|Coverage:)"
