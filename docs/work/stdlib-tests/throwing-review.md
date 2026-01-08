## Summary

The stdlib **throwing action** simulates throwing objects at targets or in directions, with support for fragile item breaking, NPC reactions (ducking/catching), and distance-based weight limits.

## Implementation Analysis

### Four-Phase Pattern Compliance
The action correctly implements all four phases:

1. **validate**: Lines 124-183
   - Checks item exists
   - Verifies target location matches actor location
   - Prevents throwing at self
   - Validates directions have exits
   - Enforces weight limit (max 10kg) for targeted/directional throws

2. **execute**: Lines 185-323
   - Stores metadata in sharedData
   - Calculates hit/miss probabilities (70% for actors, 90% for objects)
   - Determines if fragile items break
   - Computes final location based on throw type and target traits
   - **CRITICAL ISSUE**: Does NOT call moveEntity or removeEntity

3. **report**: Lines 334-389
   - Emits `if.event.thrown` event with finalLocation and willBreak
   - Emits `if.event.item_destroyed` event if item breaks
   - Emits success messages with appropriate message IDs
   - Emits target reaction messages for angry NPCs

4. **blocked**: Lines 325-332
   - Returns action.blocked events for validation failures

### World Mutation Issue

**CRITICAL FINDING**: The throwing action's execute phase does NOT actually move items or destroy them. Instead:
- The action emits `if.event.thrown` event with data including `finalLocation` and `willBreak`
- An **external event handler** in `event-processor/src/handlers/complex-manipulation.ts` processes these events:
  - Calls `world.removeEntity(target)` if `willBreak === true` (lines 58-61)
  - Calls `world.moveEntity(target, finalLocation)` if `finalLocation` is set (lines 62-65)
- A separate handler processes `if.event.item_destroyed` events (lines 72-80)

This delegation to event handlers is by design (ADR-052), but creates a testing blind spot.

## Test Coverage Analysis

### Test File Location
`packages/stdlib/tests/unit/actions/throwing-golden.test.ts` (839 lines)

### Test Cases Covered

**Metadata & Structure (5 tests)**:
- Action ID verification
- Required messages declaration (27 message IDs)
- Action group assignment

**Precondition Checks (4 tests)**:
- No item specified
- No exit in direction
- Item too heavy (>10kg)
- Throwing at self

**General Throwing (3 tests)**:
- Non-fragile item drop
- Fragile item not breaking (70% threshold)
- Fragile item breaking (70% threshold)

**Targeted Throwing (7 tests, 2 skipped)**:
- Hit stationary target (90% chance)
- Miss moving actor [SKIPPED - known bug: duck logic only runs on hit]
- NPC catches thrown item [SKIPPED - known bug: catch logic only runs on hit]
- Land on supporter trait
- Land in open container
- Bounce off closed container
- Break fragile on impact

**Weight Considerations (2 tests)**:
- Light items can be thrown (0.001kg)
- Heavy items can be dropped but not thrown (100kg)

**Fragility Detection (1 test)**:
- Keyword-based fragility detection (glass, bottle, vase, etc.)

**Event Structure (1 test)**:
- Event entities populated correctly

**Pattern Examples (6 tests)**:
- Throw types enumeration
- Hit probability ranges
- Breaking probability scenarios
- Weight thresholds
- NPC reaction abilities
- Final location outcomes

### What IS Tested
- Event emission (if.event.thrown, if.event.item_destroyed, action.success)
- Event data accuracy (item IDs, targets, probabilities)
- Message ID selection
- Hit/miss calculations
- Breaking probabilities
- Fragment detection logic

### What IS NOT Tested - Critical Gaps

1. **NO World State Verification**
   - Tests do NOT verify that `world.moveEntity()` is actually called
   - Tests do NOT verify item location after throw executes
   - Tests do NOT verify items are destroyed when willBreak=true
   - Tests check event data says "finalLocation: X" but never verify the item is actually at location X

2. **NO Event Handler Testing**
   - The throwing action's mutations depend on event handlers running
   - No tests verify the handlers are registered
   - No tests verify handlers are invoked with correct data
   - No integration tests that execute action AND event handler together

3. **Edge Cases Not Tested**
   - What happens if finalLocation is null/undefined?
   - What if target entity doesn't exist when handler runs?
   - Can events be lost between action and handler?
   - Do actors actually catch items or just set flag?

4. **Broken Tests (Marked as Skipped)**
   - Lines 324-360: "miss moving actor" - duck logic only executes on hit
   - Lines 362-400: "NPC catches item" - catch logic only executes on hit
   - These are implementation bugs caught by incomplete tests

5. **NO Transcript Integration Tests**
   - No `.transcript` tests that verify end-to-end throwing behavior
   - Dropping action uses transcript tests, throwing doesn't

## Gaps Identified

### High Priority

1. **World State Mutation Never Verified**
   - After action executes successfully, tests should verify:
     ```typescript
     const finalItemLocation = world.getLocation(item.id);
     expect(finalItemLocation).toBe(target.id); // For "lands on"
     
     // For destroyed items:
     const itemExists = world.getEntity(item.id);
     expect(itemExists).toBeUndefined();
     ```

2. **Missing Event Handler Integration Tests**
   - Tests should simulate full action→event→mutation flow
   - Verify handleThrown actually moves the item
   - Verify handleItemDestroyed actually removes the item

3. **Broken Functionality Not Caught by Tests**
   - The duck/catch logic bugs (tests are skipped) should fail tests once fixed
   - No tests verify these mechanics work end-to-end

### Medium Priority

4. **Directional Throw Mutation Not Tested**
   - Lines 288-307 handle directional throws with exit destinations
   - No test verifies item ends up in destination room
   - Should verify: `world.getLocation(item.id) === exitDestination`

5. **Container Interactions Superficially Tested**
   - Tests check message IDs for "lands_in", "lands_on", "bounces_off"
   - Tests don't verify item actually in container after execution
   - Open vs closed container state not properly exercised

### Low Priority

6. **Weight Calculations**
   - Tests show items can be created with various weights
   - Don't test boundary cases (exactly 10kg)
   - Don't test weight affecting break chance

## Recommendations

### Immediate Actions

1. **Add World State Verification After Every Successful Throw**
   ```typescript
   test('should move non-fragile item to target after throw', () => {
     const { world, player, room, item: coin } = TestData.withInventoryItem('coin');
     const table = world.createEntity('table', 'object');
     table.add({ type: TraitType.SUPPORTER });
     world.moveEntity(table.id, room.id);
     
     // Mock event handler since test doesn't run full EventProcessor
     vi.spyOn(world, 'moveEntity');
     
     const context = createRealTestContext(...);
     const events = executeWithValidation(throwingAction, context);
     
     // VERIFY MUTATION - THIS IS MISSING
     expect(world.moveEntity).toHaveBeenCalledWith(coin.id, table.id);
   });
   ```

2. **Add Destroyed Item Verification**
   ```typescript
   test('should remove destroyed item from world', () => {
     const { world, player, item: bottle } = TestData.withInventoryItem('wine bottle');
     
     vi.spyOn(world, 'removeEntity');
     
     const context = createRealTestContext(...);
     const events = executeWithValidation(throwingAction, context);
     
     // VERIFY DESTRUCTION - THIS IS MISSING
     expect(world.removeEntity).toHaveBeenCalledWith(bottle.id);
   });
   ```

3. **Create Transcript Test**
   - Add `stories/stdlib-demo/tests/transcripts/throwing.transcript` or equivalent
   - Test full command flow: "throw ball at table" → item moves
   - This would catch if event handlers aren't registered

4. **Enable Skipped Tests**
   - Fix the duck/catch logic to work on miss (not just on hit)
   - Re-enable the two skipped tests
   - These reveal actual bugs in the logic

### Secondary Actions

5. **Add Directional Throw Location Verification**
6. **Verify Fragile Breaking Doesn't Block Movement**
7. **Test Weight Boundary (exactly 10kg item)**

## Risk Level

**HIGH** - Similar pattern to the dropping bug that escaped testing:
- The dropping action mutation bug was undetected because tests only checked events, not world state
- The throwing action has the EXACT SAME PATTERN: events emitted, mutations delegated to handlers
- No tests verify the actual world mutation occurs
- The skipped tests (duck/catch) suggest implementation bugs
- Without integration testing, event handler registration failures would go unnoticed

This action is likely to have runtime bugs that won't be caught until playing the game.

---

This review has been prepared based on thorough analysis of:
- `/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/throwing/throwing.ts`
- `/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/throwing/throwing-events.ts`
- `/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/throwing-golden.test.ts`
- `/mnt/c/repotemp/sharpee/packages/event-processor/src/handlers/complex-manipulation.ts`
