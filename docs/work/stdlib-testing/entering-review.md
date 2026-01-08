## Summary

The entering action allows actors to move into/onto enterable containers, supporters, or other enterable objects. It follows the four-phase pattern (validate/execute/report/blocked) and moves the actor from their current location to the target location, using the appropriate preposition ("in" for containers, "on" for supporters).

### Implementation Analysis

**Four-Phase Pattern Compliance: GOOD**
- ✅ `validate()` - Checks target exists, is enterable, checks if already inside, validates open/closed state
- ✅ `execute()` - Performs world state mutation: calls `context.world.moveEntity(actor.id, target.id)`
- ✅ `report()` - Generates success events: 'if.event.entered' and 'action.success'
- ✅ `blocked()` - Generates error events when validation fails

**Execute Phase Mutation: GOOD**
- ✅ The execute phase properly mutates world state via `world.moveEntity()`
- ✅ State is stored in sharedData (`EnteringExecutionState`) for the report phase
- ✅ Preposition is correctly captured from EnterableTrait

**Event Emission: GOOD**
- ✅ Emits semantic 'if.event.entered' event with proper data structure
- ✅ Emits 'action.success' with appropriate message ID (distinguished by preposition: "entered" vs "entered_on")
- ✅ Message params include both place name and preposition for language layer

### Test Coverage Analysis

**Tests Present (9 test cases, 3 skipped):**

1. ✅ **Metadata tests (3 tests)**
   - Action ID verification
   - Required messages declaration (8 messages)
   - Group classification

2. ✅ **Precondition checks (2 active, 3 skipped)**
   - No target specified (ACTIVE)
   - Target is not enterable (ACTIVE)
   - Already inside target (SKIPPED - scope limitation)
   - Entry is blocked (SKIPPED - deprecated feature)
   - Container closed (ACTIVE)

3. ✅ **Successful entry (3 tests)**
   - Enter container (car - uses 'in' preposition)
   - Enter container (large box - uses 'in' preposition)
   - Enter supporter (bed - uses 'on' preposition)

4. ✅ **Additional tests (2 tests)**
   - Check occupancy with actors
   - Event structure validation (entities in events)

5. ⏭️ **Pattern examples (1 example)**
   - Testing capacity management pattern

**Four Phases Coverage:**
- ✅ Validate phase: Tested (no target, not enterable, container closed)
- ✅ Execute phase: Events verify location change but...
- ⚠️ Report phase: Tested (event types checked)
- ✅ Blocked phase: Tested (error messages verified)

### Gaps Identified - CRITICAL

1. **No World State Verification After Execution**
   - The tests check that events are emitted but DON'T verify that `world.getLocation(player.id)` actually changed to the target
   - Example: Test enters a car but doesn't assert `world.getLocation(player.id) === car.id`
   - **This is the same pattern that allowed the dropping bug to go undetected!**

2. **Missing Tests for Edge Cases**
   - No test for entering with items in inventory (does inventory move with player?)
   - No test for nested entry (entering something inside a container you're in)
   - No test for entering the same location twice (idempotency)

3. **No Test Coverage for Skipped Cases**
   - "Already inside target" - test is skipped due to scope logic limitations
   - Entry blocking - test skipped (feature removed but should verify it can't be blocked)
   - Custom prepositions - test skipped but should verify containers always use 'in'

4. **Incomplete Validation Coverage**
   - TOO_FULL message is declared as required but never tested
   - CANT_ENTER message is declared as required but never tested
   - NO_TARGET message checking could be more thorough

5. **Event Data Structure Not Fully Verified**
   - Tests don't verify `fromLocation` is correctly set in the entered event
   - Tests don't verify the event contains all expected fields

### Specific World State Test Gaps

**Example of what's missing:**
```typescript
test('should actually move player into container', () => {
  const { world, player, room } = setupBasicWorld();
  const car = world.createEntity('car', EntityType.CONTAINER);
  car.add({ type: TraitType.CONTAINER, enterable: true });
  world.moveEntity(car.id, room.id);
  
  const command = createCommand(IFActions.ENTERING, { entity: car });
  const context = createRealTestContext(enteringAction, world, command);
  const events = executeWithValidation(enteringAction, context);
  
  // MISSING: This assertion
  expect(world.getLocation(player.id)).toBe(car.id);
  expect(world.getContents(car.id)).toContain(player.id);
  
  // Currently only tests:
  expectEvent(events, 'if.event.entered', { targetId: car.id });
});
```

### Recommendations

**High Priority:**
1. Add world state verification tests - check `world.getLocation()` and `world.getContents()` after each successful entry
2. Test entering with inventory items - verify they move with the player
3. Test the "already inside" case by fixing scope logic or finding a workaround
4. Add tests for TOO_FULL and CANT_ENTER validation failures

**Medium Priority:**
5. Test edge case of entering from within a container (nested entry)
6. Test idempotency - entering something you're already in should fail
7. Add specific tests for preposition determination (container vs supporter vs entry trait)

**Low Priority:**
8. Document the scope logic limitations in test comments
9. Add integration test showing entry/exit roundtrip

### Risk Level: **MEDIUM**

**Rationale:**
- The action implementation itself looks solid with proper mutations
- However, the test suite only verifies event emission, not world state changes
- This creates a risk where the execute phase could fail silently (like the dropping bug)
- The skipped tests (3 of 12) reduce coverage confidence
- A future refactoring of `moveEntity()` could break entering without tests catching it

**Compared to Dropping Action:**
- Dropping tests are more comprehensive (check actual contents with `world.getContents()`)
- Dropping tests verify dropped event data more thoroughly
- Entering tests are lighter weight and more event-focused
- Entering's skipped tests represent 25% of intended coverage

### Summary for Fix Prioritization

The entering action is lower risk than dropping was because:
1. It has simpler logic (just one moveEntity call vs. multiple validations)
2. No multi-object handling
3. No complex capacity checks in execute phase

However, to reach the same test quality as the improved dropping tests, implement the world state verification tests first. This would catch any future mutations or state tracking bugs.

---

Unfortunately, I cannot write this to a file per the READ-ONLY constraints. Please copy this review to `/mnt/c/repotemp/sharpee/docs/work/stdlib-tests/entering-review.md` yourself.
