# stdlib Test Failure Analysis

## Summary
- Total test suites: 51
- Failed test suites: 51 
- Total tests: 1461
- Failed tests: 274
- Passed tests: 1187
- Test run time: ~15 minutes

## Major Categories of Failures

### 1. Action Registry Pattern Matching (7 failures)
**File**: `tests/unit/actions/registry-golden.test.ts`
- Pattern matching not working - `findByPattern()` returns empty arrays
- Language provider integration issues
- Multi-word patterns failing ("pick up", "put down")
- Edge cases with registration before language provider is set

**Root Cause**: The registry appears to not be properly integrating with the language provider to resolve action patterns.

### 2. Command Validation Issues (11 failures)
**File**: `tests/unit/validation/command-validator-golden.test.ts`
- Entity resolution failing
- Adjective matching not working
- Scope rules not being enforced properly
- Ambiguity resolution returning wrong error messages
- Synonym resolution failing

**Root Cause**: The command validator is not properly resolving entities from parsed commands.

### 3. Shared Data Access Issues (12 failures in quitting.test.ts)
**File**: `tests/unit/actions/quitting.test.ts`
- TypeError: Cannot read properties of undefined (reading 'score', 'hasUnsavedChanges', 'force', 'stats')
- Platform quit event data is undefined

**Root Cause**: The quitting action expects shared data that isn't being provided in the test context.

### 4. Test Context Creation Issues (15 failures in again.test.ts)
**File**: `tests/actions/standard/again.test.ts`
- TypeError: createTestContext is not a function
- Import/export mismatch

**Root Cause**: The test is importing createTestContext incorrectly or it's not exported from test-utils.

### 5. Event Data Mismatches (multiple files)
Common patterns:
- Expected message IDs vs actual message IDs
- Missing or extra properties in event data
- Entity IDs vs entity names in event data
- Boolean flags with wrong values

### 6. Player Location Issues (5 failures)
- "Player has no location" errors in taking and exiting tests
- Tests creating players without proper world setup

### 7. Lock/Unlock Key Handling (12 failures)
**Files**: `locking-golden.test.ts`, `unlocking-golden.test.ts`
- Key validation not working properly
- Multiple key support failing
- Events not being emitted for successful lock/unlock with keys

### 8. Minor Property/Logic Issues
- Weight calculation returning 0 instead of calculated value
- Fragility detection logic inverted
- Detachment events not being emitted
- Container liquid type being included when not expected
- Turn mechanism completion detection

## Severity Assessment

### Critical (Blocking Core Functionality)
1. **Action Registry Pattern Matching** - Actions can't be found by patterns
2. **Command Validation** - Commands can't be validated properly
3. **Test Context Creation** - Entire test file failing

### High (Major Feature Issues)
1. **Shared Data Access** - Quit functionality broken
2. **Lock/Unlock with Keys** - Security features not working

### Medium (Feature-Specific Issues)
1. **Event Data Mismatches** - Wrong data being passed in events
2. **Player Location Setup** - Test infrastructure issues

### Low (Edge Cases)
1. **Weight Calculation** - Inventory weight not calculated
2. **Minor Logic Inversions** - Fragility, etc.

## Recommendations

1. **Fix Test Infrastructure First**
   - Fix createTestContext import/export in test-utils
   - Ensure proper player/world setup in tests

2. **Fix Core Systems**
   - Debug why registry pattern matching isn't working
   - Fix command validator entity resolution
   - Fix shared data access in quitting action

3. **Fix Event Data Issues**
   - Standardize event data formats (IDs vs names)
   - Review all event emissions for consistency

4. **Fix Action-Specific Issues**
   - Lock/unlock key handling
   - Weight calculations
   - Boolean logic inversions
