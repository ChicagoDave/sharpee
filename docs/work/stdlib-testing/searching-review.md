## Summary

The searching action allows players to search containers, supporters, or entire locations to discover hidden items and reveal concealed entities. The action properly handles different search targets (containers, supporters, regular objects, and locations) with appropriate messages based on what's found.

## Implementation Analysis

**Four-Phase Pattern Compliance: YES**

The searching action correctly implements the four-phase pattern:

1. **validate()** (lines 65-85): Checks if target is searchable and if containers are open when required
2. **execute()** (lines 87-107): Performs world mutations by calling `revealConcealedItems()` to actually change entity concealment state
3. **report()** (lines 118-135): Generates semantic events (`if.event.searched` and `action.success`)
4. **blocked()** (lines 109-116): Handles validation failures with appropriate error events

**World State Mutations - YES, Properly Implemented**

The execute phase DOES mutate world state:
- Line 96 calls `revealConcealedItems(searchContext.concealedItems)`
- Helper function (line 73-79) uses `IdentityBehavior.reveal(item)` to set `concealed = false`
- This is critical for game logic: concealed items must become visible after searching

**Event Emission - YES, Correct Pattern**

- `if.event.searched` event emitted in report phase with proper data (target, foundItems, foundItemNames)
- `action.success` event emitted with message ID and parameters
- Events properly use semantic data, not hardcoded strings

## Test Coverage Analysis

**Test File**: `/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/searching-golden.test.ts`

**Total Tests**: 26 test cases across 7 describe blocks

### All Four Phases Tested

- **Validate phase**: Tests container_closed validation (line 77-100)
- **Execute phase**: Tests that correct events are emitted
- **Report phase**: All success message generation tested
- **Blocked phase**: Error case tested (container closed)

### Test Cases Inventory

**Metadata Tests** (3 tests):
- Correct action ID
- Required messages declared
- Action group classification

**Precondition Tests** (1 test):
- Container closed validation

**Container Searching** (3 tests):
- Empty container
- Container with visible contents
- Container with concealed items

**Supporter Searching** (3 tests):
- Supporter with visible items
- Supporter with concealed items
- Empty supporter

**Regular Objects** (2 tests):
- Object with no contents
- Object with concealed items (painting example)

**Location Searching** (2 tests):
- Room with concealed items
- Empty location

**Complex Scenarios** (2 tests):
- Open container requirement verified
- Multiple concealed items found

**Event Structure** (2 tests):
- Proper entity references in events
- Location as target when searching room

**Pattern Examples** (7 "pattern" tests):
- Concealment mechanics
- Searchable object types
- Search result variations
- Container state requirements
- Location searching

### World State Mutation Verification

**CRITICAL GAP IDENTIFIED**: The tests do NOT verify that concealed items actually become revealed after searching.

The tests check:
- ✅ Events are emitted correctly
- ✅ Message IDs are correct
- ✅ Event parameters contain found items
- ❌ Items actually have `concealed = false` after search

**Example of missing verification**:
```typescript
// Line 169-213: "should find concealed items in container"
// The test verifies the EVENT says items were found
// But NEVER checks: key.get(TraitType.IDENTITY).concealed === false

const key = world.createEntity('secret key', 'object');
key.add({
  type: TraitType.IDENTITY,
  concealed: true
});
// ... search ...
// Missing: expect(IdentityBehavior.isConcealed(key)).toBe(false);
```

This is the exact pattern that masked the dropping bug (as documented in the dropping fix summary).

## Gaps Identified

### 1. **No World State Mutation Verification (HIGH PRIORITY)**

The tests verify message output but not actual world mutations:
- Concealed items should have `concealed = false` after search
- Tests should call `IdentityBehavior.isConcealed(item)` to verify state changed
- This gap means a bug like dropping (execute phase doesn't mutate) would pass all tests

### 2. **Missing Edge Cases**

- No test for searching location with no target specified (line 376-428 searches room but doesn't verify concealed items are revealed)
- No test for multiple concealed items in different types (containers vs supporters)
- No test for searcher visibility/reachability edge cases
- No test for searching an object that is itself concealed

### 3. **No Transcript Integration Tests**

The action is used in stories but has no `.transcript` tests to verify:
- Full command flow: `SEARCH BOX`, `SEARCH` (without target)
- Multi-step scenarios: search then take revealed item
- NPC searching behavior (similar to the robot dropping bug)

### 4. **Incomplete Coverage of Search Helpers**

The `buildSearchEventData()` function is tested indirectly but not directly:
- No specific test for event data structure format
- `determineSearchMessage()` logic is tested through scenario tests but not as unit tests

## Recommendations

### Tests to Add

1. **World State Mutation Tests** (CRITICAL):
```typescript
test('should reveal concealed items in container', () => {
  // ... setup ...
  const keyBeforeSearch = IdentityBehavior.isConcealed(key);
  executeWithValidation(searchingAction, context);
  const keyAfterSearch = IdentityBehavior.isConcealed(key);
  
  expect(keyBeforeSearch).toBe(true);
  expect(keyAfterSearch).toBe(false); // THIS IS MISSING
});

test('should reveal all concealed items found', () => {
  // Search with multiple concealed items
  // Verify ALL have concealed = false after search
});
```

2. **Location Search Tests**:
```typescript
test('should reveal concealed items when searching location', () => {
  // Verify concealment state actually changes when searching room
});
```

3. **NPC Searching Tests** (prevent robot-like bugs):
```typescript
test('should allow NPC to interact with revealed items after search', () => {
  // Scenario: NPC searches, then takes revealed item
  // Verifies the bug pattern: action appears to work but world state wrong
});
```

4. **Transcript Tests**:
```
# stories/dungeo/tests/transcripts/searching.transcript
> search chest
You search the treasure chest...

> search
You search the room...

> take key  # Key was concealed, now found
```

5. **Helper Function Tests**:
```typescript
test('buildSearchEventData includes only concealed items', () => {
  // Verify event includes foundItems/foundItemNames from concealed list only
});

test('determineSearchMessage prioritizes concealed discovery', () => {
  // Verify found_concealed used when any concealed items exist
});
```

6. **Edge Case Tests**:
```typescript
test('should handle searching concealed object', () => {
  // A concealed object containing visible items
});

test('should reveal concealed items within concealed containers', () => {
  // Nested concealment scenarios
});
```

## Risk Level

**MEDIUM-HIGH** 

### Reasoning

**Why not LOW?**
- The exact bug pattern (execute phase missing mutations) that affected dropping is NOT tested for in searching
- Tests verify behavior reporting (events/messages) but not world state changes
- If a future developer removes or comments out `revealConcealedItems()` call, all tests would still pass
- Searching is foundational for puzzle design (revealing hidden objects)

**Why not HIGH?**
- The implementation IS correct and includes the necessary mutations
- The bug pattern would likely be caught during gameplay/story testing
- Coverage of core scenarios (empty/full/concealed) is comprehensive
- Four-phase pattern is properly implemented

**Comparison to Dropping Bug**
The dropping action had the same test pattern (verify events, not world state) and the bug went undetected for months. Searching has that same vulnerability.

## Summary of Test Quality

| Category | Status | Evidence |
|----------|--------|----------|
| Phase pattern compliance | ✅ Complete | All 4 phases tested |
| Event generation | ✅ Complete | 26 scenarios tested |
| Message selection | ✅ Complete | All message branches tested |
| Container handling | ✅ Complete | Open/closed verified |
| Object type coverage | ✅ Complete | Container/supporter/object/location |
| **World state mutation** | ❌ **Missing** | No concealment state verification |
| **NPC integration** | ❌ **Missing** | No NPC scenario tests |
| **Transcript tests** | ❌ **Missing** | No integration tests |
| Edge cases | ⚠️ **Partial** | Concealed items not deeply tested |

---

**Report for**: `/mnt/c/repotemp/sharpee/docs/work/stdlib-tests/searching-review.md`

This review is ready to be saved as requested. The key finding is that while the implementation is correct, the tests follow the same reporting-focused pattern that masked the dropping bug - they verify messages but not actual world state changes.
