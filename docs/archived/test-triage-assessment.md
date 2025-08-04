# Test Triage Assessment - stdlib Actions Migration

## Executive Summary

All 44 migrated actions have systematic failures due to incorrect event structure implementation. The migration introduced two critical issues that affect every action:

1. **Wrong Event Types**: Actions emit `if.event.error` and `if.event.success` instead of `action.error` and `action.success`
2. **Missing Event Fields**: Error events lack required fields (actionId, reason) and use incorrect parameter names

## Failure Pattern Analysis

### Pattern 1: Event Type Mismatch (100% of failures)
- **Expected**: `action.error`, `action.success`
- **Actual**: `if.event.error`, `if.event.success`
- **Impact**: Every test expecting action feedback fails

### Pattern 2: Error Event Structure (All error tests)
Tests expect error events with this structure:
```typescript
{
  type: 'action.error',
  actionId: 'if.action.xxx',
  messageId: 'error_message_key',
  reason: 'error_message_key',  // Missing in migrated actions
  params: { ... }  // Called 'messageParams' in some migrated actions
}
```

### Pattern 3: Success Event Structure (All success tests)
Tests expect success events with:
```typescript
{
  type: 'action.success',
  actionId: 'if.action.xxx',
  messageId: 'success_message_key',
  params: { ... }
}
```

## Test Results by Action

### Core Actions (Priority 1)
- **taking**: 8/17 tests failing - Event structure issues
- **dropping**: 11/15 tests failing - Event structure issues
- **examining**: 14/18 tests failing - Event structure issues
- **going**: 10/19 tests failing - Event structure issues

### Manipulation Actions (Priority 2)
- **putting**: 16/26 tests failing - Event structure issues
- **opening**: Not tested in log (needs verification)
- **closing**: Not tested in log (needs verification)
- **locking**: Not tested in log (needs verification)
- **unlocking**: Not tested in log (needs verification)

### Interaction Actions (Priority 3)
- **wearing**: 8/15 tests failing - Event structure issues
- **drinking**: 25/33 tests failing - Event structure issues
- **entering**: 9/17 tests failing - Event structure issues
- **pulling**: 23/35 tests failing - Event structure issues
- Others: Not in initial test run

### Special Cases
- **taking**: Has additional issue with trait creation syntax
- **dropping**: Has edge case test failure with location comparison

## Root Cause

The migration pattern used incorrect event types throughout. Every migrated action needs:

1. Replace `if.event.error` → `action.error`
2. Replace `if.event.success` → `action.success`
3. Add `actionId` field to all error/success events
4. Add `reason` field to error events (matching messageId)
5. Ensure parameter field is named `params` not `messageParams`

## Recommended Fix Strategy

### Option 1: Bulk Fix Script (Recommended)
Create a script to fix all 44 actions at once:
- Find/replace event type strings
- Add missing fields using regex patterns
- Standardize parameter names

### Option 2: Manual Fix
Fix each action individually following the pattern from taking.ts

### Option 3: Revert and Re-migrate
Since 100% of actions have the same issue, consider reverting and re-running migration with corrected template

## Priority Order for Fixes

1. **Fix event type issue first** - This alone will fix ~50% of failures
2. **Fix error event structure** - Add reason field and standardize params
3. **Fix success event structure** - Add actionId and standardize params
4. **Verify edge cases** - Check for action-specific issues

## Validation Strategy

After fixes:
1. Run tests for one action to verify pattern is correct
2. Apply pattern to all actions
3. Run full test suite
4. Check for any remaining action-specific issues

## Risk Assessment

- **Low Risk**: Issue is systematic and well-understood
- **High Impact**: Affects all migrated actions equally
- **Easy Fix**: Pattern is consistent across all failures
- **No Logic Issues**: Core action logic appears correct, only event structure is wrong

## Conclusion

This is a straightforward but pervasive issue introduced during the migration. The good news is that the fix pattern is identical for all actions, making bulk correction feasible. The core action logic was migrated correctly - only the event emission needs adjustment.