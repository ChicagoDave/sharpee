## Summary

The opening action opens containers and doors, delegating state changes to the `OpenableBehavior.open()` method which sets `isOpen = true` on the target entity. The action properly follows the four-phase pattern (validate/execute/report/blocked) and emits atomic events for the opened state and revealed contents.

### Implementation Analysis

**Does the action have validate/execute/report/blocked phases?**
- ✅ Yes, all four phases are present:
  - `validate()`: Lines 47-83 check for target existence, openable trait, already-open status, and lock status
  - `execute()`: Lines 90-102 delegates to `OpenableBehavior.open(noun)` to set `isOpen = true`
  - `report()`: Lines 104-157 emits atomic opened event, revealed events (one per contained item), and success message
  - `blocked()`: Lines 159-171 emits error events for failed validations

**Does execute phase actually mutate world state?**
- ✅ Yes, it delegates to `OpenableBehavior.open(entity)` which mutates the openable trait: `openable.isOpen = true` (line 72 in openableBehavior.ts)
- This is a **critical difference from the dropping bug**: the execute phase DOES mutate state through the behavior

**Are events emitted correctly?**
- ✅ Yes, three types of events are properly emitted in report phase:
  - `if.event.opened`: Atomic fact that entity is now open (just targetId and targetName)
  - `if.event.revealed`: One event per item in container when opened
  - `action.success`: Contextual success message (different for empty vs. non-empty containers)
  - Also emits backward-compat `opened` domain event (line 118)

### Test Coverage Analysis

**List of all test cases that exist:**

1. **Three-Phase Pattern Compliance** (2 tests)
   - "should have required methods for three-phase pattern"
   - "should use report() for ALL event generation"

2. **Action Metadata** (3 tests)
   - "should have correct ID"
   - "should declare required messages" (8 required message IDs verified)
   - "should belong to container_manipulation group"

3. **Precondition Checks** (4 tests)
   - "should fail when no target specified"
   - "should fail when target is not openable"
   - "should fail when already open"
   - "should fail when locked"

4. **Successful Opening - Atomic Events** (4 tests)
   - "should emit atomic opened event with minimal data"
   - "should emit separate revealed events for container contents" (SKIPPED - hangs)
   - "should report empty container with special message"
   - "should open a door"

5. **Event Structure Validation** (1 test)
   - "should include proper atomic events" (SKIPPED - hangs)

6. **Opening Action Edge Cases** (3 tests)
   - "should handle unlocked but not yet open container"
   - "should handle non-container openable objects"
   - "should emit multiple revealed events for multiple items" (SKIPPED - hangs)

**Total: 17 tests, 6 passing, 3 skipped, 1 metadata test**

**Are all four phases tested?**

| Phase    | Coverage | Details |
|----------|----------|---------|
| Validate | ✅ Good  | 4 distinct validation errors tested (no target, not openable, already open, locked) |
| Execute  | ❌ NONE  | No tests verify that `isOpen` actually changed to `true` |
| Report   | ✅ Good  | Event structure and messages tested (though 2 tests skip due to hangs) |
| Blocked  | ✅ Good  | All validation failures route through blocked() |

**Is world state mutation verified?**

- ❌ **CRITICAL GAP**: No tests verify that `entity.get(TraitType.OPENABLE).isOpen === true` after execution
- Tests check event emission (reporting) but not actual `isOpen` state change
- The passing test "should emit atomic opened event" only verifies event structure, not state
- This is **identical to the dropping bug pattern**: validation and reporting are tested, but actual world state mutation is not verified

**Are edge cases covered?**

- ✅ Locked containers (validation)
- ✅ Already-open objects (validation)
- ✅ Empty containers (reporting)
- ✅ Non-container openables (book example)
- ✅ Unlocked but closed safes (validation)
- ❌ NOT TESTED: Revealing contents for non-empty containers (tests are skipped)
- ❌ NOT TESTED: Door opening (test exists but lacks world state verification)

### Gaps Identified

**CRITICAL - Missing world state verification tests:**

The most significant gap mirrors the dropping bug exactly: **tests verify messages and events but not actual world state changes**. Specifically:

1. **No test verifies `isOpen` state change** - We have no test that:
   ```typescript
   const openableTrait = object.get(TraitType.OPENABLE);
   expect(openableTrait.isOpen).toBe(true);
   ```

2. **No test verifies container contents become visible** - Containers have an `isOpen` flag, but no test verifies:
   - Items in the container are now discoverable
   - `world.getContents(container.id)` returns items when container is open

3. **Three tests are skipped with unresolved hangs**:
   - "should emit separate revealed events for container contents"
   - "should include proper atomic events" 
   - "should emit multiple revealed events for multiple items"
   
   These would test the revealed event behavior but appear to have test infrastructure issues

4. **Empty vs. full container distinction** - Tests verify the message changes, but not whether the actual world state properly supports that distinction (can you now see inside?)

### Recommendations

**High Priority - Add these tests:**

1. **Verify openable state mutation:**
   ```typescript
   test('should actually set isOpen to true on the openable trait', () => {
     const { world, object } = TestData.withObject('box', {
       [TraitType.OPENABLE]: { isOpen: false }
     });
     
     const command = createCommand(IFActions.OPENING, { entity: object });
     const context = createRealTestContext(openingAction, world, command);
     const events = executeAction(openingAction, context);
     
     // THIS IS MISSING
     const openableTrait = object.get(TraitType.OPENABLE);
     expect(openableTrait.isOpen).toBe(true);
   });
   ```

2. **Verify contents become discoverable:**
   ```typescript
   test('should make container contents discoverable when opened', () => {
     const { world, object } = TestData.withObject('box', {
       [TraitType.OPENABLE]: { isOpen: false },
       [TraitType.CONTAINER]: { isTransparent: false }
     });
     const item = world.createEntity('coin', 'object');
     world.moveEntity(item.id, object.id);
     
     const command = createCommand(IFActions.OPENING, { entity: object });
     const context = createRealTestContext(openingAction, world, command);
     executeAction(openingAction, context);
     
     // THIS IS MISSING
     const contents = world.getContents(object.id);
     expect(contents).toContainEqual(item);
   });
   ```

3. **Fix the hanging tests** - Debug and enable the 3 skipped tests that verify revealed events

4. **Add door state verification:**
   ```typescript
   test('should verify door opens and reveals exit', () => {
     // Verify both isOpen state AND passage becomes traversable
   });
   ```

**Medium Priority:**

5. Test locked container behavior transitions (unlock → open flow)
6. Test opening sequence with worn items (if relevant)
7. Add negative tests for doors that can't close

**Low Priority:**

8. Performance test: opening containers with many items
9. Test custom openMessage/openSound from trait (if used)

### Risk Level: **HIGH**

**Why this is high risk:**

1. **Identical to the dropping bug**: Both actions validate correctly, report correctly, but actual world state mutation is not tested
2. **Bug pattern**: If OpenableBehavior.open() is ever changed to not set `isOpen = true`, the tests would still pass
3. **Cascading failures**: NPCs and other code that query `getContents()` or check `isOpen` would fail silently
4. **Hidden by good reporting**: The action appears to work because events and messages are correct - but the state might not actually change
5. **Wide impact**: Opening is fundamental to adventure games - every puzzle involving containers/doors is affected

**Specific vulnerabilities:**

- If developer refactors OpenableBehavior and removes the `openable.isOpen = true` line, tests pass but game is broken
- If someone adds validation that checks `isOpen` but forgets the mutation, bugs cascade downstream
- Container searching, examination, and navigation all depend on `isOpen` state being correct

**How the dropping bug went undetected:**

The work summary (2026-01-07-stdlib-dropping-fix.md) shows exactly how this happens:
> "Most tests verify reporting (messages), not actual world state"
> "The dropping action had comprehensive reporting - it emitted events, returned success effects, and displayed proper messages. The bug was hidden because the reporting phase worked correctly; only the execution phase was incomplete."

The opening action has the **exact same structure**: comprehensive test coverage of reporting, zero coverage of world state mutation.

---

This review can be written to `/mnt/c/repotemp/sharpee/docs/work/stdlib-tests/opening-review.md` when you're ready to save it. The review demonstrates that while the opening action implementation is correct, its test coverage has a critical blind spot identical to the recent dropping bug.
