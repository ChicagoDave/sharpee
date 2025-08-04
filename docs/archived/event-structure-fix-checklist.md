# Event Structure Fix Checklist

This checklist tracks the fixes needed to correct the event structure issues introduced during the stdlib actions migration.

## Issue Summary

All 44 migrated actions have incorrect event structures:
- Using `if.event.error` instead of `action.error`
- Using `if.event.success` instead of `action.success`
- Missing required fields in events

## Fix Pattern

### For Error Events
```typescript
// ❌ WRONG (current)
return [context.event('if.event.error', {
  messageId: 'no_target'
})];

// ✅ CORRECT
return [context.event('action.error', {
  actionId: this.id,
  messageId: 'no_target',
  reason: 'no_target'  // Add reason field matching messageId
})];
```

### For Success Events
```typescript
// ❌ WRONG (current)
events.push(context.event('if.event.success', {
  messageId: 'taken',
  messageParams: { item: 'book' }
}));

// ✅ CORRECT
events.push(context.event('action.success', {
  actionId: this.id,
  messageId: 'taken',
  params: { item: 'book' }  // Use 'params' not 'messageParams'
}));
```

## Actions to Fix

### Priority 1 - Core Actions (4)
- [ ] taking - Fix event types and add missing fields
- [ ] dropping - Fix event types and add missing fields
- [ ] examining - Fix event types and add missing fields
- [ ] going - Fix event types and add missing fields

### Priority 2 - Manipulation Actions (4)
- [ ] opening - Fix event types and add missing fields
- [ ] closing - Fix event types and add missing fields
- [ ] locking - Fix event types and add missing fields
- [ ] unlocking - Fix event types and add missing fields

### Priority 3 - Interaction Actions (6)
- [ ] giving - Fix event types and add missing fields
- [ ] showing - Fix event types and add missing fields
- [ ] putting - Fix event types and add missing fields
- [ ] inserting - Fix event types and add missing fields
- [ ] removing - Fix event types and add missing fields
- [ ] throwing - Fix event types and add missing fields

### Priority 4 - System Actions (30)
- [ ] looking - Fix event types and add missing fields
- [ ] inventory - Fix event types and add missing fields
- [ ] waiting - Fix event types and add missing fields
- [ ] sleeping - Fix event types and add missing fields
- [ ] switching_on - Fix event types and add missing fields
- [ ] switching_off - Fix event types and add missing fields
- [ ] entering - Fix event types and add missing fields
- [ ] exiting - Fix event types and add missing fields
- [ ] climbing - Fix event types and add missing fields
- [ ] searching - Fix event types and add missing fields
- [ ] listening - Fix event types and add missing fields
- [ ] smelling - Fix event types and add missing fields
- [ ] touching - Fix event types and add missing fields
- [ ] pushing - Fix event types and add missing fields
- [ ] pulling - Fix event types and add missing fields
- [ ] turning - Fix event types and add missing fields
- [ ] wearing - Fix event types and add missing fields
- [ ] taking_off - Fix event types and add missing fields
- [ ] eating - Fix event types and add missing fields
- [ ] drinking - Fix event types and add missing fields
- [ ] talking - Fix event types and add missing fields
- [ ] attacking - Fix event types and add missing fields
- [ ] scoring - Fix event types and add missing fields
- [ ] help - Fix event types and add missing fields
- [ ] about - Fix event types and add missing fields
- [ ] saving - Fix event types and add missing fields
- [ ] restoring - Fix event types and add missing fields
- [ ] quitting - Fix event types and add missing fields
- [ ] restarting - Fix event types and add missing fields
- [ ] again - Fix event types and add missing fields

## Validation Steps

### After Each Fix
1. [ ] Verify all `if.event.error` replaced with `action.error`
2. [ ] Verify all `if.event.success` replaced with `action.success`
3. [ ] Verify all error events have `actionId`, `messageId`, and `reason` fields
4. [ ] Verify all success events have `actionId` field
5. [ ] Verify parameter field is named `params` not `messageParams`
6. [ ] Run tests for the specific action

### After All Fixes
1. [ ] Run full stdlib test suite
2. [ ] Verify no event type mismatches remain
3. [ ] Check for any action-specific edge cases
4. [ ] Update migration documentation with lessons learned

## Special Cases

### taking.ts
- [ ] Fix trait creation syntax issue in test

### dropping.ts  
- [ ] Fix edge case test comparing locations

### putting.ts
- [ ] Ensure all error branches follow the pattern

## Automation Options

### Option 1: Regex Replace Script
```bash
# Replace error event types
find . -name "*.ts" -exec sed -i "s/context\.event('if\.event\.error'/context.event('action.error'/g" {} \;

# Replace success event types  
find . -name "*.ts" -exec sed -i "s/context\.event('if\.event\.success'/context.event('action.success'/g" {} \;
```

### Option 2: AST-based Transform
Create a TypeScript transformer to:
1. Find all `context.event()` calls
2. Update event types
3. Add missing fields
4. Standardize parameter names

## Notes

- The core action logic is correct - only event emission needs fixing
- This is a systematic issue affecting all actions identically
- Fix pattern is consistent and can be automated
- Tests are correctly expecting the standard event structure