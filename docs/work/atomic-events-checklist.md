# Atomic Events Refactor Checklist

## Phase 1: Core Interface Updates
- [ ] Update `packages/core/src/events/types.ts`
  - [ ] Change `data?: Record<string, unknown>` to `data?: any`
  - [ ] Add deprecation comments for `payload` and `metadata`
  - [ ] Update interface documentation
- [ ] Create `packages/core/src/events/builders/` directory
  - [ ] Create `EventBuilder.ts` base class
  - [ ] Create `RoomDescriptionEventBuilder.ts`
  - [ ] Create `ActionEventBuilder.ts`
  - [ ] Create `EntitySnapshotBuilder.ts`
- [ ] Run core package tests
- [ ] Build core package

## Phase 2: Standard Library Actions

### 2.1 Base Updates
- [ ] Update `packages/stdlib/src/actions/base/action-base.ts`
  - [ ] Add `enrichEvent()` helper
  - [ ] Add `captureEntitySnapshot()` helper
  - [ ] Add `getEntityDescription()` helper

### 2.2 Action Migrations
- [ ] `looking.ts`
  - [ ] Capture room data at event time
  - [ ] Include room name and description
  - [ ] Add darkness state
  - [ ] Include contents list with descriptions
  - [ ] Test looking in all room types
- [ ] `examining.ts`
  - [ ] Capture entity description
  - [ ] Handle readable items
  - [ ] Handle wearable items
  - [ ] Test all entity types
- [ ] `going.ts`
  - [ ] Capture source room data
  - [ ] Capture destination room data
  - [ ] Include exit information
  - [ ] Test all directions
- [ ] `taking.ts`
  - [ ] Capture item description
  - [ ] Include container context
  - [ ] Test taking from containers
- [ ] `dropping.ts`
  - [ ] Capture item description
  - [ ] Include location context
  - [ ] Test dropping in various locations
- [ ] `opening.ts`
  - [ ] Capture container/door state
  - [ ] Include before/after states
  - [ ] Test locked/unlocked scenarios
- [ ] `closing.ts`
  - [ ] Capture container/door state
  - [ ] Include before/after states
  - [ ] Test various closeable items
- [ ] `putting.ts`
  - [ ] Capture item and surface descriptions
  - [ ] Include spatial relationships
  - [ ] Test putting on supporters
- [ ] `inserting.ts`
  - [ ] Capture item and container descriptions
  - [ ] Include capacity information
  - [ ] Test container limits
- [ ] `removing.ts`
  - [ ] Capture item and container descriptions
  - [ ] Include removal context
  - [ ] Test removing from containers

### 2.3 Validation Updates
- [ ] Update validation error events to include entity data
- [ ] Update scope validation events
- [ ] Test validation with new event structure

## Phase 3: Text Service Refactor

### 3.1 Remove World Model Dependencies
- [ ] Update `packages/text-services/src/standard-text-service.ts`
  - [ ] Remove `context.world` usage
  - [ ] Update `translateRoomDescription()`
  - [ ] Update `translateActionSuccess()`
  - [ ] Update `translateActionFailure()`
  - [ ] Update `translateGameMessage()`
  - [ ] Update `translateGameOver()`
  - [ ] Remove `getEntityName()` (use event data)
  - [ ] Remove `getEntityDescription()` (use event data)

### 3.2 Add Provider Support
- [ ] Detect function properties in event data
- [ ] Execute provider functions safely
- [ ] Handle errors in provider functions
- [ ] Test with dynamic descriptions

### 3.3 Testing
- [ ] Update text service tests
- [ ] Add provider function tests
- [ ] Test backward compatibility

## Phase 4: Story Updates

### 4.1 Cloak of Darkness
- [ ] Update `stories/cloak-of-darkness/src/index.ts`
  - [ ] Update bar entrance handler
  - [ ] Update hook placement handler
  - [ ] Update message read handler
  - [ ] Remove world queries from handlers
- [ ] Test complete game playthrough
- [ ] Test winning path
- [ ] Test losing path
- [ ] Test all commands

### 4.2 Documentation
- [ ] Update story authoring guide
- [ ] Document new event patterns
- [ ] Provide migration examples

## Phase 5: Engine Updates

### 5.1 Event Processing
- [ ] Update `packages/engine/src/event-adapter.ts`
  - [ ] Add event normalization
  - [ ] Handle legacy events
  - [ ] Add enrichment pipeline
- [ ] Update `packages/engine/src/game-engine.ts`
  - [ ] Handle new event structure
  - [ ] Maintain backward compatibility

### 5.2 Save/Load
- [ ] Handle function serialization
- [ ] Test save with new events
- [ ] Test load with new events
- [ ] Test historical replay accuracy

## Phase 6: Testing & Documentation

### 6.1 Test Updates
- [ ] Fix action test expectations
- [ ] Update text service tests
- [ ] Add historical accuracy tests
- [ ] Run full test suite

### 6.2 Integration Tests
- [ ] Test Cloak of Darkness end-to-end
- [ ] Test save/load functionality
- [ ] Test event replay
- [ ] Test backward compatibility

### 6.3 Documentation
- [ ] Update ADRs with decision
- [ ] Update architecture docs
- [ ] Update API documentation
- [ ] Write migration guide

## Phase 7: Cleanup

### 7.1 Remove Deprecated Code
- [ ] Remove unused world queries
- [ ] Remove compatibility shims (after migration)
- [ ] Clean up TODOs

### 7.2 Performance
- [ ] Measure event sizes
- [ ] Optimize common patterns
- [ ] Profile memory usage

### 7.3 Final Validation
- [ ] All tests pass
- [ ] Cloak of Darkness fully playable
- [ ] Save/load works correctly
- [ ] Historical replay accurate

## Completion Criteria

- [ ] Text service has no world model dependencies
- [ ] Events are self-contained with all needed data
- [ ] Historical replay shows accurate past state
- [ ] No TypeScript double-casting needed
- [ ] All existing tests pass
- [ ] New historical accuracy tests pass
- [ ] Documentation updated
- [ ] Migration guide complete

## Notes

- Keep backward compatibility during migration
- Test continuously during refactor
- Document patterns as they emerge
- Consider performance implications
- Get feedback early and often