## Summary

The **exiting action** handles moving the player from containers, supporters, or other enterable objects to their parent location. It validates preconditions (already outside, closed containers, missing parents), executes the movement, emits events, and reports results.

## Implementation Analysis

### Four-Phase Pattern Compliance: ✅ GOOD

The exiting action **correctly implements** the four-phase pattern:

1. **Validate (lines 50-101)**
   - Checks player has a current location
   - Checks current location is a valid entity
   - Rejects if already in a room (can't EXIT from rooms, must use GO)
   - Validates container parent location exists
   - Checks if container is OPENABLE and locked (can't exit)

2. **Execute (lines 107-133)**
   - **✅ CORRECTLY mutates world state**: Calls `context.world.moveEntity(actor.id, parentLocation)` (line 122)
   - Stores execution state in sharedData for report phase
   - Determines preposition based on container type (CONTAINER="out of", SUPPORTER="off", other="from")

3. **Report (lines 139-178)**
   - ✅ Emits `if.event.exited` with proper data structure
   - ✅ Emits `action.success` with message ID and parameters
   - Gracefully handles missing state (shouldn't happen but checks anyway)

4. **Blocked (lines 184-190)**
   - Returns `action.blocked` events with validation error messages

### World State Mutation: ✅ STRONG

**CRITICAL DIFFERENCE FROM DROPPING BUG**: The exiting action **actually calls moveEntity** in the execute phase:
```typescript
context.world.moveEntity(actor.id, parentLocation);  // Line 122
```

This is the mutation that the dropping action was initially missing. The exiting action got this right.

## Test Coverage Analysis

### Test File: `exiting-golden.test.ts` (420 lines)

#### Tests That Actually Run

**Passing Tests (5)**:
1. ✅ Action metadata (ID, group)
2. ✅ Required messages declared
3. ✅ Fail when already in room (precondition check)
4. ✅ Exit from container (success path)
5. ✅ Exit from supporter (success path)
6. ✅ Exit from open container (success path)
7. ✅ Event structure validation

**Skipped Tests (7)** - These are marked `.skip()`:
1. ❌ "should fail when no location set" - commented as needing valid context location
2. ❌ "should fail when container is closed" - needs scope logic
3. ❌ "should fail when exit is blocked" - needs ENTRY trait scope logic  
4. ❌ "should exit from vehicle with ENTRY trait" - needs scope logic
5. ❌ "should handle custom prepositions correctly" - needs scope logic
6. ❌ "pattern: nested containers" - marked as removed (EntryTrait)
7. ❌ "pattern: exit state preservation" - marked as removed (EntryTrait)

### Coverage Assessment

#### What IS Being Tested
- ✅ Basic preconditions (already outside)
- ✅ Successful exit from containers
- ✅ Successful exit from supporters
- ✅ Preposition selection (out of vs off)
- ✅ Event emission (if.event.exited and action.success)
- ✅ Event structure validation

#### What IS NOT Being Tested

**CRITICAL GAPS**:

1. **World State Verification After Execute** ❌
   - Tests verify events and messages but **never check if player actually moved**
   - No assertions like: `expect(world.getLocation(player.id)).toBe(room.id)`
   - This is EXACTLY the bug pattern from dropping action

2. **Closed Container Exit** ❌ (skipped)
   - No test verifies that exiting from a closed enterable container fails
   - Related: ADR-051 needs clarification on closed container behavior
   - Should this allow exit if already inside? (likely yes, but unverified)

3. **Complex Container Hierarchies** ❌ (skipped)
   - No test for: player in container1 in container2 in room
   - Only tests direct parent containment

4. **ENTRY Trait Handling** ❌ (skipped)
   - Tests with ENTRY trait are all skipped
   - The action code doesn't check ENTRY trait at all (only CONTAINER, SUPPORTER, OPENABLE)
   - **RISK**: If ENTRY trait should block exits, this isn't tested

5. **Edge Cases** ❌
   - Player exiting from object with no parent location → validates but untested with actual world state
   - Floating containers (no location)
   - What happens with ROOM trait check? (handled but not thoroughly tested)

## Gaps Identified

### 1. Missing World State Assertions (CRITICAL - Same as dropping bug pattern)

Like the dropping bug, the exiting tests verify **events** but not **actual world state changes**:

```typescript
// WHAT THE TEST DOES:
expectEvent(events, 'if.event.exited', { ... });  // ✅ event exists

// WHAT THE TEST DOESN'T DO:
expect(world.getLocation(player.id)).toBe(room.id);  // ❌ verify player actually moved
```

**Risk**: An action could fail to call `moveEntity` and still pass all these tests because:
- Events would still be emitted ✅
- Messages would still be correct ✅
- World state mutation would be missing ❌

### 2. Closed Container Tests Are Skipped

The test at line 125 that checks `should fail when container is closed` is skipped with comment: "Requires scope logic to properly set context.currentLocation"

**Problem**: This is a core validation (lines 90-98 in exiting.ts) that goes **untested**:
```typescript
if (currentContainer.has(TraitType.CONTAINER) && currentContainer.has(TraitType.OPENABLE)) {
  if (!OpenableBehavior.isOpen(currentContainer)) {
    return {
      valid: false,
      error: ExitingMessages.CONTAINER_CLOSED,
      params: { container: currentContainer.name }
    };
  }
}
```

### 3. No Test for "Floating Container" Edge Case

Line 103-123 in exiting.ts validates that container has a parent location, but there's a test for it (line 103-123) that's never actually verified to work with real world state after mutation.

### 4. ENTRY Trait Completely Absent from Tests

Comments at lines 157-175 mention ENTRY trait and prepositions like "under" and "behind", but:
- ENTRY trait handling was removed ("EntryTrait removed" comments)
- Action code doesn't check ENTRY trait
- Tests have no ENTRY trait assertions
- **Unclear**: Should exiting from ENTRY-trait objects work differently?

### 5. Multi-Object Commands Not Tested

The dropping action has extensive multi-object tests (drop all, drop X and Y). Exiting doesn't support multi-object, but there's **zero verification** of this in tests.

## Recommendations

### High Priority

1. **Add World State Verification Tests** (CRITICAL)
   - Every success test should verify: `expect(world.getLocation(player.id)).toBe(expectedRoom.id)`
   - This catches the "missing moveEntity" bug pattern
   - Example:
     ```typescript
     test('should move player to parent location', () => {
       // ... setup and execute ...
       const events = executeWithValidation(exitingAction, context);
       
       // Verify world state changed
       expect(world.getLocation(player.id)).toBe(room.id);  // ← ADD THIS
       
       // Then verify events
       expectEvent(events, 'if.event.exited', ...);
     });
     ```

2. **Un-skip Closed Container Test**
   - Fix context creation to support containers with OPENABLE trait
   - Verify that `container_closed` error is returned when closed
   - Verify that exit succeeds when open

3. **Test Floating Container Edge Case**
   - Create container with no parent location
   - Verify it returns `nowhere_to_go` error
   - (This may already work but needs explicit test)

### Medium Priority

4. **Clarify ENTRY Trait Status**
   - Are ENTRY traits used for exiting? (code suggests no)
   - If removed, delete skipped tests that reference it
   - If kept, implement tests and add trait checks to action

5. **Document Preposition Logic**
   - Currently: CONTAINER="out of", SUPPORTER="off", other="from"
   - But code comment (line 253-267) mentions: "under", "behind", "in" prepositions
   - Test all preposition combinations or document why only 2 are tested

### Lower Priority

6. **Add Property Preservation Tests**
   - Verify exiting doesn't modify entity traits/properties
   - Just moves location, nothing else
   - (Likely fine but worth explicit assertion)

## Risk Level: **MEDIUM**

### Why Not LOW?

- ✅ Action correctly calls `moveEntity` (good!)
- ✅ Four-phase pattern implemented correctly
- ❌ Tests don't verify world state mutation
- ❌ Several validation paths are skipped/untested
- ❌ This is the SAME testing gap that allowed the dropping bug

### Why Not HIGH?

- The action itself is well-implemented
- The dropping bug suggests message-focused tests are insufficient
- But this action seems more robust than dropping was

### Specific Risk Scenarios

1. **If someone refactors and removes moveEntity call**: Tests would still pass (messages work)
2. **If closed container validation is disabled accidentally**: Skipped test wouldn't catch it
3. **If ENTRY trait support is re-added**: No tests would cover it

---

## Summary Table

| Aspect | Status | Notes |
|--------|--------|-------|
| validate() phase | ✅ Good | Thorough precondition checks |
| execute() phase | ✅ Good | Calls moveEntity correctly |
| report() phase | ✅ Good | Emits proper events |
| blocked() phase | ✅ Good | Returns validation errors |
| **World state tests** | ❌ Missing | Critical gap - tests check events, not state |
| **Closed container test** | ❌ Skipped | Core validation untested |
| **Edge case tests** | ⚠️ Partial | Some edge cases skipped |
| **Multi-object support** | N/A | Action doesn't support |
| **ENTRY trait support** | ❓ Unclear | References removed; status ambiguous |
