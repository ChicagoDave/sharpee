#!/bin/bash
# Make sure we're in WSL format for the script
cd /mnt/c/repotemp/sharpee

# Script to update all action test files from jest to vitest
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd /mnt/c/repotemp/sharpee/packages/stdlib

echo -e "${BLUE}=== Updating test files from jest to vitest ===${NC}"
echo ""

# Find all test files in the actions directory
ACTION_TESTS=$(find tests/unit/actions -name "*-golden.test.ts" -type f)
TOTAL_FILES=$(echo "$ACTION_TESTS" | wc -l)
UPDATED=0

echo -e "${BLUE}Found ${TOTAL_FILES} action test files to update${NC}"
echo ""

for test_file in $ACTION_TESTS; do
    echo -n "Updating $test_file ... "
    
    # Check if file contains jest import
    if grep -q "@jest/globals" "$test_file"; then
        # Replace jest import with vitest
        sed -i "s/import { describe, test, expect, beforeEach } from '@jest\/globals';/import { describe, test, expect, beforeEach } from 'vitest';/g" "$test_file"
        echo -e "${GREEN}✓${NC}"
        ((UPDATED++))
    else
        echo -e "${YELLOW}skipped (already updated)${NC}"
    fi
done

echo ""
echo -e "${GREEN}Updated ${UPDATED} files${NC}"

# Also check for any other jest references
echo ""
echo -e "${BLUE}Checking for any remaining jest references...${NC}"
if grep -r "@jest" tests/ --include="*.ts" --include="*.js"; then
    echo -e "${YELLOW}Warning: Found additional jest references above${NC}"
else
    echo -e "${GREEN}No other jest references found${NC}"
fi

echo ""
echo -e "${GREEN}=== Update complete ===${NC}"
echo ""
echo "You can now run tests with: ./test-action.sh <action-name>"
