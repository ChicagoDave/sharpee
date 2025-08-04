# Priority 1 Infrastructure Fixes - Implementation Plan

## 1. ✅ Fix getContainingRoom() - RESOLVED
The `getContainingRoom()` function is working correctly. The issue was with test expectations using hardcoded room IDs like 'room1' instead of the actual generated IDs like 'r01'.

## 2. ✅ Fix Command Creation Helper - PARTIALLY FIXED
Fixed the createCommand helper to properly check for entity existence before creating command structure.

## 3. 🔧 Add Shared Data Handling for Platform Tests

### Problem
Platform action tests use `world.setSharedData()` which doesn't exist. WorldModel uses a capability system instead.

### Solution
Created helper functions in `platform-test-helpers.ts`:
- `setupSharedData(world, data)` - Sets up shared data using capability system
- `getSharedData(world)` - Gets shared data from capability system

### Implementation Steps:
1. Update all platform action tests to import and use these helpers
2. Replace `world.setSharedData(key, value)` with:
   ```typescript
   setupSharedData(world, { [key]: value });
   ```
3. Replace `world.getSharedData(key)` with:
   ```typescript
   const data = getSharedData(world);
   const value = data[key];
   ```

## 4. 🔧 Fix Test Expectations for Generated IDs

### Problem
Tests expect hardcoded IDs like 'room1', 'o01' but WorldModel generates IDs like 'r01', 'o01'.

### Solution
Update tests to use actual entity IDs instead of hardcoded strings.

### Pattern to Fix:
```typescript
// ❌ WRONG
expectEvent(events, 'if.event.dropped', {
  toLocation: 'room1'
});

// ✅ RIGHT
expectEvent(events, 'if.event.dropped', {
  toLocation: room.id  // Use actual entity ID
});
```

## 5. 🔧 Fix Entity Location Context

### Problem
Some tests show location as actor ID instead of room ID in event entities.

### Solution
Ensure `context.currentLocation` is properly set to the containing room in test context creation.

### Already Fixed in test-utils.ts:
- Added debug logging to identify when getContainingRoom returns undefined
- Falls back to player entity if no room found (edge case handling)

## Next Steps

1. First, let's fix the platform action tests by updating them to use the shared data helpers
2. Then, systematically fix test expectations to use actual entity IDs
3. Finally, verify all infrastructure is working correctly

Would you like me to proceed with implementing these fixes?
