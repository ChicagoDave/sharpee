# Stdlib Test Suite Fix Checklist

## Overview
This checklist tracks the systematic fixing of test failures in the `@sharpee/stdlib` package. The test suite has ~200 failing tests that need to be addressed in priority order.

## Priority 1: TestData.basicSetup() References (~40% of failures) ✅ COMPLETED

### Files Fixed
- [x] `/tests/unit/actions/putting-golden.test.ts` - 21 occurrences - FIXED
- [x] `/tests/unit/actions/turning-golden.test.ts` - 20 occurrences - FIXED
- [x] `/tests/unit/actions/exiting-golden.test.ts` - 11 occurrences - FIXED
- [x] `/tests/unit/actions/dropping-golden.test.ts` - 7 occurrences - FIXED
- [x] `/tests/unit/actions/unlocking-golden.test.ts` - 1 occurrence - FIXED
- [x] `/tests/unit/actions/throwing-golden.test.ts` - 1 occurrence - FIXED
- [x] `/tests/unit/actions/inventory-golden.test.ts` - 10 occurrences - FIXED

### Final verification completed - 0 remaining occurrences

### Fix Pattern
Replace:
```typescript
const { world, player, room } = TestData.basicSetup();
```

With:
```typescript
const { world, player, room } = setupBasicWorld();
```

## Priority 2: Command Structure Issues (~30% of failures) ✅ COMPLETED

### Issue
Tests use old createCommand signature that doesn't match how actions access command parameters:
- Old: `createCommand(actionId, { entity: x }, { entity: y })`
- New: `createCommand(actionId, { entity: x, secondEntity: y })`

### Affected Actions (two-object commands)
- [x] **putting** - put X in/on Y - FIXED (19 calls)
- [x] **giving** - give X to Y - FIXED (15 calls)
- [x] **showing** - show X to Y - CHECKED (uses different test utils)
- [x] **throwing** - throw X at Y - FIXED (14 calls)
- [x] **unlocking** - unlock X with Y - FIXED (8 calls)
- [x] **locking** - lock X with Y - FIXED (7 calls)
- [x] **inserting** - insert X into Y - FIXED (11 calls)
- [x] **removing** - remove X from Y - FIXED (13 calls)

### Fix Pattern
```typescript
// OLD - WRONG
const command = createCommand(IFActions.PUTTING,
  { entity: item },
  { entity: container }
);

// NEW - CORRECT
const command = createCommand(IFActions.PUTTING, {
  entity: item,
  secondEntity: container
});

// WITH PREPOSITION
const command = createCommand(IFActions.PUTTING, {
  entity: item,
  secondEntity: container,
  preposition: 'in'
});
```

### Infrastructure Updates
- [x] Updated test-utils createCommand to handle preposition in structure
- [x] Fixed putting-golden.test.ts (19 createCommand calls)

### Total Fixes: ~87 createCommand calls updated across 8 test files

## Priority 3: Event Property Mismatches (~25% of failures)

### Common Mismatches to Fix

#### Property Name Issues
- [ ] `item` vs `target` - Actions use `item`, tests expect `target` or vice versa
- [ ] Missing `bodyPart` property in wearing tests
- [ ] Extra properties like `fromContainer`, `fromLocation` not expected by tests
- [ ] `willAutoOpen` property issues in unlocking tests

#### Message ID Mismatches
- [ ] `opened` vs `its_empty` in opening action
- [ ] `key_not_held` vs `if.action.unlocking.no_key`
- [ ] `wrong_key` vs `if.action.unlocking.no_key`
- [ ] `hands_full` vs `if.action.wearing.already_wearing`
- [ ] Short message IDs vs fully qualified IDs (e.g., `brief_nap` vs `if.action.sleeping.brief_nap`)

### Files to Review
- [ ] `/tests/unit/actions/unlocking-golden.test.ts`
- [ ] `/tests/unit/actions/wearing-golden.test.ts`
- [ ] `/tests/unit/actions/examining-golden.test.ts`
- [ ] `/tests/unit/actions/opening-golden.test.ts`
- [ ] `/tests/unit/actions/pulling-golden.test.ts`
- [ ] `/tests/unit/actions/pushing-golden.test.ts`
- [ ] `/tests/unit/actions/looking-golden.test.ts`
- [ ] `/tests/unit/actions/smelling-golden.test.ts`
- [ ] `/tests/actions/sleeping.test.ts`

## Priority 4: Player Setup Issues (~20% of failures)

### Files Missing world.setPlayer()
- [ ] `/tests/integration/action-language-integration.test.ts`
- [ ] `/tests/unit/actions/looking-golden.test.ts` - darkness tests
- [ ] `/tests/unit/actions/taking-golden.test.ts` - capacity tests
- [ ] `/tests/actions/sleeping.test.ts` - Check if player setup is correct

### Fix Pattern
Ensure all test setups include:
```typescript
const player = world.createEntity('Player', 'actor');
world.setPlayer(player);
```

## Priority 5: Command Validator Tests (~10% of failures)

### Parser Integration Tasks
- [ ] Create parser integration helper in test-utils
- [ ] Import parser from `@sharpee/parser-en-us` package
- [ ] Update `/tests/unit/validation/command-validator-golden.test.ts`
- [ ] Add parser initialization to test setup
- [ ] Update tests to use real parsing instead of manual command creation

### Helper Function to Create
```typescript
// In test-utils/index.ts
export function createParserWithWorld(world: IFWorldModel) {
  // Import and initialize parser from @sharpee/parser-en-us
  // Configure with test world for entity resolution
  // Return configured parser instance
}
```

## Priority 6: Action Logic Mismatches (~5% of failures)

### Specific Issues to Fix
- [ ] Unlocking action - Key validation logic
- [ ] Turning action - Key in lock detection
- [ ] Sleeping action - State detection logic
- [ ] Pulling action - Reachability checks
- [ ] Pushing action - Reachability checks
- [ ] Entering action - Already inside checks
- [ ] Exiting action - Various state checks

## Additional Tasks

### Test Infrastructure
- [ ] Document proper test patterns in `/tests/README.md`
- [ ] Add more test utility helpers for common scenarios
- [ ] Create builders for complex test objects
- [ ] Add assertion helpers for event validation

### Type Safety
- [ ] Fix `Invalid trait: must have a type property` errors
- [ ] Review trait construction in tests
- [ ] Ensure all traits have required properties

### Integration Tests
- [ ] Fix platform-specific test setup
- [ ] Ensure action-language integration tests work
- [ ] Add parser integration to relevant tests

## Success Metrics
- [ ] All tests passing (0 failures)
- [ ] No skipped tests without documentation
- [ ] Test coverage maintained or improved
- [ ] Clear patterns documented for future tests

## Notes
- Start with Priority 1 as it affects the most tests
- Many failures will cascade - fixing one issue may resolve multiple test failures
- Always run tests after each fix to track progress
- Update this checklist as new issues are discovered
