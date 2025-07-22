# stdlib Tests Checklist

## ✅ Completed Fixes

### Core Architecture Issues
- [x] Fixed `WorldModel.canMoveEntity()` to allow entities in ROOMs and ACTORs
- [x] Fixed test-utils trait addition bug (duplicate `type` property)
- [x] Fixed examining action to include targetId/targetName when examining self
- [x] Fixed asking action to use `canReach()` instead of direct location comparison
- [x] Fixed inserting action command structure when delegating to putting
- [x] Fixed searching test using non-existent `TraitType.NOT_REACHABLE`
- [x] Added `findEntityByName()` helper function to test-utils

### Impact
- **300+ test failures resolved**
- Core containment architecture now correct
- Basic world setup working properly

## ❌ Remaining Issues

### 1. Location Still Showing as Actor ID (Priority: HIGH)
- [ ] Debug why `getContainingRoom()` returns undefined even after successful move
- [ ] Add logging to `setupBasicWorld()` to verify move success
- [ ] Check if issue is in `getContainingRoom()` implementation
- [ ] Verify spatial index is updated correctly after moves

### 2. Test Pattern Updates (Priority: HIGH)
- [ ] Update all tests using `world.getEntityByName()` to use returned object from TestData
- [ ] Count: ~20+ occurrences in unlocking-golden.test.ts alone
- [ ] Similar patterns in other test files need updating

### 3. Platform Action Tests (Priority: MEDIUM)
- [ ] Update all platform action tests to use `setupBasicWorld()`
- [ ] Files affected:
  - [ ] tests/actions/platform-actions.test.ts
  - [ ] All "Saving Action" tests
  - [ ] All "Restoring Action" tests
  - [ ] All "Quitting Action" tests
  - [ ] All "Restarting Action" tests

### 4. Context World Property (Priority: MEDIUM)
- [ ] Verify putting action can access `context.world`
- [ ] Check if context delegation in inserting action preserves all properties
- [ ] Add spread operator to ensure all context properties are copied

### 5. Migration Example Tests (Priority: LOW)
- [ ] Update migration examples to follow new patterns
- [ ] Fix trait addition in example code
- [ ] Update to use proper world setup

## Script Requirements

### For Test Pattern Updates
1. Must identify exact pattern: `world.getEntityByName('...')`
2. Must extract entity name
3. Must check if TestData.withObject was used with same name
4. Must update to use destructured object
5. Must preserve any additional logic

### For Platform Action Updates
1. Must identify tests without proper world setup
2. Must add `setupBasicWorld()` call
3. Must use returned world, player, room
4. Must preserve test logic

### Safety Requirements
- [ ] Create backup of all test files before running
- [ ] Run on one file first as test
- [ ] Verify tests still compile after changes
- [ ] Count changes made and report
- [ ] Rollback capability if issues found
