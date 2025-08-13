# Stdlib Test Failures Assessment

## Overview
Total: 173 failed tests out of 998 (17.3% failure rate)

## Categories of Failures

### 1. Validation/Execute Pattern Mismatch (Most Critical)
**~100+ failures** - Actions returning wrong result structure

#### Pattern
- Tests expect validation errors to be in `error` or `messageId` field
- Actions are returning undefined or wrong structure
- Execute methods not properly handling validation state

#### Affected Actions
- `taking` (13 failures) - Validation not returning error messages
- `pushing` (9 failures) - Validation passing but should fail
- `pulling` (similar issues expected)
- `dropping`, `putting`, `removing`, `inserting` - All have validation issues

#### Root Cause
The validation/execute pattern refactoring (ADR-041) may not have been fully applied to all actions. The new pattern requires:
```typescript
validate(context): ValidationResult {
  return { valid: false, error: 'message_id' };
}
```

### 2. Message ID Mismatches (~30 failures)
**Actions using wrong message IDs**

#### Examples
- `pushing` expects "button_pushed" but gets "button_clicks"
- `pushing` expects "switch_toggled" but gets "button_toggles"
- Various actions have mismatched error message IDs

#### Root Cause
Message IDs were changed but tests not updated, or vice versa.

### 3. Missing Author Action Files (3 failures)
**Files don't exist**

#### Missing
- `/src/actions/author/parser-events.ts`
- `/src/actions/author/validation-events.ts`
- `/src/actions/author/system-events.ts`

#### Impact
- Vocabulary tests failing
- Meta-commands integration tests failing

### 4. AGAIN Action Logic Issues (7 failures)
**Not properly filtering repeatable commands**

#### Issue
AGAIN is repeating commands it shouldn't:
- Should not repeat: AGAIN, SAVING, RESTORING, QUITTING, RESTARTING, VERSION, VERIFYING
- Currently repeating all of these

#### Root Cause
The `isRepeatableAction()` filter is not working correctly.

### 5. Container/Scope Issues (~10 failures)
**State verification problems**

#### Examples
- `closing` not properly tracking container contents
- `looking` darkness/light detection issues
- Container capacity checks failing

#### Root Cause
World model state management or scope resolution issues.

## Systemic Issues Identified

### 1. Incomplete Migration to New Patterns
The validation/execute pattern (ADR-041) was not consistently applied across all actions.

### 2. Test-Code Synchronization
Tests and implementation have diverged:
- Message IDs changed without updating tests
- Expected behavior changed without updating tests
- Tests expect features that were removed/changed

### 3. Missing Implementation
Some planned features were never implemented:
- Author debug actions
- Some validation checks

## Repair Plan

### Phase 1: Critical Pattern Fixes (Highest Priority)
Fix the validation/execute pattern in all failing actions.

**Approach:**
1. Create a validation pattern test that all actions must pass
2. Fix each action to follow the pattern:
   - Validate returns `{ valid: boolean, error?: string, params?: any }`
   - Execute only runs if validation passed
   - Proper error event generation

**Actions to fix:**
- taking (13 failures)
- pushing (9 failures)
- pulling
- dropping
- putting
- removing
- inserting
- All other manipulation actions

### Phase 2: Message ID Alignment
Align message IDs between actions and tests.

**Approach:**
1. Document the canonical message IDs for each action
2. Update either tests or actions to match
3. Create a message ID validation test

### Phase 3: AGAIN Action Filter
Fix the command filtering logic.

**Approach:**
1. Fix `isRepeatableAction()` function
2. Add proper test coverage for all non-repeatable commands
3. Ensure meta-commands are properly filtered

### Phase 4: Missing Author Actions
Implement or remove author debug actions.

**Options:**
1. Implement the missing actions (if needed for debugging)
2. Remove references from tests and vocabulary (if not needed)

### Phase 5: Container/Scope Fixes
Fix state management issues.

**Approach:**
1. Review container trait behavior
2. Fix light/darkness detection
3. Verify scope resolution

## Estimated Effort

| Phase | Effort | Priority | Impact |
|-------|--------|----------|--------|
| 1. Pattern Fixes | 2-3 hours | Critical | Fixes ~100 tests |
| 2. Message IDs | 1 hour | High | Fixes ~30 tests |
| 3. AGAIN Filter | 30 min | Medium | Fixes 7 tests |
| 4. Author Actions | 30 min | Low | Fixes 3 tests |
| 5. Container/Scope | 1-2 hours | Medium | Fixes ~10 tests |

**Total: 5-7 hours to fix all issues**

## Implementation Strategy

### 1. Create Test Helpers
```typescript
// Test that an action follows the validation pattern
export function testActionValidationPattern(action: Action) {
  // Verify validate() returns correct structure
  // Verify execute() handles validation state
  // Verify error events are generated
}
```

### 2. Batch Fix by Pattern
Fix all actions with the same issue type together:
- All validation pattern issues
- All message ID issues
- All filtering issues

### 3. Add Regression Tests
Create tests that verify patterns are followed:
- Validation pattern compliance test
- Message ID consistency test
- Meta-command filtering test

### 4. Document Standards
Create clear documentation:
- Action implementation standards
- Message ID naming conventions
- Test writing guidelines

## Success Metrics

1. All 998 tests passing
2. No regression in working tests
3. Clear patterns established and documented
4. Test helpers created for future actions

## Next Steps

1. Start with Phase 1 (Critical Pattern Fixes) as it has the highest impact
2. Create the validation pattern test helper
3. Fix taking action as the prototype
4. Apply fixes to all other failing actions
5. Move through phases in order of priority

## Risk Mitigation

- **Risk**: Breaking working tests
  - **Mitigation**: Run tests after each fix, commit frequently
  
- **Risk**: Introducing new patterns that conflict
  - **Mitigation**: Follow existing ADRs, document any changes
  
- **Risk**: Time overrun
  - **Mitigation**: Fix by priority, can ship with some test failures

## Conclusion

The test failures are systematic and stem from incomplete refactoring and pattern migrations. A methodical approach fixing patterns first, then message IDs, then edge cases will resolve most issues. The validation/execute pattern mismatch is the most critical issue affecting 100+ tests.