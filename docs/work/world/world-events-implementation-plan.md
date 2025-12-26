# World Events Implementation Plan

## Overview
Implement the world events layer as specified in ADR-064 to enable observation of world state changes. This will replace the current platform.world.* events with proper world.* events.

## Related Documents
- **[Comprehensive Design](./world-events-comprehensive-design.md)** - Full analysis of all IWorldModel operations
- **[Decision Matrix](./world-events-decision-matrix.md)** - Comparison of approaches
- **[Implementation Checklist](./world-events-implementation-checklist.md)** - Detailed task list
- **[ADR-064](../../architecture/adrs/adr-064-world-events-and-action-events.md)** - Final decision with ActionContext.sharedData

## Current State
Platform events are currently used for two distinct purposes:
1. **World state changes** (platform.world.*) - entity movements, scope changes, etc.
2. **Platform operations** (platform.save_requested, etc.) - save/restore/quit/restart

## Final Approach: Simple Returns + Events + SharedData
After analysis and discussion, the final approach is:
- World methods keep simple return types (boolean, entity)
- World emits events for observation (witness, debugging)
- Actions use ActionContext.sharedData for passing data between phases
- No complex MoveResult or other result objects

## Goals
1. Enable observation of world state changes via events
2. Eliminate context pollution via ActionContext.sharedData
3. Provide foundation for witness system and debugging
4. Keep world API simple and unchanged

## Implementation Phases

### Phase 1: Core Infrastructure
**Objective**: Create base types and interfaces for world events

1. Define MoveResult interface
2. Define other mutation result types (future)
3. Create world event types and structure
4. Update World interface signatures

### Phase 2: Movement Implementation  
**Objective**: Implement moveEntity() with rich returns

1. Update world.moveEntity() signature
2. Implement MoveResult population logic
3. Track previous location automatically
4. Handle container/supporter/room contexts

### Phase 3: Platform Event Migration
**Objective**: Replace platform.world.* events with world events

1. Remove emitPlatformEvent() calls from WorldModel
2. Replace with MoveResult returns
3. Update any listeners for platform.world.* events
4. Keep platform events only for save/restore/quit/restart

### Phase 4: Action Integration
**Objective**: Update actions to use world events

1. Update taking action to use MoveResult
2. Remove context pollution from taking
3. Build semantic events from world data
4. Test with scenarios

### Phase 5: Rollout
**Objective**: Apply pattern to other actions

1. Update removing action
2. Update dropping action  
3. Update putting action
4. Update other movement-related actions

## Key Design Decisions

### World API Remains Simple
World mutations keep their current simple interface:
- `moveEntity()` returns `boolean` (success/failure)
- `createEntity()` returns the created entity
- `removeEntity()` returns `boolean`
- No complex result objects (no MoveResult)

### Actions Use SharedData
Actions capture context BEFORE mutations and store in sharedData:
```typescript
// In execute(): Capture and store
context.sharedData.previousLocation = context.world.getLocation(item.id);
context.sharedData.wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn;

// Perform mutation
const success = context.world.moveEntity(item.id, actor.id);

// In report(): Access shared data
const { previousLocation, wasWorn } = context.sharedData;
if (wasWorn) {
  // Emit removed event
}
```

### IWorldEvent Structure
```typescript
interface IWorldEvent {
  id: string;
  type: string;                  // 'world.entity.moved', etc.
  timestamp: number;             // milliseconds
  turn: number;                  // game turn for ordering
  source: 'world';
  operation: string;             // method name
  data: Record<string, any>;     // event-specific data
}
```

### Platform Event Cleanup
Currently emitted platform.world.* events to remove:
- `platform.world.entity_moved` 
- `platform.world.move_entity_failed`
- `platform.world.scope_rule_added`
- `platform.world.scope_rule_removed`

These will be replaced by:
- MoveResult return values from moveEntity()
- Direct return values from scope operations
- No event emission needed (callers get context directly)

### Event Flow
1. **Execute phase**: Action captures context before mutation
2. **Execute phase**: Action stores context in sharedData
3. **Execute phase**: Action calls world.moveEntity()
4. World performs mutation
5. World returns boolean (simple success/failure)
6. World emits world.entity.moved event (for observers)
7. **Report phase**: Action reads from sharedData
8. **Report phase**: Action emits semantic events (if.event.taken, etc.)
9. Witness system observes world.entity.moved event

Benefits:
- No complex return types (no MoveResult)
- Clean data passing via sharedData
- World keeps simple interface
- Witnesses observe world changes
- No context pollution

## Implementation Priorities

### Phase 1: ActionContext.sharedData (Prerequisite)
- Add sharedData property to ActionContext interface
- Initialize in createActionContext factory
- See: `/docs/work/stdlib/update-actioncontext-plan.md`

### Phase 2: World Event Infrastructure
- Add event emitter to WorldModel
- Define IWorldEvent interface
- Add event emission to moveEntity() (keeps boolean return)
- Add event emission to createEntity() (keeps entity return)
- Add event emission to removeEntity() (keeps boolean return)
- Remove platform.world.* events

### Phase 3: Taking Action Migration
- Update taking action to use sharedData
- Remove context pollution
- Test with scenarios

### Phase 2: Extended Operations
- State change events (setState, setStateValue)
- Relationship events (add/remove relationships)
- Player change events (setPlayer)
- All movement actions updated

### Phase 3: Advanced Features
- Witness system integration
- Event sourcing support
- Debug event configuration
- Query operation events (optional)
- Event batching for performance

## Risk Mitigation

### Risk: Breaking Changes
**Mitigation**: Implement alongside existing code, migrate gradually

### Risk: Performance Impact
**Mitigation**: Keep events lightweight, consider batching

### Risk: Complexity
**Mitigation**: Start simple with movement, expand carefully

## Success Criteria

1. Taking action works without context pollution
2. Events contain sufficient context for rich text
3. Pattern is clear and reproducible
4. No regression in functionality
5. Tests pass with new implementation
6. All events have turn and timestamp for ordering
7. Events are synchronous (no async complexity)
8. No events emitted for queries or failed operations

## Dependencies

- World model package (primary changes)
- Stdlib actions (consumers)
- Engine (event routing)
- Text services (event consumers)

## Timeline Estimate

- Phase 1: 1-2 hours (types and interfaces)
- Phase 2: 2-3 hours (moveEntity implementation)
- Phase 3: 1-2 hours (event emission)
- Phase 4: 2-3 hours (taking action integration)
- Phase 5: 4-6 hours (other actions)

**Total**: 10-16 hours for complete implementation

## Open Questions

1. Should all world mutations return results or just movement?
2. How to handle backward compatibility during migration?
3. Should world events be synchronous or allow async?
4. Naming convention for world events vs action events?

## References

- ADR-064: World Events and Action Events
- Taking action refactor plan
- Current context pollution examples