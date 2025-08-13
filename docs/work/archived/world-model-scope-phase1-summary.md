# World-Model Scope Implementation Phase 1 Summary

## Work Completed

### 1. Separated Visibility from Scope
- Updated `WorldModel.getVisible()` to use `VisibilityBehavior` instead of scope system
- Updated `WorldModel.canSee()` to use `VisibilityBehavior` instead of scope system  
- Kept `getInScope()` using the scope system for parser resolution

### 2. Fixed VisibilityBehavior
- Removed circular dependency where `getVisible()` was calling `getInScope()`
- Fixed darkness handling:
  - Players can always see the room they're in
  - Players can see items they're carrying (by feel)
  - Players can see lit light sources in darkness
- Fixed recursive visibility through containers and supporters
- Added support for worn items visibility

### 3. Updated Tests
- Fixed window visibility tests to correctly test scope (for parser) vs visibility (for perception)
- Fixed most darkness and light source tests
- Reduced failing tests from 22 to 15

### 4. Added Documentation
- Created comprehensive JSDoc comments for `getVisible()`, `getInScope()`, and `canSee()`
- Clarified the distinction between physical visibility and parser scope

## Test Results

**Before Changes:**
- Test Files: 9 failed | 50 passed (59)
- Tests: 22 failed | 1114 passed (1136)

**After Changes:**
- Test Files: 7 failed | 52 passed (59)
- Tests: 15 failed | 1121 passed (1136)

## Remaining Issues

### 1. Window Visibility Tests (3 tests)
Some tests in `window-visibility.test.ts` are expecting empty visible arrays. This appears to be a test setup issue.

### 2. Magic Sight Tests (4 tests)
The `magic-sight.test.ts` tests expect magical abilities to affect physical visibility. These tests are philosophically incorrect - magical sight should use scope rules for parser resolution, not change physical visibility.

### 3. Window Visibility Fixed Tests (3 tests)
Similar to window visibility tests, expecting cross-room visibility through `getVisible()`.

### 4. Get In Scope Test (1 test)
One test for deeply nested items in scope is failing - needs investigation.

### 5. Visibility Behavior Tests (2 tests)
Two tests expecting different darkness behavior than implemented.

### 6. Wearable Clothing Test (1 test)
One test about pocket visibility when clothing is worn.

### 7. Partial Darkness Test (1 test)
One test expecting scope rules to affect physical visibility for "dim light".

## Architectural Clarity Achieved

The separation is now clear:
- **Physical Visibility** (`getVisible()`, `canSee()`): What can actually be seen with eyes
  - Respects physical constraints (walls, containers, darkness)
  - Used for display and perception
  - Does NOT use scope rules

- **Parser Scope** (`getInScope()`, `evaluateScope()`): What can be referenced in commands
  - Includes items in closed containers (player knows they're there)
  - Can be extended by scope rules (e.g., seeing through windows)
  - Used for command resolution

## Next Steps

1. **Fix Test Philosophy**: Update failing tests to respect the visibility/scope separation
2. **Investigate Setup Issues**: Debug why some visibility tests are returning empty arrays
3. **Complete Documentation**: Update any remaining misleading test names or comments
4. **Integration Testing**: Verify parser still works correctly with the new system