#!/bin/bash
echo "=== Analyzing Potential Breaking Changes ==="
echo ""

cd /mnt/c/repotemp/sharpee

# Function to check imports in engine
check_imports() {
    echo "📋 Checking engine imports from refactored packages..."
    echo ""
    
    # Find all imports from the refactored packages
    echo "Imports from @sharpee/core:"
    grep -r "from '@sharpee/core'" packages/engine/src --include="*.ts" | grep -v ".d.ts" | sed 's/.*from/@sharpee\/core:/' | sort | uniq
    
    echo ""
    echo "Imports from @sharpee/world-model:"
    grep -r "from '@sharpee/world-model'" packages/engine/src --include="*.ts" | grep -v ".d.ts" | sed 's/.*from/@sharpee\/world-model:/' | sort | uniq
    
    echo ""
    echo "Imports from @sharpee/event-processor:"
    grep -r "from '@sharpee/event-processor'" packages/engine/src --include="*.ts" | grep -v ".d.ts" | sed 's/.*from/@sharpee\/event-processor:/' | sort | uniq
}

# Function to check for specific API usage
check_api_usage() {
    echo ""
    echo "🔍 Checking specific API usage in engine..."
    echo ""
    
    # Check SemanticEvent usage
    echo "SemanticEvent usage:"
    grep -n "SemanticEvent" packages/engine/src/*.ts packages/engine/src/**/*.ts 2>/dev/null | grep -v "import" | head -5
    
    echo ""
    echo "WorldModel method calls:"
    grep -n "world\." packages/engine/src/*.ts packages/engine/src/**/*.ts 2>/dev/null | grep -E "(getEntity|getLocation|getContents|canSee)" | head -10
    
    echo ""
    echo "EventProcessor usage:"
    grep -n "eventProcessor" packages/engine/src/*.ts packages/engine/src/**/*.ts 2>/dev/null | grep -v "private" | head -5
}

# Check test expectations
check_test_expectations() {
    echo ""
    echo "🧪 Checking test expectations..."
    echo ""
    
    echo "Mock objects in tests:"
    grep -n "createTest\|createMock" packages/engine/tests/*.ts 2>/dev/null | head -10
    
    echo ""
    echo "Test assertions on refactored types:"
    grep -n "expect.*\(world\|event\|processor\)" packages/engine/tests/*.ts 2>/dev/null | head -10
}

# Run all checks
check_imports
check_api_usage
check_test_expectations

echo ""
echo "=== Next Steps ==="
echo "1. Review the above imports and API usage"
echo "2. Build dependencies in order"
echo "3. Run 'pnpm -F @sharpee/engine build' to see specific errors"
echo "4. Fix any type mismatches or missing exports"
