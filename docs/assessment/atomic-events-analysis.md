# Atomic Events vs Reference-Based Events Analysis

## Current Architecture (Reference-Based)

Events contain entity IDs, consumers query world model for details:

```typescript
// Event contains ID
event = {
  type: 'if.event.room_description',
  data: {
    roomId: 'r01',
    verbose: true
  }
}

// Text service queries world
const room = world.getEntity(data.roomId);
const description = room.get('identity').description;
```

## Alternative Architecture (Atomic Events)

Events contain all necessary data:

```typescript
// Event contains everything needed
event = {
  type: 'if.event.room_description',
  data: {
    roomId: 'r01',
    roomName: 'Foyer of the Opera House',
    roomDescription: 'You are standing in a spacious hall...',
    verbose: true
  }
}

// Text service just formats
const description = data.roomDescription;
```

## Pros of Atomic Events

### 1. **True Event Sourcing**
- Events are complete historical records
- Can replay events without needing world state
- Events become the source of truth

### 2. **Simplified Text Service**
- Becomes pure translation layer (event → narrative)
- No world model dependency
- Easier to test (no mocks needed)
- Type safety is straightforward

### 3. **Better Debugging**
- Event logs show complete information
- No need to correlate with world state
- Self-documenting events

### 4. **Decoupling**
- Text service doesn't need to know about world model
- Events can be processed by external systems
- Better separation of concerns

### 5. **Performance**
- No additional queries during text generation
- Events can be cached with their full data
- Parallel processing possible

## Cons of Atomic Events

### 1. **Data Duplication**
- Same description might appear in multiple events
- Larger event payloads
- More memory/storage usage

### 2. **Consistency Challenges**
- If entity description changes, old events have stale data
- Dynamic descriptions become complex
- State-dependent text harder to manage

### 3. **Event Creation Complexity**
- Actions must gather all relevant data
- More work at event creation time
- Actions need world model access for enrichment

### 4. **Refactoring Scope**
- Every action needs updating
- All event handlers need changes
- Story event handlers must be rewritten

### 5. **Loss of Dynamism**
- Can't have descriptions that change based on game state
- Harder to implement "perception" systems
- NPCs can't have dynamic reactions

## Hybrid Approaches

### Option 1: Enrichment Layer
```typescript
// Raw event from action
rawEvent = { type: 'room.entered', data: { roomId: 'r01' } }

// Enrichment service adds data
enrichedEvent = enrichmentService.enrich(rawEvent);
// Returns: { ...rawEvent, data: { roomId: 'r01', name: '...', description: '...' } }

// Text service receives enriched event
textService.process(enrichedEvent);
```

### Option 2: Event Builders
```typescript
// Actions use builders that handle enrichment
const event = new RoomDescriptionEvent()
  .forRoom(roomId)
  .withVerbose(true)
  .build(world); // Builder queries world

// Event is atomic when emitted
```

### Option 3: Lazy Evaluation
```typescript
// Event carries both ID and getter functions
event = {
  type: 'room.description',
  data: {
    roomId: 'r01',
    getRoomName: () => world.getEntity('r01').name,
    getRoomDescription: () => world.getEntity('r01').description
  }
}
```

## Analysis by Component

### What Changes With Atomic Events

| Component | Current (Reference) | Atomic | Impact |
|-----------|-------------------|---------|---------|
| **Actions** | Emit simple events with IDs | Must gather all data | HIGH - All actions need rewrite |
| **Text Service** | Queries world model | Pure formatting | MEDIUM - Simpler but different |
| **Events** | Small, ID-based | Large, self-contained | HIGH - New event schemas |
| **Stories** | Event handlers get IDs | Event handlers get full data | MEDIUM - Handler updates |
| **World Model** | Queried by text service | Queried by actions | LOW - Same queries, different place |
| **Testing** | Need world mocks | Just test data transformation | POSITIVE - Much simpler |

## Specific Examples

### Looking Action
```typescript
// CURRENT
events.push({
  type: 'if.event.room_description',
  data: { roomId: location.id, verbose: true }
});

// ATOMIC
const room = world.getEntity(location.id);
const identity = room.get('identity');
events.push({
  type: 'if.event.room_description',
  data: {
    roomId: location.id,
    roomName: identity.name,
    roomDescription: identity.description,
    verbose: true
  }
});
```

### Text Service
```typescript
// CURRENT
private translateRoomDescription(event: ISemanticEvent): string {
  const data = event.data as RoomDescriptionData;
  const room = this.context.world.getEntity(data.roomId);
  const identity = room.get('identity');
  return identity.description;
}

// ATOMIC
private translateRoomDescription(event: ISemanticEvent): string {
  const data = event.data as RoomDescriptionData;
  return data.roomDescription; // Just use the data
}
```

## Philosophical Considerations

### Event Sourcing Philosophy
True event sourcing suggests events should be complete records of what happened, not references to mutable state. Atomic events align better with this philosophy.

### Interactive Fiction Needs
IF often has dynamic descriptions based on game state:
- "The room is dark" vs "The room is well-lit"
- "The wizard looks angry" vs "The wizard smiles at you"

Reference-based events allow this dynamism more easily.

### Testing Philosophy
Atomic events make testing much simpler - you test pure functions that transform data. Reference-based events require complex mocking.

## Recommendation

### Short Term (Fix current issues)
1. Fix the type system (`data: any`)
2. Keep reference-based for now
3. Document the pattern clearly

### Long Term (Consider for v2)
Consider a **Hybrid Enrichment Layer**:

1. Actions emit simple reference events
2. Enrichment service (before text service) adds data
3. Text service receives enriched atomic events
4. Best of both worlds:
   - Actions stay simple
   - Events can be enriched with current state
   - Text service is pure transformation
   - Testing is straightforward

### Why Not Full Atomic Now?

1. **Massive refactor** - Every action, story, and test needs updates
2. **Dynamic descriptions** - Common IF pattern would be complex
3. **Working system** - Current approach works, just needs type fixes
4. **Migration path** - Enrichment layer could be added gradually

## Conclusion

While atomic events are philosophically cleaner and would solve the type issues, the refactoring scope is enormous. The current reference-based approach is actually quite reasonable for an IF engine where:

1. Descriptions often depend on current game state
2. The world model is always available
3. Entity data changes during gameplay

**Recommended approach**: Fix the immediate type issue (`data: any`), document the pattern, and consider an enrichment layer as a future enhancement that could be added without breaking changes.