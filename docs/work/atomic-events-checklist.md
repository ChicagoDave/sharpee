# Atomic Events Refactor Checklist

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

### 3.2 Validation Updates (BLOCKED - Pending 3.5)
- [ ] Update validation error events to include entity data
- [ ] Update scope validation events  
- [ ] Test validation with new event structure

*Note: Phase 3.2 revealed that CommandExecutor has become a god object. Proper validation event handling requires the refactor in Phase 3.5.*

### 3.5 CommandExecutor Refactor (NEW - See ADR-060)
- [ ] Update Action interface documentation
- [ ] Prototype validation error handling in report() with one action
- [ ] Refactor CommandExecutor to thin orchestrator (~100 lines)
- [ ] Move event creation to appropriate components
- [ ] Migrate all actions to handle their own error events
- [ ] Update tests for new architecture
- [ ] Complete Phase 3.2 with proper design

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