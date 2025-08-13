# Test Failures Assessment - 2025-08-13

## Summary
- **Total Tests**: 998
- **Passing**: 884 (88.6%)
- **Failing**: 49 (4.9%)
- **Skipped**: 65 (6.5%)
- **Previously**: 61 failures → Now: 49 failures (12 fixed)

## Assessment Categories

### 1. REPAIR - Quick Fixes (High Priority)
These tests are failing due to simple issues like missing validation params or executeWithValidation helpers.

#### Validation Parameter Issues (11 tests)
- `giving-golden.test.ts` (7 failures) - Missing validation params in action
  - no_item, no_recipient, not_actor, giving_to_self params
  - inventory_full, too_heavy, not_interested validation
- `touching-golden.test.ts` (2 failures) - Missing validation params
  - no_target validation
  - Hard container message issue
- `examining-golden.test.ts` (1 failure) - Missing no_target validation
- `removing-golden.test.ts` (1 failure) - Missing no_target validation

#### Event Data Structure Issues (8 tests)
- `climbing-golden.test.ts` (4 failures) - Destination name not in event data
- `closing-golden.test.ts` (2 failures) - Container contents/requirements
- `throwing-golden.test.ts` (3 failures) - Fragile item breaking logic
- `showing-golden.test.ts` (2 failures) - Missing validation params

### 2. REPLACE - Needs Redesign (Medium Priority)
These tests check functionality that may need architectural changes.

#### Platform Integration Tests (5 tests)
- `platform-actions.test.ts` - Save/restore functionality
  - These test platform-specific features that may not exist yet
  - Recommendation: Skip or mock until platform integration is complete

#### Meta Commands (3 tests)
- `meta-commands.test.ts` - Author debug commands
  - Tests for debug/author commands that may have changed
  - Recommendation: Update to match new command structure

#### Again Action (7 tests)
- `again.test.ts` - Command history filtering
  - Tests filtering of non-repeatable commands
  - Recommendation: Verify command history implementation

### 3. INVESTIGATE - Complex Issues (Lower Priority)
These require deeper investigation into the business logic.

#### Container/Entry Logic (7 tests)
- `entering-golden.test.ts` (5 failures) - Container entry validation
  - Occupancy limits, closed containers, blocked entry
- `exiting-golden.test.ts` (2 failures) - Exit validation logic

#### Movement and Visibility (4 tests)
- `going-golden.test.ts` (2 failures) - Door lock/destination validation
- `looking-golden.test.ts` (2 failures) - Light source detection inverted

#### Action Delegation (1 test)
- `inserting-golden.test.ts` (1 failure) - Delegation to putting action

## Recommended Action Plan

### Phase 1: Quick Repairs (Target: 20 tests)
1. Fix validation params in giving, touching, examining, removing actions
2. Add missing event data in climbing action
3. Fix fragile item logic in throwing action
4. Update showing action validation

### Phase 2: Architecture Updates (Target: 15 tests)
1. Review and update platform action tests
2. Update meta-command tests for new structure
3. Fix again action command filtering

### Phase 3: Complex Fixes (Target: 14 tests)
1. Fix container entry/exit validation
2. Resolve light source detection in looking
3. Fix action delegation in inserting

## Files to Modify

### High Priority (Quick Fixes)
```
packages/stdlib/src/actions/standard/giving/giving.ts
packages/stdlib/src/actions/standard/touching/touching.ts
packages/stdlib/src/actions/standard/climbing/climbing.ts
packages/stdlib/src/actions/standard/examining/examining.ts
packages/stdlib/src/actions/standard/removing/removing.ts
packages/stdlib/src/actions/standard/showing/showing.ts
packages/stdlib/src/actions/standard/throwing/throwing.ts
packages/stdlib/src/actions/standard/closing/closing.ts
```

### Medium Priority (May Need Redesign)
```
packages/stdlib/src/actions/platform/
packages/stdlib/src/actions/standard/again/
packages/stdlib/src/actions/author/
```

### Low Priority (Complex Logic)
```
packages/stdlib/src/actions/standard/entering/
packages/stdlib/src/actions/standard/exiting/
packages/stdlib/src/actions/standard/going/
packages/stdlib/src/actions/standard/looking/
packages/stdlib/src/actions/standard/inserting/
```

## Expected Outcomes
- Phase 1: Reduce failures from 49 → ~29 (20 fixed)
- Phase 2: Reduce failures from 29 → ~14 (15 fixed/skipped)
- Phase 3: Reduce failures from 14 → 0 (14 fixed)

## Notes
- Most failures follow patterns from ADR-051 implementation
- Validation params and event data are the most common issues
- Platform and meta-command tests may need architectural decisions
- Some tests may be candidates for skipping if features are not yet implemented