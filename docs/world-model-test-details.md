# World Model Test Details - Test by Test Analysis

## Passing Tests ✅

### Scope Tests (New, Written for ADR-045)
All scope-specific tests are passing correctly, showing the scope system itself works as designed.

### Unit Tests
- `world-model.test.ts` - All core functionality working
- Most trait tests passing
- Spatial index tests passing

## Failing Tests ❌ - Detailed Analysis

### 1. container-state-visibility.test.ts

**Test: "should not see medicine when cabinet is closed"**
```typescript
expect(visible).not.toContainEqual(medicine);
```
- **Expected**: Medicine NOT visible when cabinet is closed
- **Actual**: Medicine IS visible
- **Valid?**: YES - This is correct behavior for visibility
- **Issue**: Scope rules include all nested contents

**Test: "should handle multiple state changes"**
- Same issue - expects visibility to change with container state
- **Valid?**: YES

### 2. author-model.test.ts

**Test: "should include items in closed containers in scope"**
```typescript
// Expected items in closed containers NOT to be visible
expect(visible).not.toContain(treasure);
```
- **Valid?**: YES - The test name is misleading. It's testing visibility, not scope
- **Issue**: Test expects `getVisible()` to filter closed containers

### 3. get-in-scope.test.ts

**Test: "should include deeply nested items"**
```typescript
expect(inScope).toContainEqual(paper);  // paper in box in chest
```
- **Valid?**: YES - Scope should include nested items
- **Issue**: Might be a different problem - need to check if getAllContents is working

### 4. debug-worn-visibility.test.ts

**Test: "should debug worn item visibility"**
```typescript
expect(visible).toContain(crown);  // Crown worn by NPC
```
- **Expected**: See crown worn by NPC
- **Actual**: Crown not visible
- **Valid?**: QUESTIONABLE - Game design question: should we see worn items?
- **Current behavior**: Scope rules don't include worn items

### 5. container-hierarchies.test.ts

**Test: "should update visibility when opening/closing containers"**
- Same as container-state-visibility issue
- **Valid?**: YES

### 6. visibility-chains.test.ts (Multiple failures)

**Test: "should see through open containers"**
- Expects to see items in open containers
- **Valid?**: YES

**Test: "should not see into closed containers"**
- Expects NOT to see items in closed containers
- **Valid?**: YES

**Test: "should not see in dark rooms"**
- Expects darkness to block visibility
- **Valid?**: YES - But needs darkness scope rules

**Test: "should see worn items on actors"**
- Expects to see worn items
- **Valid?**: QUESTIONABLE - Same as #4

**Test: "should not see invisible scenery"**
- Expects invisible scenery to be hidden
- **Valid?**: YES - Need to check scenery visibility

### 7. room-navigation.test.ts

**Test: "should handle dark rooms and navigation"**
```typescript
expect(world.canSee(player.id, chair.id)).toBe(false); // In dark room
```
- **Valid?**: YES - Darkness should block visibility
- **Issue**: No darkness rules in scope system

### 8. trait-combinations.test.ts

**Test: "should not see contents of locked closed container"**
- Same container visibility issue
- **Valid?**: YES

**Test: "should see in lit rooms but not dark rooms"**
- Same darkness issue
- **Valid?**: YES

## Summary of Issues

### 1. Primary Issue: Scope vs Visibility
- 90% of failures are because `getVisible()` uses scope rules
- Scope rules are inclusive (show everything)
- Tests expect visibility filtering

### 2. Secondary Issues:
- No darkness handling in scope rules
- Worn items visibility is inconsistent
- Invisible scenery not handled

### 3. Test Validity:
- Most tests are VALID and correct
- Tests reflect expected game behavior
- A few tests have questionable expectations (worn items)

## Conclusion

The tests are mostly correct. The implementation needs to distinguish between:
1. **Scope** (what can be referenced) - inclusive
2. **Visibility** (what can be seen) - filtered by container state, darkness, etc.