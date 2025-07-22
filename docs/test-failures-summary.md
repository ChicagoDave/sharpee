# World Model Test Failures Summary

## Build Issues (FIXED)
- ✅ Removed `baseLight` property reference from `roomBehavior.ts` - this was removed per the lighting ADR

## Test Failures

### 1. Test Helper Signature Changes
The ID refactor changed how test entities are created. The test helpers now require:
- First parameter: `WorldModel` instance
- Changed from `createTestRoom(name)` to `createTestRoom(world, name)`

**Affected test files:**
- `tests/unit/traits/room.test.ts` - All tests using `createTestRoom` need world parameter
- `tests/unit/traits/container.test.ts` - Similar issues
- `tests/unit/traits/identity.test.ts` - Missing export `createTestEntity`
- Many other trait tests

### 2. Visibility Test Failures
Some visibility chain tests are failing:
- "should see worn items on actors" - worn items not appearing in visible list
- "should handle multiple visibility blockers" - chest not visible after opening

### 3. Entity System Test Failures
- Mixed old/new entity handling is failing
- Entity relationships with IDs not working as expected

### 4. Backwards Compatibility
- Old `createEntity(id, displayName)` signature tests failing
- ID generation for unknown types not using correct prefix

## Recommendations

1. **Update all test files** to use new test helper signatures with WorldModel
2. **Fix visibility behavior** for worn items and container contents
3. **Review ID generation** for backwards compatibility if needed
4. **Update deprecated entity creation** patterns in tests

The core functionality appears to be working (builds fine), but the tests need to be updated to match the new ID system implementation.
