#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

echo "Running Phase 4 Interactive Trait Tests..."
echo "=========================================="

# Run each new test file
echo -e "\n1. Testing Openable Trait..."
pnpm test -- openable.test.ts

echo -e "\n2. Testing Lockable Trait..."
pnpm test -- lockable.test.ts

echo -e "\n3. Testing Switchable Trait..."
pnpm test -- switchable.test.ts

echo -e "\n4. Testing Door Trait..."
pnpm test -- door.test.ts

echo -e "\n=========================================="
echo "Phase 4 Test Summary:"
echo "Running all interactive trait tests together..."
pnpm test -- tests/unit/traits/openable.test.ts tests/unit/traits/lockable.test.ts tests/unit/traits/switchable.test.ts tests/unit/traits/door.test.ts

echo -e "\n=========================================="
echo "Total test count across all phases:"
pnpm test -- --listTests | wc -l
