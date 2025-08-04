# Stdlib Test Assessment Update - 2025-07-28

## Summary
After fixing the test infrastructure to use the new context pattern:

### Before Fix:
- **Total Test Files**: 143
- **Failed**: 42 test files
- **Passed**: 101 test files  
- **Success Rate**: 70.6%
- **Primary Issue**: Test infrastructure using old `EnhancedActionContextImpl` class

### After Fix:
- **Total Test Files**: 143
- **Failed**: 31 test files
- **Passed**: 112 test files
- **Tests**: 118 failed | 2573 passed | 3 skipped (2694 total)
- **Success Rate**: 78.3% (files), 95.6% (individual tests)

## Major Improvement
We've successfully fixed the test infrastructure issue by:
1. Updated test-utils to use `createActionContext` factory function
2. Changed all test imports from `EnhancedActionContext` to `ActionContext`
3. Removed direct usage of internal implementation classes

## Remaining Test Failures

The remaining 118 test failures are now legitimate behavioral issues, not infrastructure problems. They fall into several categories:

### 1. Event Data Structure Issues (~60% of failures)
Tests expecting data in specific event fields that actions aren't providing:
- Missing `data.items` in inventory events
- Missing `data.targetName` in action events  
- Missing `data.brief` flag in inventory events
- Incorrect nesting of event data

### 2. Event Type Mismatches (~20% of failures)
- Tests expecting `action.error` but getting success events
- Wrong message IDs in success events
- Missing domain events (like `if.event.detached`)

### 3. Preposition Handling (~10% of failures)
- Inserting action not properly passing 'in' preposition to putting action
- Command structure modifications not working as expected

### 4. Validation Logic (~10% of failures)
- Some precondition checks not working (e.g., reachability checks)
- Entity resolution in command validator

## Example Failures

### 1. Inventory Action
```
Expected: invEvent?.data.items to have length 2
Received: undefined
```
The inventory action isn't populating the items array in the event data.

### 2. Opening Action  
```
Expected: event.data.targetName to equal 'wooden box'
Received: undefined
```
Actions aren't including entity names in event data.

### 3. Switching On Action
```
Expected: action.error event for unreachable target
Received: if.event.switched_on, action.success events
```
Reachability check is not preventing the action.

## Next Steps

These failures align with Phase 3 of our refactoring plan (Event Structure Standardization). The actions are working but their event output doesn't match test expectations. We need to:

1. **Standardize event data structure** across all actions
2. **Ensure consistent event types** for errors vs success
3. **Fix specific action logic** where preconditions aren't working
4. **Update command modification** patterns (like inserting → putting)

## Conclusion

The infrastructure fix was successful - we've reduced failures from 42 files to 31 files, and can now see the real behavioral issues. The remaining failures are expected given we haven't completed Phase 3 (Event Structure Standardization) yet. These tests are actually helping us identify exactly what needs to be fixed in the event standardization phase.