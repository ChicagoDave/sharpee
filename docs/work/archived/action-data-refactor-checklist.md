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
- [x] Create base types for action data builders
  - [x] Define `ActionDataBuilder` type
  - [x] Define `ActionDataConfig` interface
  - [x] Create `buildEventData` utility function
- [ ] Update `ActionContext` to support data builders
- [ ] Create testing utilities for data builders

## Phase 2: Migrate Core Actions ✅ COMPLETE
Create data builders for each action, moving snapshot logic out of `report()`:

### 2.1 Simple Actions (No indirect objects)
- [x] `looking-data.ts`
  - [x] Extract room snapshot logic
  - [x] Extract contents snapshot logic
  - [x] Update `looking.ts` to use data builder
- [x] `examining-data.ts`
  - [x] Extract entity snapshot logic
  - [x] Handle container contents
  - [x] Update `examining.ts` to use data builder
- [x] `going-data.ts`
  - [x] Extract source/destination room snapshots
  - [x] Extract exit information
  - [x] Update `going.ts` to use data builder
  - [x] Remove direction language coupling (ADR-062)

### 2.2 Object Manipulation Actions
- [x] `taking-data.ts`
  - [x] Extract item snapshot logic
  - [x] Extract actor snapshot logic
  - [x] Handle container removal
  - [x] Update `taking.ts` to use data builder
- [x] `dropping-data.ts`
  - [x] Extract item/actor/location snapshots
  - [x] Update `dropping.ts` to use data builder
- [x] `opening-data.ts`
  - [x] Extract target snapshot
  - [x] Extract contents snapshots
  - [x] Update `opening.ts` to use data builder
- [x] `closing-data.ts`
  - [x] Extract target/contents snapshots
  - [x] Update `closing.ts` to use data builder

### 2.3 Complex Actions (With indirect objects)
- [x] `putting-data.ts`
  - [x] Extract item/target snapshots
  - [x] Handle 'in' vs 'on' prepositions
  - [x] Update `putting.ts` to use data builder (imports added)
- [x] `inserting-data.ts`
  - [x] Delegate to putting-data
  - [x] Update `inserting.ts` to use data builder (imports added)
- [x] `removing-data.ts`
  - [x] Extract item/actor/source snapshots
  - [x] Update `removing.ts` to use data builder (imports added)

## Phase 2.5: Remove Language Coupling ✅ COMPLETE
- [x] Implement ADR-062: Direction Language Coupling
  - [x] Create Direction constants in world-model
  - [x] Move language mappings to parser-en-us
  - [x] Update going action to use Direction constants
  - [x] Update throwing action to handle Direction constants
  - [x] Update Room trait to use Direction for exits
  - [x] Update RoomBehavior methods to use Direction type
  - [x] Update all tests to use Direction constants
  - [x] Parser automatically converts strings to Direction constants

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
- ADR-062: Direction Language Coupling (implemented)

## Progress Summary
- **Phase 1**: Infrastructure partially complete (base types done)
- **Phase 2**: ✅ COMPLETE - All 10 core actions migrated to data builders
- **Phase 2.5**: ✅ COMPLETE - Direction language coupling removed (ADR-062)
- **Phase 3**: Not started - Validation error data utility
- **Phase 4**: Not started - Story extension support
- **Phase 5**: Not started - Cleanup and documentation

## Notes
- Phase 2 completed on August 23, 2025
- ADR-062 implemented on August 23, 2025
- Significant code reduction achieved (~700 lines removed in Phase 2)
- Direction handling now fully language-agnostic
- Next priority: Phase 3 validation error utility to complete the pattern