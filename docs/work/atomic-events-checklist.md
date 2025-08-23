# Atomic Events Refactor Checklist

## Current Status (August 23, 2025)
- **Phase 1**: ✅ COMPLETE - Core interfaces updated
- **Phase 2**: ✅ COMPLETE - Action architecture redesigned  
- **Phase 3.1**: ✅ COMPLETE - 10 actions migrated to three-phase pattern
- **Phase 3.5**: ✅ COMPLETE - CommandExecutor refactored to thin orchestrator
- **Phase 3.2**: Ready to proceed (unblocked by 3.5)
- **Tests**: Need updating for new architecture but code is stable

**Ready to Commit:** All code changes are stable and building successfully.

## Phase 1: Core Interface Updates ✅ COMPLETE
- [x] Update `packages/core/src/events/types.ts`
  - [x] Change `data?: Record<string, unknown>` to `data?: unknown`
  - [x] Remove `payload` property
  - [x] Remove `metadata` property
  - [x] Update interface documentation
- [x] Update code that uses `payload` (61 occurrences in 28 files)
  - [x] Search and replace `.payload` with `.data`
  - [x] Update event creation code
- [x] Update code that uses `metadata` for events (~10 actual uses)
  - [x] Distinguish between event.metadata and context.metadata
  - [x] Update only event.metadata references
- [x] Run core package tests
- [x] Build core package

## Phase 2: Action Architecture Redesign (ADR-058) ✅ COMPLETE

### 2.1 Update Action Interface ✅
- [x] Update `packages/stdlib/src/actions/enhanced-types.ts`
  - [x] Add `report()` method to Action interface
  - [x] Update `execute()` signature to return `ISemanticEvent[] | void`
  - [x] Document three-phase pattern
  - [x] Add migration notes

### 2.2 Update CommandExecutor ✅
- [x] Update `packages/engine/src/command-executor.ts`
  - [x] Implement new execution flow
  - [x] Call validate → execute → report sequence
  - [x] Maintain backward compatibility
  - [x] Add debug logging for phases

### 2.3 Create Helper Utilities ✅
- [x] Create `packages/stdlib/src/actions/base/snapshot-utils.ts`
  - [x] Add `captureEntitySnapshot()` function
  - [x] Add `captureRoomSnapshot()` function
  - [x] Add `captureEntitySnapshots()` function
  - [x] Add `createEntityReference()` function
- [x] Create migration shim for unmigrated actions
  - [x] Detect actions without `report()` method
  - [x] Call old `execute()` for backward compatibility

## ~~Phase 3: Rules System Implementation~~ (POSTPONED)

*The Rules System from ADR-057 has been postponed pending further design discussion.*

## Phase 3: Migrate Standard Library Actions ✅ COMPLETE

**Summary:** Successfully migrated 10 core actions to the three-phase pattern. All actions now capture complete entity snapshots in their events while maintaining 100% backward compatibility. Total tests passing: 148.

### 3.1 Action Migrations (Three-Phase Pattern)
- [x] `looking.ts` (Proof of Concept) ✅
  - [x] Split execute() into execute/report
  - [x] Execute: minimal state changes only (mark room visited)
  - [x] Report: capture room data (name, description, id)
  - [x] Report: embed darkness state
  - [x] Report: embed entity snapshots for contents
  - [x] Maintain backward compatibility
  - [x] All tests passing
- [x] `examining.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: no mutations (read-only action)
  - [x] Report: capture complete entity snapshot
  - [x] Report: handle container contents with snapshots
  - [x] Report: handle readable items
  - [x] Report: handle wearable items
  - [x] Report: handle all trait types
  - [x] Maintain backward compatibility
  - [x] All tests passing
- [x] `going.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: perform movement only
  - [x] Report: capture source room data
  - [x] Report: capture destination room data
  - [x] Report: include exit information
  - [x] Maintain backward compatibility
  - [x] All tests passing
- [x] `taking.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: transfer item only
  - [x] Report: capture item snapshot
  - [x] Report: capture actor snapshot
  - [x] Maintain backward compatibility
  - [x] All tests passing
- [x] `dropping.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: transfer item only (delegates to ActorBehavior.dropItem)
  - [x] Report: capture item snapshot
  - [x] Report: capture actor snapshot
  - [x] Report: capture location snapshot
  - [x] Maintain backward compatibility
  - [x] All tests passing (15 tests)
- [x] `opening.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: change state only (delegates to OpenableBehavior.open)
  - [x] Report: capture target snapshot
  - [x] Report: capture contents snapshots
  - [x] Maintain backward compatibility
  - [x] All tests passing (12 tests)
- [x] `closing.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: change state only (delegates to OpenableBehavior.close)
  - [x] Report: capture target snapshot
  - [x] Report: capture contents snapshots (if container)
  - [x] Maintain backward compatibility
  - [x] All tests passing (13 tests)
- [x] `putting.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: transfer item to container/supporter
  - [x] Report: capture item snapshot
  - [x] Report: capture target snapshot
  - [x] Handle both 'in' and 'on' prepositions
  - [x] Maintain backward compatibility
  - [x] All tests passing (27 tests)
- [x] `inserting.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Delegates to putting action with 'in' preposition
  - [x] Report: delegates to putting.report()
  - [x] Maintain backward compatibility
  - [x] All tests passing (13 tests)
- [x] `removing.ts` ✅
  - [x] Split execute() into execute/report
  - [x] Execute: remove from source and take item
  - [x] Report: capture item snapshot
  - [x] Report: capture actor snapshot
  - [x] Report: capture source snapshot
  - [x] Maintain backward compatibility
  - [x] All tests passing (18 tests)

### 3.2 Validation Updates (UNBLOCKED - Ready after 3.5)
- [ ] Update validation error events to include entity data
- [ ] Update scope validation events  
- [ ] Test validation with new event structure

*Note: Now that Phase 3.5 is complete and actions own their error events, Phase 3.2 can proceed with proper architecture.*

### 3.5 CommandExecutor Refactor ✅ COMPLETE (See ADR-060)

**Summary:** Successfully refactored CommandExecutor from 724-line god object to 150-line thin orchestrator. All 10 actions now own their complete event lifecycle including error events.

#### Core Refactoring ✅ COMPLETE
- [x] Update Action interface documentation
  - [x] Clarified report() creates ALL events (success and error)
  - [x] Added validationResult and executionError parameters
- [x] Prototype validation error handling in report() with looking action
- [x] Refactor CommandExecutor to thin orchestrator (~150 lines)
  - [x] Created command-executor-refactored.ts
  - [x] Created command-executor-migration.ts for gradual rollout
- [x] Move event creation to appropriate components
  - [x] Actions create their own error events in report()
  - [x] CommandExecutor just orchestrates phases
- [x] Migrate all 10 actions to handle their own error events
  - [x] looking - prototype implementation
  - [x] examining - full error handling
  - [x] going, taking, dropping, opening, closing - batch updated
  - [x] putting, inserting, removing - batch updated

#### Test Updates (TODO)
- [ ] Update tests for new architecture (detailed below)
- [ ] Complete Phase 3.2 with proper design

#### Test Updates for New Architecture
Each action's tests need updating to handle the new event creation pattern where actions create their own error events in report():

- [ ] `looking.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test validation error events from report()
  - [ ] Test execution error events from report()
  - [ ] Verify backward compatibility maintained
- [ ] `examining.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test validation error events from report()
  - [ ] Test scope error events from report()
  - [ ] Verify backward compatibility maintained
- [ ] `going.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test blocked exit events from report()
  - [ ] Test dark room error events from report()
  - [ ] Verify backward compatibility maintained
- [ ] `taking.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test already carried events from report()
  - [ ] Test too heavy events from report()
  - [ ] Verify backward compatibility maintained
- [ ] `dropping.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test not carried events from report()
  - [ ] Test worn item events from report()
  - [ ] Verify backward compatibility maintained (15 tests)
- [ ] `opening.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test already open events from report()
  - [ ] Test locked events from report()
  - [ ] Verify backward compatibility maintained (12 tests)
- [ ] `closing.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test already closed events from report()
  - [ ] Test cannot close events from report()
  - [ ] Verify backward compatibility maintained (13 tests)
- [ ] `putting.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test container full events from report()
  - [ ] Test invalid target events from report()
  - [ ] Test self-containment events from report()
  - [ ] Verify backward compatibility maintained (27 tests)
- [ ] `inserting.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test delegation to putting.report()
  - [ ] Verify backward compatibility maintained (13 tests)
- [ ] `removing.ts` test updates
  - [ ] Remove CommandExecutor event creation expectations
  - [ ] Update tests to expect events from action.report()
  - [ ] Test not in container events from report()
  - [ ] Test fixed in place events from report()
  - [ ] Verify backward compatibility maintained (18 tests)

## Phase 4: Text Service Refactor

### 4.1 Remove World Model Dependencies
- [ ] Update `packages/text-services/src/standard-text-service.ts`
  - [ ] Remove `context.world` usage
  - [ ] Update `translateRoomDescription()`
  - [ ] Update `translateActionSuccess()`
  - [ ] Update `translateActionFailure()`
  - [ ] Update `translateGameMessage()`
  - [ ] Update `translateGameOver()`
  - [ ] Remove `getEntityName()` (use event data)
  - [ ] Remove `getEntityDescription()` (use event data)

### 4.2 Add Provider Support
- [ ] Detect function properties in event data
- [ ] Execute provider functions safely
- [ ] Handle errors in provider functions
- [ ] Test with dynamic descriptions

### 4.3 Testing
- [ ] Update text service tests
- [ ] Add provider function tests
- [ ] Test backward compatibility

## Phase 5: Story Updates

### 5.1 Cloak of Darkness
- [ ] Update `stories/cloak-of-darkness/src/index.ts`
  - [ ] Update bar entrance handler
  - [ ] Update hook placement handler
  - [ ] Update message read handler
  - [ ] Remove world queries from handlers
- [ ] Test complete game playthrough
- [ ] Test winning path
- [ ] Test losing path
- [ ] Test all commands

### 5.2 Documentation
- [ ] Update story authoring guide
- [ ] Document new event patterns
- [ ] Provide migration examples

## Phase 6: Engine Updates

### 6.1 Event Processing
- [ ] Update `packages/engine/src/event-adapter.ts`
  - [ ] Add event normalization
  - [ ] Handle legacy events
  - [ ] Add enrichment pipeline
- [ ] Update `packages/engine/src/game-engine.ts`
  - [ ] Handle new event structure
  - [ ] Maintain backward compatibility

### 6.2 Save/Load
- [ ] Handle function serialization
- [ ] Test save with new events
- [ ] Test load with new events
- [ ] Test historical replay accuracy

## Phase 7: Testing & Documentation

### 7.1 Test Updates
- [ ] Fix action test expectations for three-phase pattern
- [ ] Update text service tests
- [ ] Add historical accuracy tests
- [ ] Run full test suite

### 7.2 Integration Tests
- [ ] Test Cloak of Darkness end-to-end
- [ ] Test save/load functionality
- [ ] Test event replay
- [ ] Test backward compatibility

### 7.3 Documentation
- [ ] Update ADR-058 with implementation details
- [ ] Update architecture docs
- [ ] Update API documentation
- [ ] Write migration guide

## Phase 8: Cleanup

### 8.1 Remove Deprecated Code
- [ ] Remove unused world queries
- [ ] Remove compatibility shims (after migration)
- [ ] Clean up TODOs

### 8.2 Performance
- [ ] Measure event sizes
- [ ] Optimize common patterns
- [ ] Profile memory usage

### 8.3 Final Validation
- [ ] All tests pass
- [ ] Cloak of Darkness fully playable
- [ ] Save/load works correctly
- [ ] Historical replay accurate

## Completion Criteria

- [ ] Actions follow three-phase pattern (validate/execute/report)
- [ ] Text service has no world model dependencies
- [ ] Events are self-contained with all needed data
- [ ] Historical replay shows accurate past state
- [ ] No TypeScript double-casting needed
- [ ] All existing tests pass
- [ ] New historical accuracy tests pass
- [ ] Documentation updated (ADR-058)
- [ ] Migration guide complete

## Notes

- Keep backward compatibility during migration
- Test continuously during refactor
- Document patterns as they emerge
- Consider performance implications
- Get feedback early and often
- Implement looking.ts first as proof of concept
- Rules system postponed - focus on three-phase action pattern