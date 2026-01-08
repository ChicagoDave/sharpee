## Summary

The dropping action removes held items from the player's inventory and places them in the current location (which could be a room, container, or supporter). It supports single-object drops and multi-object commands (drop all, drop X and Y). The action recently had a critical bug where the **execute phase failed to call moveEntity**, causing items to remain in inventory despite emitting success events. The test suite validates four-phase pattern compliance, message generation, and event structures, but contains a significant gap: **no test verifies that world state is actually mutated after execution**.

## Implementation Analysis

### Four-Phase Pattern Compliance: EXCELLENT

The action properly implements all four phases:

1. **Validate Phase** (lines 263-276):
   - Single-object path: Checks if item is held, not worn, drop location exists
   - Multi-object path: Expands command scope and validates each entity individually
   - Returns ValidationResult with error/params for reporting

2. **Execute Phase** (lines 278-307):
   - **CRITICAL FINDING**: After the recent fix (2026-01-07), both code paths now call `context.world.moveEntity()`:
     - Line 154: Multi-object path in `executeSingleEntity()`
     - Line 302: Single-object path in main `execute()`
   - Before fix: This was missing, causing THE EXACT BUG THIS REVIEW IS CHECKING FOR
   - Stores results in `sharedData` for report phase consumption

3. **Report Phase** (lines 309-341):
   - Single-object: Uses data builder pattern (`buildDroppedData`, `determineDroppingMessage`)
   - Multi-object: Generates individual success/blocked events for each item
   - Emits both `if.event.dropped` (domain event) and `action.success` (message effect)
   - Correctly determines message based on drop location type (room/container/supporter)

4. **Blocked Phase** (lines 343-351):
   - Returns single `action.blocked` event with messageId and params
   - Properly includes item name in error context

### Event Emission: CORRECT

- `if.event.dropped` event includes: item ID, location ID, location type flags (toRoom/toContainer/toSupporter)
- Entity snapshots are captured and included for atomic event tracking
- `action.success` events include appropriate messageIds: `dropped`, `dropped_in`, `dropped_on`, `dropped_quietly`, `dropped_carelessly`

### World State Mutation: NOW CORRECT (Was Broken)

Both execution paths now properly call `moveEntity()`:

```typescript
// Multi-object path (line 154)
if (dropLocation) {
  context.world.moveEntity(noun.id, dropLocation);
}

// Single-object path (line 302)  
if (dropLocation) {
  context.world.moveEntity(noun.id, dropLocation);
}
```

**History**: This was missing before 2026-01-07, causing items to remain in inventory despite events being emitted. The bug manifested only when NPCs or code queried actual world state via `getContents()`.

## Test Coverage Analysis

### Test File: `dropping-golden.test.ts`

**Total Test Cases**: 16 tests (3 skipped)

#### Four-Phase Compliance Tests (Excellent)
- ✓ validate method exists
- ✓ execute method exists  
- ✓ report method exists
- ✓ report() generates ALL events (not execute)
- ✓ Action has correct ID and metadata
- ✓ All required messages declared

#### Precondition/Validation Tests (Good)
- ✓ Fails when no target specified (NO_TARGET)
- ✓ Fails when not holding item (NOT_HELD)
- ✓ Fails when item worn (STILL_WORN)
- ✓ Fails when container full (CONTAINER_FULL)
- ✓ Container-closed scenario (SKIPPED - requires ADR-043 implied destinations)

#### Successful Dropping Tests (Moderate Coverage)
- ✓ Drop item in room
- ✓ Drop item in open container
- ✓ Drop item on supporter
- ✓ Container without capacity limits

#### Message Variation Tests (Good)
- ✓ Glass items use "dropped_quietly" message
- ✓ Discard verb uses "dropped_carelessly" message

#### Edge Cases (Partial)
- ✓ Wearable item not currently worn
- ✓ Player dropping in non-standard location (SKIPPED)
- ✓ Event structure validation

### Coverage Assessment

**Phases Tested**: ✓✓✓✗ (3 of 4)
- Validate: Heavily tested (5 cases)
- Execute: MINIMALLY TESTED (1 indirect verification)
- Report: Extensively tested (message variations, event structure)
- Blocked: Implicitly tested via blocked phase assertions

**Message Coverage**: 6 of 11 required messages tested
- ✓ no_target, not_held, still_worn, container_full, dropped, dropped_in, dropped_on
- ✗ container_not_open (not triggered in tests)
- ✗ cant_drop_here (tested in validation but not blocked assertion)
- ✓ dropped_quietly, dropped_carelessly

## Critical Gap: World State Mutation Verification

**THIS IS THE EXACT ISSUE THAT ALLOWED THE DROPPING BUG TO EXIST**

All tests verify that:
- Events are emitted (✓)
- Messages are correct (✓)
- Validation logic works (✓)

**None verify that**:
- Item location actually changed in world model
- Item no longer in inventory after drop
- Item now in drop location (room/container/supporter)
- Entity.location property updated correctly

### Example of Missing Test

```typescript
test('MISSING: should actually move item to room in world state', () => {
  const { world, player, item } = TestData.withInventoryItem('red ball');
  
  const command = createCommand(IFActions.DROPPING, { entity: item });
  const context = createRealTestContext(droppingAction, world, command);
  
  // BEFORE execution
  expect(world.getLocation(item.id)).toBe(player.id);
  
  executeAction(droppingAction, context);
  
  // AFTER execution - THIS IS NOT CHECKED BY ANY TEST
  const room = world.getContainingRoom(player.id);
  expect(world.getLocation(item.id)).toBe(room.id);  // MISSING!
  expect(world.getContents(player.id)).not.toContain(item.id);  // MISSING!
  expect(world.getContents(room.id)).toContain(item.id);  // MISSING!
});
```

This test would have **caught the 2026-01-07 bug immediately** because after calling `executeAction()`, the item would still be in inventory (player.id) instead of the room.

## Gaps Identified

### HIGH PRIORITY

1. **World State Mutation Not Verified** (CRITICAL)
   - No test checks that `world.getLocation(item.id)` changed
   - No test checks that item left inventory
   - No test checks that item appears in drop location contents
   - The 2026-01-07 bug proves this gap allowed production bugs to slip through

2. **container_not_open Case Not Covered**
   - Validation checks for closed containers in validation phase
   - No test actually triggers the CONTAINER_NOT_OPEN error path
   - Current test for closed containers is skipped (ADR-043 blocker)

3. **cant_drop_here Error Path Not Covered**
   - Message is in required list but never tested as blocked error
   - Container canAccept check exists but not exercised

4. **Multi-Object Commands Under-tested**
   - No tests for "drop all" syntax
   - No tests for "drop X and Y" syntax
   - No tests for "drop all but X" syntax
   - Only validated via helper function, not via actual command parsing

5. **Player in Non-Standard Location**
   - Test is skipped (context.currentLocation bug)
   - Coverage gap for dropping when player is in vehicle/vehicle-like entity

### MEDIUM PRIORITY

6. **Container Capacity Checks Partially Tested**
   - Only tests maxItems limit
   - Doesn't test canAccept() behavior (weight, restrictions, etc.)

7. **Location Type Determination Logic**
   - toRoom flag tested implicitly
   - toContainer tested
   - toSupporter tested
   - But no test verifies ROOM entities return toRoom=true correctly

8. **ActorBehavior Integration**
   - Action calls ActorBehavior.dropItem() twice:
     - Line 150 (multi-object): Calls it for validation
     - Line 297 (single-object): Calls it again for side effects
   - No test verifies ActorBehavior contract or side effects beyond moveEntity

### LOW PRIORITY

9. **Entity Snapshot Validation**
   - Data builder includes itemSnapshot, actorSnapshot, locationSnapshot
   - Event structure test verifies entity IDs but not snapshot completeness
   - Tests don't verify snapshots contain expected fields

10. **Verb Detection for Message Variation**
    - "discard" verb logic exists but only tested with one message
    - No test for plain "drop" vs "discard" comparison

## Recommendations

### MUST ADD (Critical for Bug Prevention)

1. **World State Mutation Tests** for all drop scenarios:
   ```typescript
   describe('World State Mutation Verification', () => {
     test('drop in room: item moves from inventory to room', () => {
       // Before: item.location === player.id
       executeAction(droppingAction, context);
       // After: item.location === room.id
       // After: world.getContents(player.id) does not include item
       // After: world.getContents(room.id) includes item
     });
     
     test('drop in container: item moves from inventory to container', () => {
       // Before: item.location === player.id
       executeAction(droppingAction, context);
       // After: item.location === container.id
       // After: world.getContents(container.id) includes item
     });
     
     test('drop on supporter: item moves from inventory to supporter', () => {
       // Before: item.location === player.id
       executeAction(droppingAction, context);
       // After: item.location === supporter.id
     });
   });
   ```

2. **Multi-Object Command Tests**:
   ```typescript
   test('should handle "drop all" command', () => {
     // Create multi-object command
     const events = executeAction(droppingAction, context);
     // Verify all items moved
     // Verify world state for each item
   });
   ```

3. **Error Path Tests for Missing Cases**:
   - container_not_open: Player in closed container, drop fails
   - cant_drop_here: Location won't accept item

### SHOULD ADD (Improves Coverage)

4. **Verify ActorBehavior.dropItem() contract** - Is there supposed to be state update?

5. **Container acceptance tests** beyond maxItems:
   - Test items that fail canAccept() check
   - Test weight constraints if implemented

6. **Location type edge cases**:
   - Non-room, non-container, non-supporter locations
   - Nested containers (container inside container)

### NICE TO HAVE

7. **Snapshot validation** - Verify entity snapshots are complete
8. **Verb variation tests** - More verbs like "place down", "leave"
9. **Permission/guard tests** - If guard traits affect dropping

## Risk Level: HIGH

### Justification

**Critical Issue**: Tests pass despite major bugs in world state mutation can slip through undetected.

**Evidence**: 
- The 2026-01-07 bug proves moveEntity() calls can be missing while all tests pass
- No test suite test caught this - only NPC command transcript testing revealed it
- Dropping is a **foundational action** used throughout interactive fiction
- Bug affected **all drop scenarios** (rooms, containers, supporters)

**Why Tests Didn't Catch It**:
1. All tests verify events/messages (good!) but not world state (bad!)
2. Human player testing doesn't reveal bug immediately (can drop, see message, move on)
3. Only revealed when NPC tries to find dropped items in location contents
4. Similar pattern could exist in Taking, Putting, Inserting, Removing actions

**Likelihood of Similar Bugs**: 
- **HIGH** - If dropping tests don't verify world state, other action tests probably don't either
- Pattern suggests entire action suite may have undetected mutations gaps

**Impact if Bug Exists**:
- **CRITICAL** - Actions appear to work (good messages) but don't actually change game state
- Silent failure mode is worst case scenario
- Breaks NPC behavior, puzzle mechanics, and game state consistency

### Recommended Mitigations

1. **Add world state assertions to ALL action tests** (taking, putting, inserting, removing, opening, closing, locking, unlocking, etc.)

2. **Create action test template** requiring:
   - Before/after world state checks
   - Entity location verification
   - Inventory/container contents verification

3. **Audit other stdlib actions** for similar moveEntity bugs:
   - `taking.ts` - Does it move entities to inventory?
   - `putting.ts` - Does it move entities to containers/supporters?
   - `inserting.ts` - Does it move entities into containers?
   - `removing.ts` - Does it move entities out of containers?
   - `opening.ts` / `closing.ts` - Do they change isOpen state?

4. **Use transcript tests** as integration verification layer (good catch on 2026-01-07!)

---

## Summary Table

| Aspect | Status | Notes |
|--------|--------|-------|
| Validate Phase | ✓ Excellent | 5 error cases tested |
| Execute Phase | ✗ CRITICAL GAP | No world state verification (bug hiding) |
| Report Phase | ✓ Good | Events and messages well tested |
| Blocked Phase | ✓ Good | Error events verified |
| Four-Phase Pattern | ✓ Good | Structure correct |
| Event Emission | ✓ Good | Events include proper data |
| Message Variations | ✓ Good | 6 of 11 messages tested |
| World State Mutation | ✗ **MISSING** | THE CRITICAL GAP - allows bugs like 2026-01-07 |
| Multi-Object Commands | ✗ Under-tested | No "drop all" or "drop X and Y" tests |
| Container Scenarios | ✓ Partial | Full/empty tested, acceptance logic not |
| Edge Cases | ✗ Partial | Some skipped, non-standard locations untested |

---

**Note**: The fix applied on 2026-01-07 appears correct and both execution paths now properly call `moveEntity()`. However, the test gap remains unfixed - tests would still not catch if the moveEntity calls were removed again in the future.
