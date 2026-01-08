## Summary

The pushing action handles physical manipulation of objects with three distinct types: buttons (that activate), heavy objects (requiring strength), and moveable objects (that can be nudged or pushed in directions). The action can also reveal hidden passages. It follows a four-phase pattern (validate → execute → report → blocked) and uses event-driven architecture to communicate mutations to the world model.

### Implementation Analysis

#### Four-Phase Pattern Compliance

**Yes**, the action properly implements all four phases:

1. **Validate Phase (lines 80-120)**: 
   - Checks for target existence
   - Validates worn items cannot be pushed
   - Checks PUSHABLE trait existence
   - Distinguishes between fixed scenery and moveable objects

2. **Execute Phase (lines 126-231)**: 
   - Stores shared data for reporting
   - **CRITICAL MUTATION**: Line 153 calls `SwitchableBehavior.toggle(target)` to mutate world state for button types
   - Prepares message IDs and parameters based on push type
   - Does NOT emit any events (correct pattern)

3. **Report Phase (lines 248-281)**:
   - Generates `if.event.pushed` event with detailed payload
   - Generates `action.success` event with message ID
   - Uses `pushType`, `willToggle`, `currentState`, `newState` flags to communicate state changes

4. **Blocked Phase (lines 236-243)**:
   - Generates `action.blocked` event on validation failure
   - Includes error reason and parameters

#### World State Mutation

**Execute phase DOES mutate world state**: Line 153 calls `SwitchableBehavior.toggle(target)` to toggle switch state when pushing button types that are switchable. This is the critical mutation that must be verified by tests.

**Problem**: Heavy and moveable objects are NOT moved in execute phase. The code only sets `moved` and `moveDirection` flags but doesn't actually call `world.moveEntity()`. This is likely intentional (delegating to behaviors/handlers) but should be documented.

#### Event Emission

**Correct**: Events are emitted only in report/blocked phases:
- `if.event.pushed` - domain event with complete action context
- `action.success` - user-facing message
- `action.blocked` - error reporting

### Test Coverage Analysis

#### Test File: `pushing-golden.test.ts` (562 lines)

**Tests Organized By:**
- Action Metadata (3 tests)
- Precondition Checks (4 tests)
- Button and Switch Pushing (3 tests)
- Heavy Object Pushing (3 tests)
- Regular Object Pushing (2 tests)
- Event Structure Validation (1 test)
- Pattern Examples (3 tests)

**Total: 19 tests**

#### Coverage by Phase

| Phase | Coverage | Status |
|-------|----------|--------|
| Validate | YES | 4 tests cover invalid cases |
| Execute (mutations) | **PARTIAL** | See gaps below |
| Report | YES | Event structure validated |
| Blocked | YES | Error events tested |

#### World State Mutation Verification

**CRITICAL GAP**: While the tests verify that the correct events are emitted, **there are NO tests that verify actual world state changes after execution**.

Example: For button pushing with toggle (lines 156-199):
```typescript
test('should activate button with click sound', () => {
  // ... setup button with SWITCHABLE trait, isOn: false
  const events = executeWithValidation(pushingAction, context);
  
  // Tests verify events but NOT:
  // - Does the button actually toggle in world state?
  expectEvent(events, 'if.event.pushed', {
    currentState: false,
    newState: true
  });
  
  // MISSING: Verify button.isOn changed from false to true
  // const switchable = button.get(TraitType.SWITCHABLE);
  // expect(switchable.isOn).toBe(true); // <-- NOT TESTED
});
```

#### Edge Cases NOT Tested

1. **Switchable state persistence**: Does `SwitchableBehavior.toggle()` actually change the trait state?
2. **Multiple toggles**: Push button twice - does it toggle off? State management tested?
3. **Heavy objects with strength requirements**: Tests set `requiresStrength` but never validate strength checking logic
4. **Worn items edge case**: Test at line 87-109 only tests validation failure, not that execute isn't called
5. **Reveal passage trigger**: Does revealing a passage actually unlock anything? (behavioral test)
6. **Sound properties**: Tests verify sound is in event data but not that sound is actually produced
7. **Direction parameters**: Tests verify direction in event but not that object actually moves

### Gaps Identified

#### Critical (Must Test)

1. **Button toggle doesn't actually update world state**
   - Test creates button with `isOn: false`
   - Executes push
   - Never checks if `button.isOn === true` after execution
   - This is the exact same bug pattern as dropping had: events look correct but world didn't mutate

2. **No tests for execute phase mutations directly**
   - All tests use `executeWithValidation()` which calls all three phases
   - No isolated tests of execute phase to verify it actually calls `SwitchableBehavior.toggle()`
   - If toggle call is removed, tests still pass (events are hardcoded)

3. **No "before/after" world state tests**
   - Missing pattern: Assert initial state → Execute → Assert final state
   - This would catch mutations not being applied

#### High Priority

4. **Heavy object movement**: Tests don't verify `world.moveEntity()` is called
5. **Worn item protection**: Only validates rejection, doesn't test that execute isn't called for worn items
6. **Multi-push scenarios**: Single push tested, but not toggling same button multiple times
7. **Strength requirements**: Trait present but no logic to check if player has enough strength

#### Medium Priority

8. **Sound effects**: Stored in event but behavior not tested
9. **Passage reveals**: Flag set but no test of actual passage unlock
10. **Message parameter correctness**: Event params tested but message construction not verified

### Recommendations

#### Test Cases to Add

**High Priority:**

```typescript
test('should actually toggle switch state in world', () => {
  // Setup button isOn: false
  const button = world.createEntity('button', 'object');
  button.add({ type: TraitType.PUSHABLE, pushType: 'button' });
  button.add({ type: TraitType.SWITCHABLE, isOn: false });
  
  // Verify initial state
  let switchable = button.get(TraitType.SWITCHABLE);
  expect(switchable.isOn).toBe(false);
  
  // Execute push
  executeWithValidation(pushingAction, context);
  
  // CRITICAL: Verify world state changed
  switchable = button.get(TraitType.SWITCHABLE);
  expect(switchable.isOn).toBe(true);
});

test('should toggle button off when already on', () => {
  // Setup button isOn: true
  // Execute first push
  // Verify isOn: false
  // Execute second push  
  // Verify isOn: true
});
```

**Medium Priority:**

```typescript
test('should NOT call execute for worn items', () => {
  // Setup worn item
  // Spy on SwitchableBehavior.toggle
  // Execute validate (fails)
  // Verify toggle was never called
});

test('should move heavy object to correct location', () => {
  // This requires testing actual world.moveEntity() calls
  // Verify object location changes
});

test('should toggle button back to off on second push', () => {
  // Execute push once, verify on
  // Execute push again, verify off
  // Tests state persistence
});
```

### Risk Level: **HIGH**

**Justification:**

1. **Same bug pattern as dropping**: Tests pass but world state doesn't mutate because execute phase doesn't actually call required behaviors
2. **No validation of critical mutation**: Button toggle is the primary side-effect and it's completely untested
3. **Event-driven tests mask execute failures**: Tests check event data but never verify it represents actual world state
4. **Game-breaking if broken**: Non-functional buttons would go undetected until story tests or manual play
5. **Copy-paste vulnerability**: If someone refactors `SwitchableBehavior.toggle()` call to remove it, all tests still pass
6. **Dropping bug was similar**: That action also had events without mutations, and it evaded testing for extended period

### Specific Risk Areas

**Medium-High Risk:**
- Button/switch toggling doesn't work but appears to in event data
- Heavy object strength checking never implemented but tests look complete

**Medium Risk:**
- Passage reveals never actually unlock exits
- Worn item validation might not prevent execute correctly
- Multiple toggles might corrupt state

**Pattern Risk:**
- This test file demonstrates that relying on event assertions without world state verification is insufficient
- All action tests using this pattern are potentially vulnerable

### Comparison to Dropping Tests

The dropping test suite has similar issues but DOES include some world state checks (e.g., line 251: `world.getContainingRoom(player.id)`). The pushing tests have zero world state post-execution verification, making it riskier.
