# World Events Implementation Checklist

## Context
This implementation follows the final approach from [ADR-064](../../architecture/adrs/adr-064-world-events-and-action-events.md):
- World mutations keep simple returns (boolean, entity)
- World mutations emit events for observation
- Actions use ActionContext.sharedData for data passing
- No complex result objects (no MoveResult)
- Replaces platform.world.* events
- Platform events remain only for save/restore/quit/restart operations

## Prerequisites ⬜

### ActionContext.sharedData
- [ ] Complete ActionContext update first
- [ ] See: `/docs/work/stdlib/update-actioncontext-checklist.md`
- [ ] Verify sharedData is working in a test action

## Phase 1: Core Infrastructure ⬜

### Types and Interfaces
- [ ] Create `IWorldEvent` interface
  - [ ] Base event structure
  - [ ] Include turn and timestamp fields
  - [ ] Event type discriminator
  - [ ] Metadata fields
- [ ] Create world event type constants
  - [ ] `world.entity.moved`
  - [ ] `world.entity.created`
  - [ ] `world.entity.removed`
  - [ ] Others as needed
- [ ] World interface remains unchanged
  - [ ] moveEntity() stays as boolean return
  - [ ] createEntity() stays as entity return
  - [ ] removeEntity() stays as boolean return

### Testing Setup
- [ ] Create test file for world events
- [ ] Set up test fixtures
- [ ] Create test utilities

## Phase 2: World Event Implementation ⬜

### Event Infrastructure
- [ ] Add event emitter to WorldModel
- [ ] Create emit method for world events
- [ ] Set up event typing
- [ ] Add turn tracking to world

### World.moveEntity() Updates
- [ ] Keep method signature returning boolean (no changes)
- [ ] Before move, capture context for event
  - [ ] Query current location
  - [ ] Determine current relation type (in/on/carried/worn)
  - [ ] Store locally for event emission
- [ ] Perform move logic (unchanged)
  - [ ] Execute actual movement
  - [ ] Track success/failure
- [ ] Emit world.entity.moved event (only on success)
  - [ ] Include entity id
  - [ ] Include from/to locations
  - [ ] Include from/to relations
  - [ ] Add timestamp and turn
  - [ ] NO event emission for failed moves

### Container/Supporter Logic
- [ ] Handle container relations ('in')
- [ ] Handle supporter relations ('on')
- [ ] Handle carrying relations ('carried')
- [ ] Handle wearing relations ('worn')
- [ ] Handle room relations (null or special case)

### Edge Cases
- [ ] Handle entity not found
- [ ] Handle null destinations (dropping)
- [ ] Handle already at destination
- [ ] Handle invalid relations

## Phase 3: Platform Event Cleanup ⬜

### Remove Platform Event Emissions
- [ ] Remove emitPlatformEvent() method from WorldModel
- [ ] Remove platform.world.entity_moved emissions
- [ ] Remove platform.world.move_entity_failed emissions
- [ ] Remove platform.world.scope_rule_added emissions
- [ ] Remove platform.world.scope_rule_removed emissions

### Update Event Listeners
- [ ] Find all listeners for platform.world.* events
- [ ] Update them to use return values instead
- [ ] Remove unnecessary event handling code

### Verify Platform Events Scope
- [ ] Confirm platform events only used for:
  - [ ] Save operations
  - [ ] Restore operations
  - [ ] Quit operations
  - [ ] Restart operations
- [ ] No world state changes emit platform events

## Phase 4: Taking Action Integration ⬜

### Prerequisites
- [ ] Verify ActionContext.sharedData is available
- [ ] Verify world events are being emitted

### Remove Context Pollution
- [ ] Remove `(context as any)._previousLocation`
- [ ] Remove `(context as any)._implicitlyRemoved`
- [ ] Remove any other `(context as any)._*` patterns

### Update Execute Phase
- [ ] Capture context before mutations
  - [ ] `context.sharedData.previousLocation = context.world.getLocation(item.id)`
  - [ ] `context.sharedData.wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn`
- [ ] Perform mutations (unchanged)
- [ ] No return value needed (void)

### Update Report Phase
- [ ] Access sharedData instead of context pollution
  - [ ] `const { previousLocation, wasWorn } = context.sharedData`
- [ ] Build rich events from sharedData
- [ ] Test all scenarios

### Semantic Event Building
- [ ] Create if.event.taken with rich data
  - [ ] Include fromLocation if present
  - [ ] Include fromRelation if present
  - [ ] Set proper event structure
- [ ] Create if.event.removed if needed
  - [ ] Check if item was worn
  - [ ] Emit additional semantic event

### Testing
- [ ] Test all scenarios from design doc
- [ ] Verify no context pollution
- [ ] Verify rich events emitted
- [ ] Check backward compatibility

## Phase 5: Rollout to Other Actions ⬜

### Removing Action
- [ ] Analyze current implementation
- [ ] Remove context pollution
- [ ] Use MoveResult
- [ ] Update tests

### Dropping Action
- [ ] Analyze current implementation
- [ ] Remove context pollution
- [ ] Use MoveResult
- [ ] Update tests

### Putting Action
- [ ] Analyze current implementation
- [ ] Remove context pollution
- [ ] Use MoveResult
- [ ] Update tests

### Inserting Action
- [ ] Analyze current implementation
- [ ] Remove context pollution
- [ ] Use MoveResult
- [ ] Update tests

### Other Movement Actions
- [ ] List all affected actions
- [ ] Create migration plan
- [ ] Update systematically

## Validation and Testing ⬜

### Unit Tests
- [ ] Test MoveResult population
- [ ] Test event emission
- [ ] Test failure cases
- [ ] Test edge cases

### Integration Tests
- [ ] Test action integration
- [ ] Test event flow
- [ ] Test text generation
- [ ] Test witness system

### Scenario Tests
- [ ] Run all taking scenarios
- [ ] Run removing scenarios
- [ ] Run complex multi-step scenarios
- [ ] Verify event sequences

## Documentation ⬜

### Code Documentation
- [ ] Document all new interfaces
- [ ] Document method changes
- [ ] Add examples in comments

### ADR Updates
- [ ] Update ADR-064 if needed
- [ ] Reference implementation

### Migration Guide
- [ ] Document how to update actions
- [ ] Provide examples
- [ ] List common pitfalls

## Cleanup ⬜

### Remove Old Code
- [ ] Remove deprecated context fields
- [ ] Remove workaround code
- [ ] Clean up comments

### Refactor Opportunities
- [ ] Identify similar patterns
- [ ] Extract common utilities
- [ ] Improve type safety

## Sign-off ⬜

### Code Review
- [ ] Self-review all changes
- [ ] Check for consistency
- [ ] Verify no regressions

### Performance Check
- [ ] Profile event emission
- [ ] Check memory usage
- [ ] Verify no bottlenecks

### Final Validation
- [ ] All tests passing
- [ ] No type errors
- [ ] No lint warnings
- [ ] Documentation complete

---

## Notes

- Start with Phase 1 and complete fully before moving on
- Test each phase independently
- Keep backward compatibility until full migration
- Document decisions and trade-offs as you go