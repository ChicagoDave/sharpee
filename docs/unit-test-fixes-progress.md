# Unit Test Fixes Progress

## Fixed Files
1. ✅ **room.test.ts** - Added WorldModel and updated all createTestRoom calls
2. ✅ **container.test.ts** - Added WorldModel, removed non-existent import, updated all createTestContainer calls
3. ✅ **identity.test.ts** - Created local createTestEntity helper instead of importing
4. ✅ **switchable.test.ts** - Created local createTestSwitch helper, fixed createEntity calls
5. ✅ **openable.test.ts** - Fixed import path and function parameters
6. ✅ **lockable.test.ts** - Fixed import path and function parameters

## Remaining Issues
Still need to check other unit test files that might have similar issues:
- world-model.test.ts
- visibility-behavior.test.ts
- entry.test.ts
- Any other trait tests

## Pattern Applied
- Unit tests that test traits in isolation now either:
  1. Use WorldModel with the new test helper signatures
  2. Create simple local helper functions for tests that don't need full WorldModel functionality
- Fixed import paths from test-interactive to test-entities where appropriate
- Updated createEntity calls to use new signature (displayName, type) instead of (id, displayName)
