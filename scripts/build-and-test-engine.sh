#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine
echo "Building engine package..."
pnpm build 2>&1 | tee ../../logs/build-eng-final-$(date +%Y%m%d-%H%M%S).log
build_status=$?
echo ""
if [ $build_status -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "Running tests..."
    pnpm test 2>&1 | tee ../../logs/test-eng-final-$(date +%Y%m%d-%H%M%S).log
    test_status=$?
    if [ $test_status -eq 0 ]; then
        echo "✅ All tests passed!"
    else
        echo "❌ Some tests failed. Check the log for details."
    fi
else
    echo "❌ Build failed!"
    tail -20 ../../logs/build-eng-final-*.log
fi
