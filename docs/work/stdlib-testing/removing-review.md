## Summary

The **removing action** is designed to extract items from containers or supporters and move them to the player's inventory. It's essentially a specialized form of the taking action that targets items already in a specific source (container/supporter). The action follows a strict four-phase pattern: validate → execute → report/blocked.

## Implementation Analysis

### Four-Phase Pattern Compliance: ✓ GOOD
The action correctly implements all four phases:
- **validate()**: Checks preconditions (item exists, source exists, item is in source, container is open, player doesn't already have it)
- **execute()**: Performs world state mutations (calls ContainerBehavior.removeItem or SupporterBehavior.removeItem, then ActorBehavior.takeItem)
- **report()**: Generates success events (if.event.taken + action.success)
- **blocked()**: Generates failure events (action.blocked)

### Execute Phase Mutation Verification: ⚠️ POTENTIAL ISSUE

**Critical Finding**: The removing action's execute phase calls behavior methods that return results but DO NOT perform moveEntity:

```typescript
// Lines 237-241 in removing.ts
if (source.has(TraitType.CONTAINER)) {
  removeResult = ContainerBehavior.removeItem(source, item, context.world);
} else if (source.has(TraitType.SUPPORTER)) {
  removeResult = SupporterBehavior.removeItem(source, item, context.world);
}
```

These behavior methods (ContainerBehavior.removeItem, SupporterBehavior.removeItem) only **validate** the removal - they do NOT call moveEntity. They return a result object indicating success/failure, but the actual world state mutation is missing.

Then the code calls:
```typescript
// Line 246 in removing.ts
const takeResult: ITakeItemResult = ActorBehavior.takeItem(actor, item, context.world);
```

This also only validates, returning a result with stateChanged=true, but does NOT call moveEntity.

**The execute phase never calls context.world.moveEntity(item.id, actor.id)**. This is a direct parallel to the dropping bug - the action delegates to behavior methods for validation, but those methods don't perform the actual mutation.

### Event Emission: ✓ GOOD
The action correctly emits:
- `if.event.taken` event (same as taking action) with proper snapshots
- `action.success` event with appropriate message (removed_from or removed_from_surface)
- `action.blocked` event on validation failure

## Test Coverage Analysis

### Test File Location
`/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/removing-golden.test.ts`

### All Four Phases Tested: ✓ MOSTLY GOOD
- ✓ validate() tests (lines 92-228)
- ✓ execute() tests (lines 231-332)
- ✓ report() tests (embedded in success paths)
- ✓ blocked() tests (embedded in failure paths)

### Test Case Inventory

**Precondition Tests (11 tests)**:
- No target specified
- No source specified
- Item not in specified container
- Item not on specified supporter
- Player already has item
- Container is closed
- Source type handling (neither container nor supporter)
- Container that is also supporter

**Success Tests (4 tests)**:
- Remove from open container
- Remove from container without openable trait
- Remove from supporter
- Event structure validation

**Edge Cases (3 tests)**:
- Removing last item from container
- Nested containers
- Specific error for wrong container

**Total: 18 tests across 426 lines**

### Critical Gap: World State Mutation Not Verified

**SEVERE TEST COVERAGE GAP**: None of the test cases verify that the item actually moved to the player's inventory.

Example from the test file (lines 232-270):
```typescript
test('should remove from open container', () => {
  // ... setup ...
  const events = executeAction(removingAction, context);
  
  expectEvent(events, 'if.event.taken', { /* ... */ });
  expectEvent(events, 'action.success', { /* ... */ });
  // Tests check EVENTS and MESSAGES, but never verify world state!
  // No assertion like: expect(world.getLocation(coin.id)).toBe(player.id);
});
```

The tests only verify:
1. ✓ Correct events are emitted
2. ✓ Correct message IDs in events
3. ✓ Correct message parameters
4. ✗ MISSING: Item's actual location in world after execution
5. ✗ MISSING: Item removed from container
6. ✗ MISSING: Item in player's inventory

## Gaps Identified

### 1. **Execute Phase Missing moveEntity Calls** (HIGH RISK)
The execute phase performs validation but never calls `context.world.moveEntity()` to actually move the item:
- From container/supporter to player inventory
- There's no actual world state mutation

**Comparison with dropping action**: The dropping action CORRECTLY calls:
```typescript
context.world.moveEntity(noun.id, dropLocation);  // Line 154 in dropping.ts
```

The removing action should call:
```typescript
context.world.moveEntity(item.id, actor.id);  // MISSING!
```

### 2. **Tests Don't Verify World State Changes** (HIGH RISK)
- All 18 tests only check event emissions and messages
- Zero tests verify the item's location before/after
- Zero tests verify container contents changed
- Zero tests verify player inventory changed

**Example of what's missing**:
```typescript
test('should move item to player inventory', () => {
  const coin = world.createEntity('coin', 'object');
  const box = world.createEntity('box', 'object');
  box.add({ type: TraitType.CONTAINER });
  
  world.moveEntity(coin.id, box.id);
  assert(world.getLocation(coin.id) === box.id);  // Before
  
  // Execute remove action
  executeAction(removingAction, context);
  
  // MISSING ASSERTION:
  expect(world.getLocation(coin.id)).toBe(player.id);  // After
  expect(world.getContents(box.id)).not.toContain(coin.id);
});
```

### 3. **Multi-Object Command Execution Not Tested** (MEDIUM RISK)
- Tests cover validation of multi-object commands
- Zero tests verify execution of multi-object commands
- "remove all from box" might fail silently

### 4. **Capacity Constraints Not Tested** (MEDIUM RISK)
- RemovingMessages.CANNOT_TAKE and CONTAINER_FULL are referenced but never triggered in tests
- Tests don't verify player inventory is full

### 5. **Behavior Method Return Values Not Used** (DESIGN RISK)
- ContainerBehavior.removeItem() returns IRemoveItemResult
- SupporterBehavior.removeItem() returns IRemoveItemFromSupporterResult
- ActorBehavior.takeItem() returns ITakeItemResult
- These results are stored but never checked in report phase
- Should validate success flag before reporting

## Recommendations

### Priority 1: Fix Execute Phase (BLOCKING)
Add moveEntity call to actually mutate world state:
```typescript
// After successful removal from container/supporter
context.world.moveEntity(item.id, actor.id);
```

### Priority 2: Add World State Verification Tests
```typescript
test('should move item to player inventory', () => {
  // Setup item in container
  world.moveEntity(coin.id, box.id);
  
  // Execute
  const events = executeAction(removingAction, context);
  
  // Verify world state
  expect(world.getLocation(coin.id)).toBe(player.id);
  expect(world.getContents(box.id)).toEqual([]);
});
```

### Priority 3: Test Capacity Failure Cases
```typescript
test('should fail when player inventory is full', () => {
  // Setup player at capacity
  const actor = context.player;
  actor.add({ type: TraitType.ACTOR, capacity: { maxItems: 1 } });
  const item1 = world.createEntity('item1', 'object');
  world.moveEntity(item1.id, actor.id);  // Inventory full
  
  // Try to remove another item
  const item2 = world.createEntity('item2', 'object');
  const container = world.createEntity('container', 'object');
  container.add({ type: TraitType.CONTAINER });
  world.moveEntity(container.id, room.id);
  world.moveEntity(item2.id, container.id);
  
  // Should fail with inventory full message
  const events = executeAction(removingAction, context);
  expectEvent(events, 'action.blocked', {
    messageId: 'cannot_take'  // or 'container_full'
  });
});
```

### Priority 4: Test Multi-Object Execution
```typescript
test('should remove all items from container', () => {
  const container = world.createEntity('container', 'object');
  container.add({ type: TraitType.CONTAINER });
  const item1 = world.createEntity('item1', 'object');
  const item2 = world.createEntity('item2', 'object');
  
  world.moveEntity(item1.id, container.id);
  world.moveEntity(item2.id, container.id);
  
  // Execute "remove all from container"
  const context = createRealTestContext(removingAction, world, 
    createCommand(IFActions.REMOVING, {
      isAll: true,
      secondEntity: container
    }));
  
  const events = executeAction(removingAction, context);
  
  // Verify both items moved
  expect(world.getLocation(item1.id)).toBe(player.id);
  expect(world.getLocation(item2.id)).toBe(player.id);
});
```

### Priority 5: Verify Behavior Results
Check result.success before reporting:
```typescript
if (!removeResult.success) {
  throw new Error('Remove failed but validation passed');
}
```

## Risk Level

**HIGH**

### Reasoning:
1. **Execute phase doesn't mutate world state** - Items remain in containers after "removal"
2. **Tests only check messages, not world state** - The dropping bug likely persists undetected
3. **Direct parallel to known dropping bug** - Same pattern: delegates to behavior methods without calling moveEntity
4. **Game-breaking consequence** - Players can't extract items from containers
5. **Hidden by passing tests** - All 18 tests pass despite broken functionality

### Likelihood of Bug Going Undetected:
- **Integration tests**: Low (story tests would catch this)
- **Unit tests**: HIGH (they only test events, not world state)
- **Manual testing**: Low (immediately obvious when trying to remove items)

This follows the exact pattern that caused the dropping bug: test coverage that validates events and messages but ignores actual world state mutations.
