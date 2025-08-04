# Phase 3: Event Structure Standardization Progress

## Summary of Changes

### Issue Identified
The core issue was that domain events (like `if.action.inventory`, `if.event.examined`) were being double-wrapped by the enhanced context, causing a nested data structure:
- Expected: `event.data.items`
- Actual: `event.data.data.items`

### Root Cause
1. The enhanced-context.ts was wrapping ALL non-action events in a structure with `{ actionId, timestamp, data }`
2. The core createEvent function adds both `payload` and `data` properties (legacy support)
3. This caused domain event data to be nested twice

### Solution Applied
Modified enhanced-context.ts to detect domain events (those starting with `if.`) and pass their data directly to createEvent without wrapping:

```typescript
// For domain events (like if.action.inventory, if.event.examined), 
// pass the data directly without wrapping
if (type.startsWith('if.')) {
  const entities = this.getEventEntities();
  return coreCreateEvent(type, eventData, entities);
}
```

## Results

### Test Improvements
- **Before**: 118 failed tests across 31 files
- **After**: 108 failed tests across 31 files
- **Improvement**: 10 tests fixed (8.5% reduction)

### Inventory Action Success
The inventory action is now working correctly:
- 17 out of 18 tests passing
- Only 1 test failing (weight calculation returning 0 instead of 41)
- All event structure tests passing
- Brief format detection working
- Item lists properly populated

## Lessons Learned

1. **Event Structure Matters**: The test utilities expect a specific event structure that matches how the core system creates events.

2. **Domain vs Action Events**: 
   - Domain events (`if.*`) should have their data passed directly
   - Action events (`action.success`, `action.error`) need special handling

3. **Legacy Compatibility**: The core createEvent adds both `payload` and `data` properties for backwards compatibility, which can cause confusion.

## Next Steps

1. **Apply Similar Fix**: Other actions may have similar issues with event data structure
2. **Fix Remaining Test Failures**: 108 tests still failing, likely due to:
   - Missing event data fields
   - Incorrect message IDs
   - Validation logic issues
3. **Document Event Patterns**: Create clear documentation on how to structure events for different types

## Pattern for Correct Action Implementation

Based on the examining action (working correctly):
1. Create typed event data interfaces
2. Emit domain events with structured data directly
3. Emit action.success/error with proper messageId and params
4. Don't double-wrap event data