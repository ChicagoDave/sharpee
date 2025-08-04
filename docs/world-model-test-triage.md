# World Model Test Triage - Scope System Impact

Date: 2025-08-04
Context: After implementing ADR-045 scope system, we need to understand which tests are failing and why.

## Test Categories

### 1. Scope Tests (✅ All Passing)
These tests were specifically written for the new scope system:
- `tests/scope/window-visibility.test.ts` - ✅ All 7 tests passing
- `tests/scope/darkness-light.test.ts` - ✅ All 8 tests passing  
- `tests/scope/sound-traveling.test.ts` - ✅ All 6 tests passing
- `tests/scope/magic-sight.test.ts` - ✅ All 7 tests passing

### 2. Core World Model Tests (✅ All Passing)
- `tests/unit/world/world-model.test.ts` - ✅ All 67 tests passing

### 3. Failing Tests - Need Analysis

#### A. Container Visibility Tests (❌ 3 failures)
File: `tests/unit/visibility/container-state-visibility.test.ts`
- ❌ "should not see medicine when cabinet is closed" 
- ✅ "should see medicine when cabinet is open"
- ❌ "should handle multiple state changes"
- ✅ "should verify canSee works correctly"
- ✅ "should verify medicine is in scope regardless of cabinet state"

**Issue**: Tests expect `getVisible()` to respect container open/closed state, but current scope rules include all nested contents.

#### B. Author Model Tests (❌ 1 failure)
File: `tests/unit/world/author-model.test.ts`
- ❌ "should include items in closed containers in scope"
  - Expected items in closed containers NOT to be visible
  - But they are visible with current scope rules

#### C. Get In Scope Tests (❌ 1 failure)
File: `tests/unit/world/get-in-scope.test.ts`
- ❌ "should include deeply nested items"
  - Expected to find deeply nested items in scope
  - Might be a different issue

#### D. Debug Worn Visibility (❌ 1 failure)
File: `tests/debug-worn-visibility.test.ts`
- ❌ "should debug worn item visibility"
  - Expected to see worn items on NPCs
  - Current scope rules might be filtering them out

#### E. Container Hierarchies (❌ 1 failure)
File: `tests/integration/container-hierarchies.test.ts`
- ❌ "should update visibility when opening/closing containers"
  - Similar to container visibility issue

#### F. Visibility Chains (❌ 9 failures)
File: `tests/integration/visibility-chains.test.ts`
- ❌ "should see through open containers"
- ❌ "should not see into closed containers"
- ❌ "should see through containers on supporters"
- ❌ "should not see in dark rooms"
- ❌ "should handle light in containers"
- ❌ "should see worn items on actors"
- ❌ "should not see invisible scenery"
- ❌ "should handle deep visibility chains"
- ❌ "should handle multiple visibility blockers"

#### G. Room Navigation (❌ 1 failure)
File: `tests/integration/room-navigation.test.ts`
- ❌ "should handle dark rooms and navigation"
  - Expects not to see in dark rooms

#### H. Trait Combinations (❌ 4 failures)
File: `tests/integration/trait-combinations.test.ts`
- ❌ "should not see contents of locked closed container"
- ❌ "should see items on supporter but not in closed container" 
- ❌ "should see through containers on supporters"
- ❌ "should see in lit rooms but not dark rooms"

## Key Findings

### 1. Scope vs Visibility Confusion
The tests reveal a fundamental expectation mismatch:
- **Scope** = what entities can be referenced/interacted with
- **Visibility** = what entities can be seen

The current implementation uses the same scope system for both `getVisible()` and `getInScope()`, but tests expect them to behave differently.

### 2. Expected Behaviors
Based on test analysis:

**getInScope() should include:**
- All entities in the room
- All nested contents (even in closed containers)
- Items carried by the player
- Worn items

**getVisible() should respect:**
- Container open/closed state
- Transparency of containers
- Darkness/light conditions
- Worn items should NOT be visible on other actors

### 3. Current Implementation Issues
- Both `getVisible()` and `getInScope()` use `evaluateScope()`
- Default scope rules include ALL nested contents
- No distinction between "in scope" and "visible"

## Recommendations

### Option 1: Separate Visibility from Scope
- Keep scope inclusive (all entities in room)
- Add visibility filtering on top of scope
- Use action-specific scope rules for visibility

### Option 2: Action-Specific Scope Rules
- Different rules for different actions
- "examining" action respects container state
- Default action includes everything

### Option 3: Use VisibilityBehavior
- Revert to using `VisibilityBehavior.getVisible()` for visibility
- Keep scope system for `getInScope()`
- Clear separation of concerns

## Next Steps
1. Decide on approach (recommend Option 3)
2. Update implementation
3. Re-run tests to verify