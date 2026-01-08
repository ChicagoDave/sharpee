## Summary

The reading action handles reading text from readable entities (books, signs, notes, inscriptions). It supports:
- Single-page and multi-page content
- Different readable types with distinct messages
- Language/ability requirements
- Tracking whether items have been read
- Current page management for books

## Implementation Analysis

The reading action **properly follows the four-phase pattern**:

### Validate Phase (lines 46-89)
- Checks for direct object
- Verifies entity has ReadableTrait
- Checks if currently readable (isReadable property)
- Validates ability requirements (with TODO for actual checking)

### Execute Phase (lines 91-143)
- **CRITICAL ISSUE**: The execute phase **DOES mutate world state** by setting `readable.hasBeenRead = true` (line 98)
- Computes text content (handles multi-page logic at lines 110-114)
- Builds event data with full context
- Stores data in sharedData for report phase
- Does NOT emit any events

### Report Phase (lines 154-171)
- Emits `if.event.read` with complete event data
- Emits `action.success` with appropriate messageId based on readable type
- Returns both events as array

### Blocked Phase (lines 145-152)
- Creates `action.blocked` event with error messageId and params

## Test Coverage Analysis

### Tests That Exist (11 test cases)

**Basic Reading (4 tests)**:
1. Read a simple note - verifies `hasBeenRead` mutation, event emission, success message
2. Read a book - checks messageId variations
3. Read a sign - verifies sign-specific messageId
4. Read an inscription - verifies inscription-specific messageId

**Multi-page Books (1 test)**:
5. Read current page of multi-page book - verifies page content extraction, currentPage/totalPages in events

**Validation (4 tests)**:
6. Fail without direct object
7. Fail for non-readable items
8. Fail when not currently readable (isReadable=false)
9. Handle items with language requirements

**Integration with ReadableTrait (2 tests)**:
10. Track whether item has been read - **verifies world state mutation directly**
11. Handle empty text gracefully

### Phase Coverage

- ✅ **Validate phase**: 4 tests (all error paths)
- ✅ **Execute phase**: 1 test explicitly verifies `hasBeenRead` mutation
- ✅ **Report phase**: Multiple tests verify event emission
- ✅ **Blocked phase**: 4 tests verify error handling

## Gaps Identified

### CRITICAL GAPS (Could hide bugs like the dropping bug)

1. **NO WORLD STATE VERIFICATION FOR SUCCESS CASES**
   - Tests 1-5 verify events were emitted but **never check** if `hasBeenRead` actually changed after reading
   - Compare to dropping test pattern (lines 250-268 in dropping-golden.test.ts): After execute+report, actual inventory should be checked
   - **Gap**: Reading tests should verify `readable.hasBeenRead === true` AFTER executeAndReport completes

2. **Multi-page reading has no world state test**
   - Multi-page test verifies events but not whether currentPage was modified
   - ReadableBehavior.turnToPage() mutates currentPage (line 84 in readableBehavior.ts)
   - **Question**: Does reading action modify currentPage or only emit it?
   - **Gap**: No test verifies currentPage state changes

3. **Language/ability requirement validation is incomplete**
   - Test 9 creates readable with `requiresAbility: true, requiredAbility: 'read_elvish'`
   - Validation logic has TODO (lines 82-86 in reading.ts) indicating ability checking is unimplemented
   - **Gap**: No test for player WITHOUT required ability (should fail)
   - **Gap**: No test for player WITH required ability (should succeed)

4. **Event structure validation missing**
   - Dropping tests verify `event.entities` contains actor/target/location (lines 395-412)
   - Reading tests do NOT verify event.entities structure
   - **Gap**: No test for proper entity references in if.event.read

5. **Blocked phase not properly tested**
   - blocked() returns error events but test 6-8 only verify validation fails
   - No test creates an ActionContext and explicitly calls blocked() to verify event generation
   - **Gap**: Should verify blocked() event structure matches action.success pattern

6. **No test for readableType='text' (default)**
   - Tests cover book, sign, inscription but not the default 'text' type
   - No test verifies `messageId = 'read_text'` logic path
   - **Gap**: Should test default readable type

7. **Preview functionality never tested**
   - ReadableTrait has optional preview property (readableBehavior.ts line 128)
   - No test verifies preview is returned or displayed
   - **Gap**: If language layer uses preview, should test it

### MEDIUM SEVERITY GAPS

8. **No test for hasBeenRead readsthrough**
   - What happens if player reads same item twice?
   - Should `hasBeenRead` remain true?
   - Should event still be emitted?
   - **Gap**: No second-read test

9. **Empty pageContent array not tested**
   - Multi-page test uses valid pageContent array
   - What if pageContent is empty?
   - What if currentPage > pageContent.length?
   - **Gap**: No edge case testing for page arrays

10. **No validation that readable object is in scope**
    - Tests assume note is in room and readable
    - What if item is in a closed container?
    - What if item is elsewhere?
    - **Gap**: No visibility/scope testing

## Recommendations

### CRITICAL (Do First - Could Hide Bugs)

1. **Add world state verification to all success tests**
   ```
   // After executeAndReport:
   expect(readable.hasBeenRead).toBe(true);
   ```
   Pattern from dropping test: verify moveEntity actually occurred.

2. **Test language requirement failure**
   - Create readable with requiresAbility=true
   - Verify it fails validation (once ability checking is implemented)

3. **Verify blocked() phase generates proper events**
   - Call blocked() directly for each error condition
   - Verify event structure matches action.success pattern

### HIGH (Should Add)

4. **Test readableType='text' (default path)**
   - Ensures messageId='read_text' code path is exercised

5. **Test second reading of same item**
   - Verify hasBeenRead stays true
   - Verify events are still emitted

6. **Verify event.entities structure**
   - Compare to dropping test pattern
   - Ensure target, reader, or similar fields are present

### MEDIUM (Nice to Have)

7. **Edge cases for multi-page books**
   - Empty pageContent array
   - currentPage out of bounds
   - Missing pageContent with currentPage set

8. **Item visibility/scope**
   - Can read item in closed container?
   - Can read item not in current location?

## Risk Level

**MEDIUM-HIGH**

### Why Not HIGH?
- Reading action properly implements four-phase pattern
- Execute phase DOES mutate state (hasBeenRead = true)
- Tests verify event emission correctly
- Basic happy path is well-covered

### Why Not MEDIUM?
- **Critical gaps in world state verification** - like the dropping bug, this could be broken and tests would still pass
- **Unimplemented ability requirement checking** - code has TODO, tests don't verify missing requirement blocks reading
- **Two possible world state mutations not verified** - hasBeenRead and currentPage modifications

### The Dropping Bug Pattern Applies Here:
The dropping bug went undetected because tests verified "good messages" but not "actual world state changes". The reading tests have the same weakness:
- Tests verify events emitted ✓
- Tests verify messages ✓
- Tests do NOT verify hasBeenRead actually changed ✗
- Tests do NOT verify multi-page currentPage changes ✗

**If reading.execute() was accidentally gutted and hasBeenRead mutation removed, the tests would still pass.**

## Summary Score

- **Implementation quality**: 8/10 (follows pattern, but ability checking incomplete)
- **Test coverage**: 6/10 (good breadth, critical gaps in world state verification)
- **Risk of undiscovered bugs**: MEDIUM-HIGH (similar to dropping bug pattern)

The reading action itself is well-implemented, but test coverage has a critical blind spot: **it doesn't verify world state mutations actually occur**. This mirrors the dropping bug where perfect test coverage of message output masked a broken execute phase.
