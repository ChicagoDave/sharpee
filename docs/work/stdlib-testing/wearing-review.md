## Summary

The wearing action handles putting on clothing and wearable items. It validates that the item is wearable and not already worn, then updates the wearable trait's `worn` and `wornBy` properties. The action supports both items already in the player's inventory and items in the room (with implicit taking).

---

## Implementation Analysis

### Four-Phase Pattern Compliance
- **Validate Phase**: YES - Validates that item exists, is wearable, not already worn, no body part conflicts, and no layering conflicts
- **Execute Phase**: YES - Properly calls `WearableBehavior.wear()` to mutate world state
- **Report Phase**: YES - Generates `if.event.worn` (domain event), optional `if.event.taken` (implicit take), and `action.success` events
- **Blocked Phase**: YES - Generates `action.blocked` events for validation failures

### World State Mutation
The execute phase properly mutates world state through `WearableBehavior.wear()`:
```typescript
wearable.worn = true;      // ✓ Sets worn flag
wearable.wornBy = actor.id;  // ✓ Records who is wearing it
```

**Events Emitted Correctly**:
- `if.event.worn` - Published to world model for updates
- `if.event.taken` - When item is implicitly taken from room first
- `action.success` - Success message with item name and body part

---

## Test Coverage Analysis

### Tests That Exist (19 total tests)

**Precondition Checks (5 tests)**:
1. Fails when no target specified
2. Fails when item is not wearable  
3. Fails when already wearing item
4. Fails when body part conflict exists (old hat vs new hat)
5. Fails when layer conflict exists (can't wear shirt under coat already worn)

**Successful Wearing (5 tests)**:
1. Wear item from inventory
2. Implicitly take and wear item from room
3. Wear item without body part specified
4. Handle layered clothing correctly
5. Wear multiple items on different body parts

**Event Structure (1 test)**:
1. Proper entities in all events

**Pattern Examples (2 tests)**:
1. Complete outfit system with layers
2. Body part coverage examples

**Skipped/Not Tested (1 test)**:
1. Fail when item not held and not in room (skipped - scope issue)

---

## Gaps Identified

### CRITICAL: World State NOT Verified After Execution

**The biggest gap**: Tests verify events are emitted but DO NOT verify that world state was actually mutated.

Example from wearing test line 231-246:
```typescript
const events = executeWithValidation(wearingAction, context);

// Verifies events only
expectEvent(events, 'if.event.worn', { itemId: gloves.id });
expectEvent(events, 'action.success', { messageId: expect.stringContaining('worn') });

// MISSING: Does NOT verify the item's worn/wornBy state changed
// MISSING: Does NOT check that gloves.get(TraitType.WEARABLE).worn === true
// MISSING: Does NOT check that gloves.get(TraitType.WEARABLE).wornBy === player.id
```

### Comparison to Dropping Tests

The dropping tests (lines 240-267) DO verify world state:
```typescript
const events = executeAction(droppingAction, context);

// Events verified (as expected)
expectEvent(events, 'if.event.dropped', { item: item.id });

// But also verifies the actual location moved:
const room = world.getContainingRoom(player.id);
expectEvent(events, 'if.event.dropped', {
  toLocation: room.id,  // ← Verifies via event data what happened
  toLocationName: 'Test Room'
});
```

However, even the dropping tests do not explicitly verify world state AFTER action:
```typescript
// MISSING from both: Verify item is actually in the room after drop
expect(world.getLocation(item.id)).toBe(room.id);
```

### Additional Gaps in Wearing Tests

1. **No verification of trait mutation**:
   - After wearing gloves, never check: `expect(gloves.get(TraitType.WEARABLE).worn).toBe(true)`
   - After wearing gloves, never check: `expect(gloves.get(TraitType.WEARABLE).wornBy).toBe(player.id)`

2. **No inventory movement verification**:
   - When implicitly taking item from room, never verify item leaves room location
   - Never verify: `expect(world.getContents(room.id)).not.toContain(scarf.id)`
   - Never verify: `expect(world.getLocation(scarf.id)).toBe(player.id)` after implicit take

3. **Conflict detection tests don't verify state before checking**:
   - Body part conflict test (line 140-174) creates worn hat but never verifies it's actually worn
   - Layer conflict test (line 176-211) creates coat with `worn: true` via constructor, but real `WearableBehavior.wear()` wasn't called

4. **No verification of failure states**:
   - When body part conflict is detected and action blocked, no test verifies:
     - The attempted item is NOT worn
     - The conflicting item IS still worn
     - No state changed at all

5. **No edge case coverage**:
   - What if item is worn by a different actor (NPCs)? Behavior supports `wornByOther` but no test
   - What if wornBy is set but worn is false? (Corrupt state - no test)
   - Sequential wearing of same body part? (Handled by conflicts but not tested as sequence)
   - Wearing after removing? (State reset - no test)

---

## Recommendations

### High Priority Tests to Add

1. **Verify trait mutation after successful wear**:
   ```typescript
   test('should set worn and wornBy properties on item', () => {
     const gloves = ...;
     executeWithValidation(wearingAction, context);
     
     const wearable = gloves.get(TraitType.WEARABLE) as WearableTrait;
     expect(wearable.worn).toBe(true);
     expect(wearable.wornBy).toBe(player.id);
   });
   ```

2. **Verify inventory movement on implicit take**:
   ```typescript
   test('should remove item from room and add to inventory on implicit wear', () => {
     const scarf = ...; // in room
     const roomBefore = world.getContents(room.id);
     
     executeWithValidation(wearingAction, context);
     
     expect(world.getLocation(scarf.id)).toBe(player.id);
     expect(world.getContents(room.id).length).toBeLessThan(roomBefore.length);
   });
   ```

3. **Verify state unchanged on failed validation**:
   ```typescript
   test('should not change item state when validation fails (already wearing)', () => {
     const alreadyWornHat = ...;
     const wearableBefore = { 
       worn: alreadyWornHat.get(TraitType.WEARABLE).worn,
       wornBy: alreadyWornHat.get(TraitType.WEARABLE).wornBy
     };
     
     executeWithValidation(wearingAction, context);
     
     const wearableAfter = alreadyWornHat.get(TraitType.WEARABLE);
     expect(wearableAfter.worn).toBe(wearableBefore.worn);
     expect(wearableAfter.wornBy).toBe(wearableBefore.wornBy);
   });
   ```

4. **Verify wearing by different actors**:
   ```typescript
   test('should fail when item is worn by different actor', () => {
     const npc = world.createEntity('goblin', 'actor');
     const hat = world.createEntity('hat', 'object');
     hat.add({ type: TraitType.WEARABLE, worn: true, wornBy: npc.id });
     
     executeWithValidation(wearingAction, context);
     
     expectEvent(events, 'action.error', { 
       messageId: expect.stringContaining('already_wearing'),
       params: { wornBy: npc.name } 
     });
   });
   ```

5. **Verify conflict detection before any state changes**:
   ```typescript
   test('should detect body part conflict before mutating state', () => {
     const newHat = world.createEntity('new hat', 'object');
     newHat.add({ type: TraitType.WEARABLE, worn: false, bodyPart: 'head' });
     
     const oldWornState = oldHat.get(TraitType.WEARABLE).worn;
     
     executeWithValidation(wearingAction, context); // Should fail
     
     expect(oldHat.get(TraitType.WEARABLE).worn).toBe(oldWornState); // Unchanged
     expect(newHat.get(TraitType.WEARABLE).worn).toBe(false); // Not worn
   });
   ```

6. **Test sequence of wearing/removing**:
   ```typescript
   test('should be able to wear item after removing different item', () => {
     const gloves = ...;
     const hat = ...;
     
     // Wear both successfully
     executeWithValidation(wearingAction, context1);
     executeWithValidation(wearingAction, context2);
     
     expect(gloves.get(TraitType.WEARABLE).worn).toBe(true);
     expect(hat.get(TraitType.WEARABLE).worn).toBe(true);
   });
   ```

---

## Risk Level

**HIGH**

### Why High Risk

1. **Exact same pattern as the dropping bug**: The dropping action had a bug where events were emitted but world state wasn't actually mutated properly. The wearing tests have the same blindness - they check events but not world state changes.

2. **Test confidence is false**: Tests pass even if:
   - `WearableBehavior.wear()` doesn't actually set `worn = true`
   - `wornBy` isn't set
   - The implicit take doesn't move item from room to inventory
   - Execute phase is completely skipped (would still emit events if report happens)

3. **Mutation happens in behavior, not action**: Like dropping, the actual state change happens in `WearableBehavior.wear()`. Tests don't verify the behavior was actually called OR that its mutations took effect. If behavior changes or action fails to call it, tests won't catch it.

4. **Multiple state properties must change atomically**: A worn item MUST have both `worn = true` AND `wornBy = actorId`. Tests don't verify both were set. Could end up with `worn = true, wornBy = undefined` (corrupt state).

5. **Implicit take is silent failure**: If implicit take fails (item not removed from room), the wearing succeeds anyway with event saying implicit took. No test verifies item was actually moved. Could silently dupe items.

6. **Conflict detection depends on correct state**: Body part and layer conflict checks iterate over inventory checking `worn` flag. If previous wears didn't set `worn = true`, subsequent conflict detection silently fails. Tests don't verify prior wears actually modified state.

---

## Summary Risk Matrix

| Risk | Severity | Current Detection |
|------|----------|-------------------|
| WearableBehavior.wear() not called | HIGH | ✗ No test catches this |
| worn flag not set | HIGH | ✗ No test catches this |
| wornBy not set | HIGH | ✗ No test catches this |
| Implicit take doesn't move item | HIGH | ✗ No test catches this |
| Corrupt state (worn=true, wornBy=undefined) | MEDIUM | ✗ No test catches this |
| Conflict detection failures | MEDIUM | ✗ Depends on prior state |
| Multi-step wear sequences fail | MEDIUM | ✗ Only single-step tested |

All of these would pass the current test suite.

---

Since I'm in read-only mode, I cannot create the file itself. However, this comprehensive review can be written to `/mnt/c/repotemp/sharpee/docs/work/stdlib-tests/wearing-review.md` by the user or through a non-read-only session.

The key findings are:

1. **Implementation is correct** - Four-phase pattern implemented properly, WearableBehavior mutations are correct
2. **Test coverage looks good on surface** - 19 tests covering validation, success, conflicts, events
3. **Critical gap: No world state verification** - Tests verify events emitted but not that actual trait properties (worn, wornBy) were mutated
4. **HIGH RISK** - Same pattern as the dropping bug that went undetected. Tests give false confidence.
