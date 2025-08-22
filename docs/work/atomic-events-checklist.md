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

## Phase 2: Action Architecture Redesign (ADR-058)

### 2.1 Update Action Interface
- [ ] Update `packages/stdlib/src/actions/types.ts`
  - [ ] Add `report()` method to Action interface
  - [ ] Update `execute()` signature to return void
  - [ ] Document three-phase pattern
  - [ ] Add migration notes

### 2.2 Update CommandExecutor
- [ ] Update `packages/engine/src/command-executor.ts`
  - [ ] Implement new execution flow
  - [ ] Call validate → execute → report sequence
  - [ ] Add hooks for before/after rules
  - [ ] Maintain backward compatibility
  - [ ] Add debug logging for phases

### 2.3 Create Helper Utilities
- [ ] Create `packages/stdlib/src/actions/base/snapshot-utils.ts`
  - [ ] Add `captureEntitySnapshot()` function
  - [ ] Add `captureRoomSnapshot()` function
  - [ ] Add `captureContainerContents()` function
- [ ] Create migration shim for unmigrated actions
  - [ ] Detect actions without `report()` method
  - [ ] Call old `execute()` for backward compatibility

## Phase 3: Rules System Implementation (ADR-057)

### 3.1 Define Rule Interfaces
- [ ] Create `packages/core/src/rules/types.ts`
  - [ ] Define `Rule` interface
  - [ ] Define `RuleContext` interface
  - [ ] Define `RuleResult` interface
  - [ ] Define `RuleGroup` interface
  - [ ] Add JSDoc documentation

### 3.2 Implement Rule Engine
- [ ] Create `packages/engine/src/rules/rule-engine.ts`
  - [ ] Implement `RuleEngine` class
  - [ ] Add `executeBeforeRules()` method
  - [ ] Add `executeAfterRules()` method
  - [ ] Handle rule ordering and groups
  - [ ] Support conditional enabling
  - [ ] Add debugging/tracing

### 3.3 Integrate with CommandExecutor
- [ ] Update CommandExecutor to use RuleEngine
  - [ ] Create RuleContext from action context
  - [ ] Call before rules before validation
  - [ ] Call after rules after execution
  - [ ] Handle rule prevention
  - [ ] Collect rule-generated events

## Phase 4: Migrate Standard Library Actions

### 4.1 Action Migrations (Three-Phase Pattern)
- [ ] `looking.ts` (Proof of Concept)
  - [ ] Split execute() into execute/report
  - [ ] Execute: minimal state changes only
  - [ ] Report: capture room data (name, description, id)
  - [ ] Report: embed darkness state
  - [ ] Report: embed entity snapshots for contents
  - [ ] Test with before/after rules
  - [ ] Test in all room types
- [ ] `examining.ts`
  - [ ] Split execute() into execute/report
  - [ ] Report: capture entity description
  - [ ] Report: handle readable items
  - [ ] Report: handle wearable items
  - [ ] Test all entity types
- [ ] `going.ts`
  - [ ] Split execute() into execute/report
  - [ ] Execute: perform movement only
  - [ ] Report: capture source room data
  - [ ] Report: capture destination room data
  - [ ] Report: include exit information
  - [ ] Test all directions
- [ ] `taking.ts`
  - [ ] Split execute() into execute/report
  - [ ] Execute: transfer item only
  - [ ] Report: capture item description
  - [ ] Report: include container context
  - [ ] Test taking from containers
- [ ] `dropping.ts`
  - [ ] Split execute() into execute/report
  - [ ] Execute: transfer item only
  - [ ] Report: capture item description
  - [ ] Report: include location context
  - [ ] Test dropping in various locations
- [ ] `opening.ts`
  - [ ] Split execute() into execute/report
  - [ ] Execute: change state only
  - [ ] Report: capture container/door state
  - [ ] Report: include before/after states
  - [ ] Test locked/unlocked scenarios
- [ ] `closing.ts`
  - [ ] Split execute() into execute/report
  - [ ] Execute: change state only
  - [ ] Report: capture container/door state
  - [ ] Report: include before/after states
  - [ ] Test various closeable items
- [ ] Other actions (follow same pattern)
  - [ ] `putting.ts`
  - [ ] `inserting.ts`
  - [ ] `removing.ts`

### 4.2 Validation Updates
- [ ] Update validation error events to include entity data
- [ ] Update scope validation events
- [ ] Test validation with new event structure

## Phase 5: Text Service Refactor

### 5.1 Remove World Model Dependencies
- [ ] Update `packages/text-services/src/standard-text-service.ts`
  - [ ] Remove `context.world` usage
  - [ ] Update `translateRoomDescription()`
  - [ ] Update `translateActionSuccess()`
  - [ ] Update `translateActionFailure()`
  - [ ] Update `translateGameMessage()`
  - [ ] Update `translateGameOver()`
  - [ ] Remove `getEntityName()` (use event data)
  - [ ] Remove `getEntityDescription()` (use event data)

### 5.2 Add Provider Support
- [ ] Detect function properties in event data
- [ ] Execute provider functions safely
- [ ] Handle errors in provider functions
- [ ] Test with dynamic descriptions

### 5.3 Testing
- [ ] Update text service tests
- [ ] Add provider function tests
- [ ] Test backward compatibility

## Phase 6: Story Updates

### 6.1 Cloak of Darkness
- [ ] Update `stories/cloak-of-darkness/src/index.ts`
  - [ ] Update bar entrance handler
  - [ ] Update hook placement handler
  - [ ] Update message read handler
  - [ ] Remove world queries from handlers
- [ ] Add example rules for story logic
  - [ ] Auto-drop cloak rule
  - [ ] Disturbance counter rule
  - [ ] Victory condition rule
- [ ] Test complete game playthrough
- [ ] Test winning path
- [ ] Test losing path
- [ ] Test all commands

### 6.2 Documentation
- [ ] Update story authoring guide
- [ ] Document new event patterns
- [ ] Document rules system usage
- [ ] Provide migration examples

## Phase 7: Engine Updates

### 7.1 Event Processing
- [ ] Update `packages/engine/src/event-adapter.ts`
  - [ ] Add event normalization
  - [ ] Handle legacy events
  - [ ] Add enrichment pipeline
- [ ] Update `packages/engine/src/game-engine.ts`
  - [ ] Handle new event structure
  - [ ] Integrate rule engine
  - [ ] Maintain backward compatibility

### 7.2 Save/Load
- [ ] Handle function serialization
- [ ] Test save with new events
- [ ] Test load with new events
- [ ] Test historical replay accuracy

## Phase 8: Testing & Documentation

### 8.1 Test Updates
- [ ] Fix action test expectations for three-phase pattern
- [ ] Update text service tests
- [ ] Add rule system tests
- [ ] Add historical accuracy tests
- [ ] Run full test suite

### 8.2 Integration Tests
- [ ] Test Cloak of Darkness end-to-end
- [ ] Test save/load functionality
- [ ] Test event replay
- [ ] Test rule execution
- [ ] Test backward compatibility

### 8.3 Documentation
- [ ] Update ADR-057 with implementation details
- [ ] Update ADR-058 with implementation details
- [ ] Update architecture docs
- [ ] Update API documentation
- [ ] Write migration guide

## Phase 9: Cleanup

### 9.1 Remove Deprecated Code
- [ ] Remove unused world queries
- [ ] Remove compatibility shims (after migration)
- [ ] Clean up TODOs

### 9.2 Performance
- [ ] Measure event sizes
- [ ] Optimize common patterns
- [ ] Profile memory usage

### 9.3 Final Validation
- [ ] All tests pass
- [ ] Cloak of Darkness fully playable
- [ ] Save/load works correctly
- [ ] Historical replay accurate
- [ ] Rules system working correctly

## Completion Criteria

- [ ] Actions follow three-phase pattern (validate/execute/report)
- [ ] Rules system implemented and integrated
- [ ] Text service has no world model dependencies
- [ ] Events are self-contained with all needed data
- [ ] Historical replay shows accurate past state
- [ ] No TypeScript double-casting needed
- [ ] All existing tests pass
- [ ] New rule system tests pass
- [ ] New historical accuracy tests pass
- [ ] Documentation updated (ADR-057, ADR-058)
- [ ] Migration guide complete

## Notes

- Keep backward compatibility during migration
- Test continuously during refactor
- Document patterns as they emerge
- Consider performance implications
- Get feedback early and often
- Implement looking.ts first as proof of concept
- Test rules with Cloak of Darkness story