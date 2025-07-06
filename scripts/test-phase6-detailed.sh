#!/bin/bash
# test-phase6-detailed.sh - Run all Phase 6 tests with category separation

echo "Running Phase 6 tests (Services & Integration)..."
echo "================================================"

cd /mnt/c/repotemp/sharpee/packages/world-model

# Create timestamp for log file
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/mnt/c/repotemp/sharpee/test-wm-phase6-${TIMESTAMP}.log"

# Run all tests and capture output
{
    echo "Phase 6 Test Execution - ${TIMESTAMP}"
    echo "======================================"
    echo ""
    
    echo "SERVICES TESTS:"
    echo "--------------"
    npx jest \
        tests/unit/services/world-model-service.test.ts \
        tests/unit/services/scope-service.test.ts \
        --verbose
    
    echo ""
    echo "EXTENSION TESTS:"
    echo "---------------"
    npx jest \
        tests/unit/extensions/registry.test.ts \
        tests/unit/extensions/loader.test.ts \
        --verbose
    
    echo ""
    echo "INTEGRATION TESTS:"
    echo "-----------------"
    npx jest \
        tests/integration/trait-combinations.test.ts \
        tests/integration/container-hierarchies.test.ts \
        tests/integration/room-navigation.test.ts \
        tests/integration/door-mechanics.test.ts \
        tests/integration/visibility-chains.test.ts \
        --verbose
    
    echo ""
    echo "Phase 6 Test Summary:"
    echo "===================="
    echo "Services Tests: 2 files"
    echo "Extension Tests: 2 files"
    echo "Integration Tests: 5 files"
    echo "Total: 9 test files"
    
} 2>&1 | tee "${LOG_FILE}"

echo ""
echo "Test log saved to: ${LOG_FILE}"
