#!/bin/bash
echo "=== Building Sharpee Engine with Dependencies ==="
echo ""

# Function to build a package
build_package() {
    local pkg=$1
    echo "📦 Building @sharpee/$pkg..."
    cd /mnt/c/repotemp/sharpee/packages/$pkg
    
    if pnpm build > /tmp/build-$pkg.log 2>&1; then
        echo "  ✅ Build successful"
        return 0
    else
        echo "  ❌ Build failed!"
        echo "  Error output:"
        tail -20 /tmp/build-$pkg.log | sed 's/^/    /'
        return 1
    fi
}

# Start from root
cd /mnt/c/repotemp/sharpee

echo "Step 1: Building dependencies in order..."
echo ""

# Build in dependency order
if ! build_package "core"; then
    echo "❌ Failed to build core. Stopping."
    exit 1
fi

if ! build_package "world-model"; then
    echo "❌ Failed to build world-model. Stopping."
    exit 1
fi

if ! build_package "event-processor"; then
    echo "❌ Failed to build event-processor. Stopping."
    exit 1
fi

if ! build_package "lang-en-us"; then
    echo "❌ Failed to build lang-en-us. Stopping."
    exit 1
fi

if ! build_package "stdlib"; then
    echo "❌ Failed to build stdlib. Stopping."
    exit 1
fi

echo ""
echo "Step 2: Building engine..."
echo ""

cd /mnt/c/repotemp/sharpee/packages/engine

# Clear any old build artifacts
echo "Cleaning old build artifacts..."
rm -rf dist

# Try to build
echo "Running TypeScript compiler..."
if pnpm build 2>&1 | tee ../../logs/build-engine-full-$(date +%Y%m%d-%H%M%S).log; then
    echo ""
    echo "✅ Engine build successful!"
    echo ""
    echo "Step 3: Running tests..."
    if pnpm test 2>&1 | tee ../../logs/test-engine-full-$(date +%Y%m%d-%H%M%S).log; then
        echo "✅ All tests passed!"
    else
        echo "❌ Some tests failed. Check logs for details."
    fi
else
    echo ""
    echo "❌ Engine build failed!"
    echo "Check the log file for details."
fi
