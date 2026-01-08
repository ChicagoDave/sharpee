## Summary

The unlocking action handles unlocking containers and doors, with optional key requirements. It properly delegates to `LockableBehavior` for validation and execution, following the four-phase action pattern (validate/execute/report/blocked). The action correctly mutates world state by calling `LockableBehavior.unlock()` which sets `isLocked = false`.

### Implementation Analysis

**Four-Phase Pattern: ✅ COMPLETE**

1. **Validate** (lines 69-106):
   - Checks for target existence
   - Validates lockable trait
   - Checks if already unlocked
   - Validates key requirements (shared helper)
   - Returns ValidationResult with appropriate error messages

2. **Execute** (lines 114-202):
   - Calls `LockableBehavior.unlock(noun, withKey)` - this DOES mutate `isLocked = false`
   - Stores analysis info in sharedData
   - Handles error cases from behavior
   - Collects metadata about container contents, doors, sounds, auto-open

3. **Report** (lines 208-260):
   - Emits `if.event.unlocked` event with complete data
   - Emits `action.success` event with appropriate message ID
   - Includes safety net for edge case behavior failures

4. **Blocked** (lines 266-273):
   - Creates `action.blocked` event for validation failures
   - Passes through error message and params

**World State Mutation: ✅ VERIFIED**

The action correctly mutates world state via `LockableBehavior.unlock()` (lockableBehavior.ts line 201):
```typescript
lockable.isLocked = false;
```

This occurs in the execute phase BEFORE reporting, following the proper four-phase pattern.

**Event Emission: ✅ CORRECT**

- Success path: Emits both `if.event.unlocked` and `action.success`
- Failure path: Emits `action.blocked`
- Error path (behavior failure): Emits `action.error`

---

### Test Coverage Analysis

**Test File**: `/packages/stdlib/tests/unit/actions/unlocking-golden.test.ts` (669 lines)

#### Tests That Exist

**Metadata Tests (3 tests - all passing):**
- ✅ Correct action ID
- ✅ Required messages declared
- ✅ Correct group membership

**Precondition Validation (4 tests - all passing):**
- ✅ No target specified → `no_target` error
- ✅ Target not lockable → `not_lockable` error
- ✅ Already unlocked → `already_unlocked` error
- ⚠️ (Note: Missing test for reachability check - action requires `directObjectScope: ScopeLevel.REACHABLE`)

**Key Requirement Tests (4 tests - 3 passing, 1 passing):**
- ✅ Key required but not provided → `no_key` error
- ✅ Key not held by player → `key_not_held` error
- ✅ Wrong key provided → `wrong_key` error
- ✅ Multiple valid keys accepted

**Success Path Tests (1 passing + 6 skipped):**
- ✅ Unlock without key requirement (PASSING - line 216)
- ⏭️ SKIPPED: Unlock with correct key (line 244)
- ⏭️ SKIPPED: Unlock door and note room connection (line 293)
- ⏭️ SKIPPED: Include unlock sound (line 384)
- ⏭️ SKIPPED: Container with contents (line 429)
- ⏭️ SKIPPED: Auto-open on unlock detection (line 464)
- ⏭️ SKIPPED: No auto-open when not configured (line 498)

**Edge Cases (4 tests - 1 passing, 3 skipped):**
- ✅ Lockable without openable trait (PASSING - line 555)
- ⏭️ SKIPPED: Prefer keyId over keyIds (line 579)
- ⏭️ SKIPPED: Work with backup key (line 610)
- ⏭️ SKIPPED: Empty container unlock (line 639)

**Event Structure (1 test - passing):**
- ✅ Events include proper entities (line 526)

**Integration Test:**
- ✅ `tiny-room-puzzle.transcript`: Tests unlock in puzzle context (line 87-88)

---

### Gaps Identified

#### CRITICAL GAPS - World State Mutation Not Verified

**Gap 1: NO TEST VERIFIES isLocked STATE AFTER UNLOCK**

The test suite checks that:
- ✅ Events are emitted
- ✅ Messages have correct IDs
- ✅ Event data is present

But does NOT check:
- ❌ Whether `target.isLocked` is actually set to `false`
- ❌ Whether entity state changed in world
- ❌ Whether entity is accessible by queries after unlock

**Example of missing verification** (line 216-242):
```typescript
test('should unlock object without key requirement', () => {
  // ...
  const events = executeWithValidation(unlockingAction, context);
  
  // ✅ These tests pass:
  expectEvent(events, 'if.event.unlocked', { targetId: latch.id });
  expectEvent(events, 'action.success', { messageId: 'unlocked' });
  
  // ❌ MISSING:
  // expect(latch.get(TraitType.LOCKABLE).isLocked).toBe(false);
  // This would catch bugs like the dropping action bug
});
```

**Gap 2: KEY WITH ACTUAL ENTITY IDS NOT TESTED IN PASSING TESTS**

The only passing "successful unlock with key" test is the "multiple valid keys" test (line 347-382), which only verifies event presence, not state mutation.

The test at line 244 that would test "unlock with correct key" is **SKIPPED**. This test has setup but is marked `.skip()`.

**Gap 3: AUTO-OPEN BEHAVIOR NOT VERIFIED**

All auto-open tests (lines 463-523) are skipped:
- `if (openableTrait.autoOpenOnUnlock)` check exists in execute (line 174)
- But no test verifies the `willAutoOpen` flag is correctly set to true

**Gap 4: CONTAINER CONTENTS NOT VERIFIED**

Container content detection (lines 150-155) is present in execute:
```typescript
const contents = context.world.getContents(noun.id);
sharedData.hasContents = contents.length > 0;
```

But the test checking this (line 429) is **SKIPPED**. Tests don't verify that content counts are accurate.

**Gap 5: NO BEHAVIOR FAILURE PATH TESTING**

The execute method handles behavior failure cases (lines 131-141) but no test forces behavior to fail and verify error handling. Tests only verify the happy path.

#### SIGNIFICANT GAPS - Coverage Insufficiencies

**Gap 6: REACHABILITY NOT TESTED**

Action metadata specifies `directObjectScope: ScopeLevel.REACHABLE` (line 278), but:
- No test validates an unreachable object is rejected
- Validation delegates to scope checking, but that validation is implicit

**Gap 7: SCOPED DATA NOT VERIFIED**

SharedData structure contains analysis data (lines 26-43) but no tests verify:
- `isContainer` flag accuracy
- `isDoor` flag accuracy  
- `contentsIds` array accuracy
- All data reaching event payload correctly

**Gap 8: INSTRUMENT FIELD NOT TESTED**

The action correctly uses ADR-080 pattern (line 72):
```typescript
const withKey = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
```

But no test specifically validates instrument field preference over indirectObject.

---

### Risks from Similar to Dropping Bug

The dropping bug (from context doc) involved **missing mutation** in execute phase. The unlocking action **does perform mutation** correctly via `LockableBehavior.unlock()`. However, similar risks exist:

1. **Event-Focused Testing**: Like dropping tests, unlocking tests focus on event structure and messages rather than world state changes

2. **No State Verification After Mutation**: Tests check `expectEvent()` but never check the resulting state of entities

3. **Skipped Core Tests**: 6 of the 11 success/edge case tests are skipped, leaving major code paths untested

---

### Test Breakdown

| Category | Total | Passing | Skipped | Risk |
|----------|-------|---------|---------|------|
| Metadata | 3 | 3 | 0 | LOW |
| Precondition | 4 | 4 | 0 | LOW |
| Key Requirements | 4 | 4 | 0 | LOW |
| Success Paths | 7 | 1 | 6 | **HIGH** |
| Edge Cases | 4 | 1 | 3 | **HIGH** |
| Event Structure | 1 | 1 | 0 | LOW |
| **Totals** | **23** | **14** | **9** | |

---

### Recommendations

#### HIGH PRIORITY - Enable Skipped Tests

1. **Enable line 244**: "unlock with correct key" test
   - Add verification: `expect(chest.get(TraitType.LOCKABLE).isLocked).toBe(false)`
   - This is the primary test for successful unlocking

2. **Enable line 293**: "unlock door and note room connection" test
   - Verify door-specific metadata in event

3. **Enable lines 384, 429**: Sound and container tests
   - These test optional features that should be verified

4. **Enable line 464**: Auto-open behavior detection
   - Verify `willAutoOpen` flag is correctly set when `autoOpenOnUnlock: true`

#### MEDIUM PRIORITY - Add State Verification

5. **Modify all successful unlock tests** to verify entity state:
   ```typescript
   const lockable = latch.get(TraitType.LOCKABLE) as any;
   expect(lockable.isLocked).toBe(false);
   ```

6. **Add test for behavior failure path**:
   - Create test where `LockableBehavior.unlock()` returns `success: false`
   - Verify correct error event is emitted
   - This currently has no test coverage

#### MEDIUM PRIORITY - Add Scope Testing

7. **Add test for unreachable target**:
   - Place lockable in unreachable location
   - Verify validation fails with appropriate error
   - Covers `directObjectScope: ScopeLevel.REACHABLE` requirement

8. **Add test for instrument field**:
   - Test both `instrument` and `indirectObject` fields
   - Verify `instrument` is preferred per ADR-080

#### LOWER PRIORITY - Enhance Integration Testing

9. **Add integration test scenarios**:
   - Unlock → open → examine contents sequence
   - Unlock with auto-open behavior
   - Multiple unlock attempts (already unlocked)
   - Lock then unlock with same key

---

### Risk Level: **MEDIUM**

**Justification:**

**Factors supporting MEDIUM (not HIGH):**
- ✅ Execute phase DOES perform correct mutations (unlike dropping bug)
- ✅ Behavior delegation correctly changes `isLocked` state
- ✅ Core validation tests are comprehensive and passing
- ✅ Simple happy path is verified (unlock without key)

**Factors supporting MEDIUM (not LOW):**
- ⚠️ 39% of tests are skipped (9 of 23)
- ⚠️ All successful unlock tests skip state verification
- ⚠️ Auto-open feature untested
- ⚠️ Container-specific behavior untested
- ⚠️ Behavior failure path has no test coverage
- ⚠️ Tests focus on events/messages, not actual world state changes (same pattern as dropping bug)

**Likelihood of undetected bugs:** MEDIUM
- Bug would most likely be in optional features (auto-open, sounds, container metadata)
- Bug less likely in core unlock mechanism since behavior is delegated
- Bug very likely to be missed by current tests because state verification is absent

**Severity if bug exists:** HIGH
- Unlocking is a core action used in puzzles
- World state mismatch would break dependent systems (like NPC item queries)

---

### Summary Table

| Aspect | Status | Evidence |
|--------|--------|----------|
| Validate Phase | ✅ Complete | Lines 69-106 cover all cases |
| Execute Phase | ✅ Mutates State | Calls `LockableBehavior.unlock()` line 124 |
| Report Phase | ✅ Correct | Emits proper events lines 208-260 |
| Blocked Phase | ✅ Correct | Line 266-273 |
| Core Validation Tests | ✅ Complete | 4/4 passing |
| Success Path Tests | ⚠️ Partial | 1/7 passing, 6 skipped |
| State Mutation Tests | ❌ Missing | No tests verify `isLocked = false` |
| Optional Feature Tests | ⚠️ Incomplete | Auto-open, sounds, containers untested |
| Integration Tests | ✅ Exists | tiny-room-puzzle.transcript covers basic flow |
| Behavior Error Path | ❌ Missing | No tests for behavior failure scenarios |

This review reveals a pattern identical to the dropping bug: comprehensive testing of events/messages while world state verification is completely absent. The action works correctly, but tests don't verify it actually changes the world.
