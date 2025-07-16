#!/bin/bash
echo "=== Running stdlib tests after fixes ==="
echo ""
echo "Changes made:"
echo "1. Fixed GrammarPatterns immutability by freezing arrays"
echo "2. Added find() method to ActionRegistry"
echo "3. Added support for direct aliases on actions"  
echo "4. Fixed CommandValidator to use getInScope and exclude player/rooms"
echo ""
echo "Running specific test suites to check fixes..."
echo ""

cd /mnt/c/repotemp/sharpee/packages/stdlib

echo "=== Testing GrammarPatterns immutability ==="
pnpm test -- --testNamePattern="GrammarPatterns.*should be immutable" --verbose

echo ""
echo "=== Testing ActionRegistry ==="
pnpm test -- --testPathPattern="registry.test.ts" --verbose

echo ""
echo "=== Testing CommandValidator (Golden) ==="
pnpm test -- --testPathPattern="command-validator-golden.test.ts" --verbose

echo ""
echo "=== Full test run ==="
pnpm test
