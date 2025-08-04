# Failing Tests Assessment - stdlib

**Date**: July 30, 2025  
**Total Failing Tests**: 31 tests across 5 test files

## Summary by Category

### 1. Command Validation Tests (11 failures)
**File**: `tests/unit/validation/command-validator-golden.test.ts`

These tests are failing with "expected false to be true" which suggests the validator is not properly resolving entities:
- Basic entity resolution
- Adjective matching (resolving entities with adjectives)
- Scope rules (taking visible objects, examining inventory)
- Ambiguity resolution
- Synonym resolution
- Complex commands with prepositions

**Root Cause**: The command validator appears to be unable to find entities that should be in scope.

### 2. Integration Tests (6 failures)
**File**: `tests/integration/action-language-integration.test.ts`

All failing with "TraitType is not defined":
- Action resolution from verbs
- Action resolution from aliases
- Action validation and execution
- Message resolution through language provider
- Pattern-based action discovery
- Complex action precondition checking

**Root Cause**: Missing import for TraitType in the test file.

### 3. Platform Actions Tests (12 failures)
**File**: `tests/actions/platform-actions.test.ts`

Issues with event payload structure:
- Saving action - payload structure mismatch
- Save validation - undefined values
- Save restrictions - wrong error messages
- Restore action - undefined values and null targets
- Restore restrictions - wrong error messages
- Quit action - game state context mismatches
- Game statistics - value mismatches
- Restart action - progress context mismatches

**Root Cause**: The tests expect different payload structures than what the actions are producing. Likely needs to be updated for the new event system.

### 4. Putting Action Tests (1 failure)
**File**: `tests/unit/actions/putting-golden.test.ts`

- "should respect explicit preposition for dual-nature objects" - expecting `{ surface: 'writing desk' }` but getting `{ item: 'desk lamp', ... }`

**Root Cause**: The test expectation doesn't match the actual event data structure.

### 5. Pushing Action Tests (1 failure)
**File**: `tests/unit/actions/pushing-golden.test.ts`

- "should fail when target is not reachable" - Expected action.error but got if.event.pushed and action.success

**Root Cause**: The reachability check in test utilities is not working correctly (as noted in previous conversations).

## Recommendations

1. **Quick Fixes** (can be done immediately):
   - Add missing TraitType import to integration tests
   - Fix the putting action test expectation
   - Update platform action tests to match new event payload structure

2. **Medium Complexity**:
   - Fix command validator entity resolution (may need to check language provider integration)
   - Fix reachability check in test utilities

3. **Scope-Dependent** (should be skipped for now):
   - Some command validator tests may depend on proper scope implementation

## Priority Order

1. Fix integration test imports (6 tests fixed)
2. Fix platform action test expectations (12 tests fixed)
3. Fix putting action test expectation (1 test fixed)
4. Skip/fix pushing action reachability test (1 test fixed)
5. Debug command validator issues (11 tests - may require deeper investigation)