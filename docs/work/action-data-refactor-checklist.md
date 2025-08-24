# Action Data Refactor Checklist

## Overview
This checklist tracks the implementation of ADR-059's action data configuration pattern to address the `captureEntitySnapshot` code smell identified in ADR-061.

## Goal
Replace repetitive snapshot calls in action `report()` methods with centralized, configurable data builders that separate data structure from business logic.

## Current State
- Actions directly call `captureEntitySnapshot` in their `report()` methods (code smell)
- Snapshot logic is duplicated across all 10 migrated actions
- No separation between core data and story-specific extensions

## Target State
- Each action has a companion `-data.ts` file with data builder functions
- Actions use data builders instead of direct snapshot calls
- Stories can extend action data through configuration
- Clean separation of concerns

## Phase 1: Infrastructure Setup
- [ ] Create base types for action data builders
  - [ ] Define `ActionDataBuilder` type
  - [ ] Define `ActionDataConfig` interface
  - [ ] Create `buildEventData` utility function
- [ ] Update `ActionContext` to support data builders
- [ ] Create testing utilities for data builders

## Phase 2: Migrate Core Actions
Create data builders for each action, moving snapshot logic out of `report()`:

### 2.1 Simple Actions (No indirect objects)
- [ ] `looking-data.ts`
  - [ ] Extract room snapshot logic
  - [ ] Extract contents snapshot logic
  - [ ] Update `looking.ts` to use data builder
- [ ] `examining-data.ts`
  - [ ] Extract entity snapshot logic
  - [ ] Handle container contents
  - [ ] Update `examining.ts` to use data builder
- [ ] `going-data.ts`
  - [ ] Extract source/destination room snapshots
  - [ ] Extract exit information
  - [ ] Update `going.ts` to use data builder

### 2.2 Object Manipulation Actions
- [ ] `taking-data.ts`
  - [ ] Extract item snapshot logic
  - [ ] Extract actor snapshot logic
  - [ ] Handle container removal
  - [ ] Update `taking.ts` to use data builder
- [ ] `dropping-data.ts`
  - [ ] Extract item/actor/location snapshots
  - [ ] Update `dropping.ts` to use data builder
- [ ] `opening-data.ts`
  - [ ] Extract target snapshot
  - [ ] Extract contents snapshots
  - [ ] Update `opening.ts` to use data builder
- [ ] `closing-data.ts`
  - [ ] Extract target/contents snapshots
  - [ ] Update `closing.ts` to use data builder

### 2.3 Complex Actions (With indirect objects)
- [ ] `putting-data.ts`
  - [ ] Extract item/target snapshots
  - [ ] Handle 'in' vs 'on' prepositions
  - [ ] Update `putting.ts` to use data builder
- [ ] `inserting-data.ts`
  - [ ] Delegate to putting-data
  - [ ] Update `inserting.ts` to use data builder
- [ ] `removing-data.ts`
  - [ ] Extract item/actor/source snapshots
  - [ ] Update `removing.ts` to use data builder

## Phase 3: Validation Error Data
- [ ] Create `validation-error-data.ts` utility
  - [ ] Extract common validation error snapshot logic
  - [ ] Handle direct/indirect object snapshots
- [ ] Update all actions to use validation error data builder
- [ ] Remove duplicate validation error snapshot code

## Phase 4: Story Extension Support
- [ ] Implement data extension mechanism
  - [ ] Add `dataExtensions` to Story interface
  - [ ] Create extension composition logic
  - [ ] Add extension validation
- [ ] Create example story with data extensions
- [ ] Document extension patterns

## Phase 5: Remove Old Code
- [ ] Remove direct `captureEntitySnapshot` calls from actions
- [ ] Consider deprecating `captureEntitySnapshot` utility
- [ ] Update tests for new data builder pattern
- [ ] Update documentation

## Benefits When Complete
1. **DRY**: Snapshot logic centralized in data builders
2. **Testable**: Data builders are pure functions
3. **Extensible**: Stories can add custom data
4. **Maintainable**: Clear separation of concerns
5. **Consistent**: All actions follow same pattern

## Migration Strategy
1. Start with one simple action (e.g., `examining`)
2. Validate the pattern works well
3. Migrate remaining actions in batches
4. Keep backward compatibility during migration
5. Remove old code only after all actions migrated

## Success Criteria
- [ ] No direct `captureEntitySnapshot` calls in action `report()` methods
- [ ] All actions have companion `-data.ts` files
- [ ] Data builders have unit tests
- [ ] Story extension mechanism works
- [ ] Documentation updated with new patterns

## Related ADRs
- ADR-058: Action Report Function (three-phase pattern)
- ADR-059: Action Customization Boundaries (data configuration)
- ADR-061: Entity Snapshot Code Smell (problem statement)

## Notes
This refactor addresses technical debt from the initial atomic events implementation. It should be done after core atomic events work is stable but before Phase 4 (Text Service refactor) of the main checklist.