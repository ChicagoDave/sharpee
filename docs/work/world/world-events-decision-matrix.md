# World Events Decision Matrix

> **UPDATE**: After further analysis, we've chosen a simpler approach. See [ADR-064](../../architecture/adrs/adr-064-world-events-and-action-events.md) for the final decision:
> - World keeps simple returns (boolean, entity)
> - World emits events for observation
> - Actions use ActionContext.sharedData for data passing
> - No MoveResult or complex return objects

## Quick Decision Guide (Historical)

### Current Situation
- Platform events exist for world operations (`platform.world.*`)
- Actions have context pollution issues
- Need rich context for text generation
- Want observability for debugging/witness system

## Three Approaches Compared

### Approach A: Return Values Only (Original ADR-064)
✅ **Pros:**
- Simple, no event overhead
- Direct return values for immediate use
- No event listener complexity
- Best performance

❌ **Cons:**
- No witness system integration
- No debugging visibility
- No event sourcing capability
- Can't observe from outside

**Best for:** Minimal implementation, performance critical

### Approach B: Events Only
✅ **Pros:**
- Complete observability
- Witness system ready
- Event sourcing possible
- Debugging paradise

❌ **Cons:**
- Performance overhead
- Must listen for events to get results
- Async complexity
- Memory usage

**Best for:** Maximum flexibility, debugging focus

### Approach C: Hybrid (Return + Emit) ⭐ RECOMMENDED
✅ **Pros:**
- Return values for immediate use (actions)
- Events for observation (witness, debug)
- Best of both worlds
- Gradual migration path

❌ **Cons:**
- Slight duplication
- More code initially
- Two patterns to maintain

**Best for:** Balanced approach, future-proof

## Feature Comparison

| Feature | Return Only | Events Only | Hybrid |
|---------|------------|-------------|---------|
| Action Integration | ✅ Easy | ⚠️ Complex | ✅ Easy |
| Witness System | ❌ No | ✅ Yes | ✅ Yes |
| Debugging | ❌ Limited | ✅ Full | ✅ Full |
| Performance | ✅ Best | ⚠️ Overhead | ✅ Good |
| Event Sourcing | ❌ No | ✅ Yes | ✅ Yes |
| Undo/Redo | ❌ No | ✅ Yes | ✅ Yes |
| Testing | ✅ Simple | ⚠️ Complex | ✅ Flexible |
| Migration Effort | ✅ Low | ❌ High | ⚠️ Medium |

## Recommended Implementation Plan (Hybrid)

### Phase 1: Core Infrastructure (Week 1)
```typescript
// Methods return rich results
const moveResult = world.moveEntity(itemId, actorId);

// AND emit events for observers
emit('world.entity.moved', {
  entity: moveResult.entity,
  from: moveResult.fromLocation,
  to: moveResult.toLocation
});
```

### Phase 2: Critical Operations (Week 1)
1. `moveEntity()` - return MoveResult + emit event
2. `createEntity()` - return entity + emit event
3. `removeEntity()` - return removed data + emit event
4. `setState()` - return old state + emit event

### Phase 3: Extended Operations (Week 2)
- Relationships
- Capabilities
- Scope rules
- Player changes

### Phase 4: Optional Debug Events (Future)
- Query operations (configurable)
- Validation checks (debug mode only)

## Code Example (Hybrid Approach)

### World Implementation
```typescript
class WorldModel {
  private currentTurn: number = 0;
  
  moveEntity(entityId: string, targetId: string | null): MoveResult {
    // Get current state
    const entity = this.getEntity(entityId);
    const fromLocation = this.getLocation(entityId);
    const fromRelation = this.getRelationType(entityId, fromLocation);
    
    // Perform move
    const success = this.spatialIndex.move(entityId, targetId);
    
    // Build result
    const result: MoveResult = {
      success,
      entity,
      fromLocation: fromLocation ? this.getEntity(fromLocation) : null,
      toLocation: targetId ? this.getEntity(targetId) : null,
      fromRelation,
      toRelation: targetId ? this.getRelationType(entityId, targetId) : null
    };
    
    // Emit SYNCHRONOUS event for observers (only on success)
    if (success) {
      this.emit('world.entity.moved', {
        ...result,
        timestamp: Date.now(),
        turn: this.currentTurn
      });
    }
    
    // Failed operations do NOT emit events
    
    return result;
  }
}
```

### Action Usage
```typescript
// Actions use return value directly
execute(context: ActionContext): SemanticEvent[] {
  const moveResult = context.world.moveEntity(item.id, actor.id);
  
  if (moveResult.success) {
    return [{
      type: 'if.event.taken',
      data: {
        actor,
        item: moveResult.entity,
        from: moveResult.fromLocation
      }
    }];
  }
}
```

### Witness System
```typescript
// Witnesses subscribe to events
world.on('world.entity.moved', (event) => {
  const witnesses = this.getWitnesses(event.from, event.to);
  witnesses.forEach(w => this.recordObservation(w, event));
});
```

## Migration Steps

### Week 1
1. ✅ Add IWorldEvent interface
2. ✅ Add event emitter to WorldModel
3. ✅ Implement moveEntity() with return + emit
4. ✅ Update taking action to use return value
5. ✅ Remove platform.world.entity_moved

### Week 2
6. ⬜ Add other entity operations
7. ⬜ Add state operations
8. ⬜ Update witness system to use events
9. ⬜ Remove remaining platform.world.* events

### Week 3
10. ⬜ Add relationship events
11. ⬜ Add capability events
12. ⬜ Add debug configuration
13. ⬜ Documentation and examples

## Configuration Options

```typescript
const worldConfig = {
  events: {
    // Always emit these (core functionality)
    emit: {
      entityLifecycle: true,  // create, remove
      entityMovement: true,   // move  
      stateChanges: true,     // setState
      relationships: true,    // add/remove relationships
    },
    
    // NEVER emit these (based on decisions)
    // - Query operations (getVisible, findByTrait)
    // - Failed operations (moveEntity returns false)
    // - Validation checks (canMoveEntity)
    
    // Debug options
    debug: {
      logToConsole: false,    // Log all events to console
    },
    
    // All events are SYNCHRONOUS (no async complexity)
    // No batching for now (keep it simple)
  }
};
```

## Decision Factors

### Choose Return Only if:
- Performance is critical
- Don't need witness system
- Don't need debugging events
- Want simplest implementation

### Choose Events Only if:
- Event sourcing is required
- Witness system is primary concern
- Need complete audit trail
- Can handle async complexity

### Choose Hybrid if:
- Want flexibility ⭐
- Need both patterns ⭐
- Planning for future features ⭐
- Want gradual migration ⭐

## Final Recommendation

**Go with Hybrid Approach because:**
1. Actions get immediate results (no breaking changes)
2. Witness system gets events (future feature)
3. Debugging gets visibility (development aid)
4. Can disable events in production (performance)
5. Future-proof for event sourcing, undo/redo
6. Clean migration path from platform events

## Next Steps

1. **Get buy-in on Hybrid approach**
2. **Start with moveEntity() as proof of concept**
3. **Test with taking action**
4. **Measure performance impact**
5. **Roll out to other operations**