#!/bin/bash
echo "=== Dependency Assessment for Engine Package ==="
echo ""

# Function to check package version and last build
check_package() {
    local pkg=$1
    echo "📦 Checking $pkg..."
    cd /mnt/c/repotemp/sharpee/packages/$pkg
    
    # Check if built recently
    if [ -d "dist" ]; then
        echo "  ✓ Has dist folder"
        # Get last modified time of dist
        find dist -type f -name "*.js" -printf "  Last built: %TY-%Tm-%Td %TH:%TM\n" | head -1
    else
        echo "  ✗ No dist folder - needs build"
    fi
    
    # Check version
    version=$(cat package.json | grep '"version"' | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    echo "  Version: $version"
    
    # Check if tests exist and pass
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        echo "  Running tests..."
        if pnpm test --passWithNoTests > /dev/null 2>&1; then
            echo "  ✓ Tests pass"
        else
            echo "  ✗ Tests fail or error"
        fi
    fi
    echo ""
}

# Check all dependencies
echo "Checking engine dependencies..."
echo ""

check_package "core"
check_package "event-processor"
check_package "world-model"
check_package "lang-en-us"
check_package "stdlib"

echo "=== Checking for Breaking Changes ==="
echo ""

# Look for recent changes in key files
echo "Recent changes in dependency interfaces:"
echo ""

cd /mnt/c/repotemp/sharpee

# Check for changes in exported types
echo "🔍 Checking @sharpee/core exports..."
grep -h "export" packages/core/src/index.ts 2>/dev/null | head -10

echo ""
echo "🔍 Checking @sharpee/world-model exports..."
grep -h "export" packages/world-model/src/index.ts 2>/dev/null | head -10

echo ""
echo "🔍 Checking @sharpee/event-processor exports..."
grep -h "export" packages/event-processor/src/index.ts 2>/dev/null | head -10

echo ""
echo "=== Build Order Recommendation ==="
echo "Based on dependencies, build in this order:"
echo "1. pnpm -F @sharpee/core build"
echo "2. pnpm -F @sharpee/world-model build"
echo "3. pnpm -F @sharpee/event-processor build"
echo "4. pnpm -F @sharpee/lang-en-us build"
echo "5. pnpm -F @sharpee/stdlib build"
echo "6. pnpm -F @sharpee/engine build"
