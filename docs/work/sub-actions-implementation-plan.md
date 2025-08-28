# Sub-Actions Pattern Implementation Plan

## Overview
Implement ADR-063 Sub-Actions Pattern to organize related actions under parent directories with shared base logic. This approach improves code organization, reduces duplication, and supports internationalization through semantic intents.

## Core Requirements

### Architectural Compliance
1. **No Backwards Compatibility**: We can make breaking changes as needed to achieve architectural compliance
2. **Three-Phase Architecture**: All actions MUST follow the validate/execute/report pattern (ADR-051)
3. **No Debug Statements**: Remove all `console.*` debug statements during refactoring
4. **Iterative Approach**: Make changes one action at a time, re-review after each fix
5. **Quality Target**: All refactored actions must achieve 8+ rating (up from <5)
6. **Language Updates**: If an action requires new language messages, include that in the refactoring
7. **Code Smells**: Always think through code smells and do code reviews to maintain high review ratings (8+)

### Quality Standards
- Each action must strictly follow validate/execute/report phases
- No mixing of concerns between phases
- Validation returns `ValidationResult` with `valid: boolean` and optional `error`
- Execute emits semantic events only, no direct message output
- Report phase handled by message system based on events
- Remove all debug logging (`console.log`, `console.debug`, etc.)
- Extract complex logic into helper functions
- Use descriptive variable names and clear function signatures

## Phase 1: Pilot Implementation (Switching Actions)

### Directory Structure
```
packages/stdlib/src/actions/standard/switching/
├── index.ts                    # Exports both sub-actions
├── switching-base.ts           # Base class with shared logic
├── switching-events.ts         # Shared event types
├── switching-helpers.ts        # Shared helper functions
├── activate/
│   ├── activate.ts            # Switching on action
│   └── activate-events.ts     # Specific events
└── deactivate/
    ├── deactivate.ts          # Switching off action
    └── deactivate-events.ts  # Specific events
```

### Implementation Steps
1. Create switching directory structure
2. Move shared logic from switching-shared.ts to switching-base.ts
3. Create SwitchingBaseAction abstract class with:
   - Common validation logic
   - Shared helper methods
   - Abstract methods for sub-action specifics
4. Implement activate sub-action (currently switching_on)
5. Implement deactivate sub-action (currently switching_off)
6. Update action registration to use new paths
7. Run and fix tests
8. Delete old switching_on/switching_off directories

### Success Criteria
- [ ] Both actions achieve quality score of 8+
- [ ] Strict adherence to validate/execute/report pattern
- [ ] All debug statements removed
- [ ] Shared code is properly centralized
- [ ] No code duplication between sub-actions
- [ ] All language messages defined and appropriate
- [ ] Code review shows no obvious smells

## Phase 2: Locking/Unlocking Actions

### Directory Structure
```
packages/stdlib/src/actions/standard/locking/
├── index.ts
├── locking-base.ts
├── locking-events.ts
├── lock-shared.ts              # Existing shared helpers
├── secure/                     # Lock sub-action
│   ├── secure.ts
│   └── secure-events.ts
└── unsecure/                   # Unlock sub-action
    ├── unsecure.ts
    └── unsecure-events.ts
```

### Implementation Steps
1. Create locking directory structure
2. Move lock-shared.ts logic to locking-base.ts
3. Create LockingBaseAction with shared validation
4. Implement secure sub-action (currently locking)
5. Implement unsecure sub-action (currently unlocking)
6. Update action registration
7. Update and run tests
8. Clean up old directories

## Phase 3: Wearable Actions

### Directory Structure
```
packages/stdlib/src/actions/standard/wearable/
├── index.ts
├── wearable-base.ts
├── wearable-events.ts
├── wearable-shared.ts          # Existing shared helpers
├── wear/
│   ├── wear.ts
│   └── wear-events.ts
└── remove/
    ├── remove.ts               # Note: not "take_off" (semantic intent)
    └── remove-events.ts
```

### Implementation Steps
1. Create wearable directory structure
2. Move wearable-shared.ts to wearable-base.ts
3. Create WearableBaseAction
4. Implement wear sub-action
5. Implement remove sub-action
6. Handle implicit taking logic
7. Update action registration
8. Update and run tests
9. Clean up old directories

## Phase 4: Action Registration Updates

### Changes Required
1. Update `packages/stdlib/src/actions/standard/index.ts`:
   - Import from new sub-action paths
   - Maintain backward compatibility with action IDs
   - Export both old names and new semantic names

2. Update action constants if needed:
   - Keep existing IFActions constants
   - Add semantic intent mappings

### Example Registration
```typescript
// Old way
import { switchingOnAction } from './switching_on';
import { switchingOffAction } from './switching_off';

// New way
import { activateAction, deactivateAction } from './switching';
// Maintain backward compatibility
export { activateAction as switchingOnAction };
export { deactivateAction as switchingOffAction };
```

## Phase 5: Testing Strategy

### Test Organization
1. Move tests to match new structure:
   - `tests/unit/actions/switching/activate.test.ts`
   - `tests/unit/actions/switching/deactivate.test.ts`

2. Create shared test utilities per action family:
   - `tests/unit/actions/switching/test-utils.ts`

3. Ensure golden pattern tests remain comprehensive

### Test Coverage Requirements
- [ ] All existing tests pass
- [ ] Shared logic tested once in base tests
- [ ] Sub-action specific behavior tested separately
- [ ] Integration tests verify action families work together

## Phase 6: Documentation Updates

### Required Documentation
1. Update action documentation in each sub-action
2. Create migration guide for story authors
3. Update stdlib README with new structure
4. Add examples of extending base actions

### Code Comments
- Document why sub-actions pattern was chosen
- Explain semantic intent naming
- Show how to add new sub-actions

## Risk Mitigation

### Breaking Changes Allowed
- Can change action IDs if needed for semantic clarity
- Can restructure event types for better architecture
- Can modify data structures to eliminate code smells
- Tests will be updated to match new patterns

### Rollback Plan
- Each phase is independently completeable
- Can pause between phases to assess impact
- Git history allows easy reversion if needed

## Success Metrics

### Code Quality (Required)
- [ ] All refactored actions score 8+ (minimum)
- [ ] Target 9+ quality scores where possible
- [ ] Reduce total lines of code by 20-30%
- [ ] Eliminate all duplicate validation logic
- [ ] Zero debug statements remaining
- [ ] Clean separation of validate/execute phases

### Maintainability
- [ ] Adding new sub-actions requires <50 lines
- [ ] Shared logic changes affect all sub-actions
- [ ] Clear separation of concerns

### Developer Experience
- [ ] Intuitive directory structure
- [ ] Easy to find related actions
- [ ] Simple to extend action families

## Timeline Estimate

- Phase 1 (Switching): 2 hours
- Phase 2 (Locking): 1.5 hours  
- Phase 3 (Wearable): 1.5 hours
- Phase 4 (Registration): 1 hour
- Phase 5 (Testing): 2 hours
- Phase 6 (Documentation): 1 hour

**Total: ~9 hours of implementation**

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 with switching actions as pilot
3. Validate approach works as expected
4. Continue with remaining phases
5. Create PR with comprehensive description
6. Merge and document lessons learned