# World-Model Scope Implementation Checklist

Based on ADR-046: Scope and Perception Architecture

## Overview
Implement separation between Parser Scope (for entity resolution) and Perception Scope (for visibility).

## Phase 1: Core World-Model Changes

### 1.1 Update Visibility Methods
- [ ] Modify `getVisible()` to use VisibilityBehavior instead of scope system
  ```typescript
  getVisible(observerId: string): IFEntity[] {
    const observer = this.getEntity(observerId);
    if (!observer) return [];
    return VisibilityBehavior.getVisible(observer, this);
  }
  ```

- [ ] Modify `canSee()` to use VisibilityBehavior instead of scope system
  ```typescript
  canSee(observerId: string, targetId: string): boolean {
    const observer = this.getEntity(observerId);
    const target = this.getEntity(targetId);
    if (!observer || !target) return false;
    return VisibilityBehavior.canSee(observer, target, this);
  }
  ```

- [ ] Keep `getInScope()` using the scope system (no change needed)
  ```typescript
  getInScope(observerId: string): IFEntity[] {
    const entityIds = this.evaluateScope(observerId);
    return entityIds
      .map(id => this.getEntity(id))
      .filter((e): e is IFEntity => e !== undefined);
  }
  ```

### 1.2 Verify VisibilityBehavior Implementation
- [ ] Check that VisibilityBehavior.getVisible() properly filters:
  - [ ] Items in closed containers (should NOT be visible)
  - [ ] Items in open containers (should be visible)
  - [ ] Items on supporters (should be visible)
  - [ ] Worn items on other actors (design decision - currently NOT visible)
  - [ ] Items in transparent containers (should be visible)

- [ ] Check that VisibilityBehavior handles darkness:
  - [ ] Returns empty/limited results in dark rooms
  - [ ] Works with light sources

### 1.3 Update Default Scope Rules
- [ ] Ensure default scope rules remain inclusive for parser resolution
- [ ] Document that scope rules are for "what can be referenced" not "what can be seen"
- [ ] Add comments to clarify the distinction

## Phase 2: Test Updates

### 2.1 Fix Failing Tests
Based on triage, these tests should pass after changes:

- [ ] `container-state-visibility.test.ts`
  - [ ] "should not see medicine when cabinet is closed"
  - [ ] "should handle multiple state changes"

- [ ] `author-model.test.ts`
  - [ ] "should include items in closed containers in scope" (rename - it's testing visibility)

- [ ] `debug-worn-visibility.test.ts`
  - [ ] Review if worn items should be visible (game design decision)

- [ ] `container-hierarchies.test.ts`
  - [ ] "should update visibility when opening/closing containers"

- [ ] `visibility-chains.test.ts` (multiple tests)
  - [ ] Container visibility tests
  - [ ] Darkness tests
  - [ ] Worn items tests (review design decision)

- [ ] `room-navigation.test.ts`
  - [ ] "should handle dark rooms and navigation"

- [ ] `trait-combinations.test.ts`
  - [ ] Container and darkness related tests

### 2.2 Verify Passing Tests Still Pass
- [ ] All scope-specific tests (window-visibility, etc.)
- [ ] Core world-model tests
- [ ] Get-in-scope tests

## Phase 3: Stdlib Integration Preparation

### 3.1 Document Integration Points
- [ ] Create interface documentation for stdlib ScopeResolver
- [ ] Document how VisibilityBehavior will be wrapped by ScopeResolver
- [ ] Plan witness system integration

### 3.2 Verify API Compatibility
- [ ] Ensure world-model exports needed for stdlib:
  - [ ] VisibilityBehavior class
  - [ ] Scope system interfaces
  - [ ] Entity and trait types

## Phase 4: Documentation

### 4.1 Update Code Comments
- [ ] Add clear comments to getVisible() explaining it uses perception
- [ ] Add clear comments to getInScope() explaining it uses parser scope
- [ ] Update scope rule registration to clarify purpose

### 4.2 Update Developer Documentation
- [ ] Update world-model README if needed
- [ ] Create examples showing the difference
- [ ] Document the architectural decision

## Phase 5: Verification

### 5.1 Run All Tests
- [ ] Run world-model tests: `pnpm test`
- [ ] Verify all tests pass
- [ ] Check for any unexpected behavior changes

### 5.2 Integration Testing
- [ ] Test with parser to ensure entity resolution still works
- [ ] Test with a simple story to verify visibility behavior

## Implementation Order

1. **Start with**: Phase 1.1 - Update visibility methods
2. **Then**: Phase 2.1 - Run tests and verify fixes
3. **Next**: Phase 1.2 - Verify VisibilityBehavior completeness
4. **Finally**: Phases 3-5 - Integration and documentation

## Success Criteria

- [ ] All world-model tests pass
- [ ] `getVisible()` respects container open/closed state
- [ ] `getInScope()` includes all referenceable entities
- [ ] Parser can still resolve entity names correctly
- [ ] Clear separation between parser scope and perception

## Notes

- The key change is small but important: getVisible() and canSee() switch from scope system to VisibilityBehavior
- Most of the work is verifying tests and ensuring the behavior matches expectations
- This sets up proper integration with stdlib witness system