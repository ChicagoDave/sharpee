# Comprehensive World Events Design

## Overview
Design for emitting events from all IWorldModel operations, providing complete observability of world state changes.

## Event Categories & Operations

### 1. Entity Management Events

#### Entity Lifecycle
| Operation | Event Type | Event Data | Use Cases |
|-----------|------------|------------|-----------|
| `createEntity()` | `world.entity.created` | `{entity, type, displayName}` | Witness, logging, analytics |
| `createEntityWithTraits()` | `world.entity.created` | `{entity, type, traits[]}` | Same + trait tracking |
| `removeEntity()` | `world.entity.removed` | `{entityId, entity, location}` | Cleanup, references |
| `updateEntity()` | `world.entity.updated` | `{entityId, changes}` | State tracking, undo |

### 2. Spatial Management Events

#### Movement & Location
| Operation | Event Type | Event Data | Use Cases |
|-----------|------------|------------|-----------|
| `moveEntity()` | `world.entity.moved` | `{entity, from, to, fromRelation, toRelation}` | Actions, witness, navigation |
| `canMoveEntity()` | `world.move.checked` | `{entityId, targetId, allowed}` | Debugging, validation |

### 3. State Management Events

#### World State
| Operation | Event Type | Event Data | Use Cases |
|-----------|------------|------------|-----------|
| `setState()` | `world.state.reset` | `{oldState, newState}` | Save/restore, undo |
| `setStateValue()` | `world.state.changed` | `{key, oldValue, newValue}` | State tracking |

### 4. Relationship Events

#### Entity Relationships
| Operation | Event Type | Event Data | Use Cases |
|-----------|------------|------------|-----------|
| `addRelationship()` | `world.relationship.added` | `{entity1, entity2, type}` | Graph updates |
| `removeRelationship()` | `world.relationship.removed` | `{entity1, entity2, type}` | Graph cleanup |

### 5. Capability Events

#### Capability Management
| Operation | Event Type | Event Data | Use Cases |
|-----------|------------|------------|-----------|
| `registerCapability()` | `world.capability.registered` | `{name, registration}` | System setup |
| `updateCapability()` | `world.capability.updated` | `{name, oldData, newData}` | Capability tracking |

### 6. Player Events

#### Player Management
| Operation | Event Type | Event Data | Use Cases |
|-----------|------------|------------|-----------|
| `setPlayer()` | `world.player.changed` | `{oldPlayerId, newPlayerId}` | POV changes |

### 7. Scope Events

#### Scope Rules
| Operation | Event Type | Event Data | Use Cases |
|-----------|------------|------------|-----------|
| `addScopeRule()` | `world.scope.rule.added` | `{rule}` | Scope debugging |
| `removeScopeRule()` | `world.scope.rule.removed` | `{ruleId}` | Scope cleanup |

## Event Structure

### Base World Event
```typescript
interface IWorldEvent {
  id: string;                    // Unique event ID
  type: string;                   // Event type (from table above)
  timestamp: number;              // When it occurred (milliseconds)
  turn: number;                  // Game turn number for ordering
  source: 'world';               // Always 'world' for these events
  operation: string;             // Method name that triggered it
  data: Record<string, any>;    // Event-specific data
  metadata?: {
    causedBy?: string;          // ID of semantic event that caused this
    actor?: string;             // Entity performing the action
    witness?: string[];         // Entities that observed this
  };
}
```

### MoveResult (Special Case)
```typescript
interface MoveResult {
  success: boolean;
  entity: IFEntity;
  fromLocation: IFEntity | null;
  toLocation: IFEntity | null;
  fromRelation: 'in' | 'on' | 'carried' | 'worn' | null;
  toRelation: 'in' | 'on' | 'carried' | 'worn' | null;
  reason?: string;                // If failed
  event?: IWorldEvent;            // The emitted event
}
```

## Implementation Strategy

### Option 1: Emit Everything (Maximum Observability)
**Pros:**
- Complete audit trail
- Perfect for debugging
- Enables event sourcing
- Witness system gets everything
- Analytics/metrics ready

**Cons:**
- Performance overhead
- Event noise
- Memory usage
- Filtering complexity

### Option 2: Emit + Return (Hybrid)
**Pros:**
- Mutations return rich results AND emit events
- Actions can choose to use return value or listen to events
- Backward compatible
- Flexible consumption

**Cons:**
- Duplication of information
- Slightly more complex

### Option 3: Configurable Emission
**Pros:**
- Can enable/disable categories
- Debug mode vs production mode
- Per-operation control

**Cons:**
- Configuration complexity
- Testing all combinations

## Recommended Approach

### Phase 1: Core Mutations
Start with events that change state:
- `world.entity.created`
- `world.entity.moved`
- `world.entity.removed`
- `world.state.changed`
- `world.relationship.added/removed`

### Phase 2: Return Values
Critical operations also return rich results:
- `moveEntity()` returns MoveResult
- `createEntity()` returns entity with metadata
- `removeEntity()` returns removed entity data

### Phase 3: Debug Events
Optional events for debugging:
- `world.move.checked`
- `world.scope.evaluated`
- Query operations

## Event Consumption Patterns

### 1. Witness System
```typescript
// Witnesses observe world events
on('world.entity.moved', (event) => {
  const witnesses = getWitnesses(event.data.from, event.data.to);
  recordObservation(witnesses, event);
});
```

### 2. Action Events
```typescript
// Actions use return values to build semantic events
const moveResult = world.moveEntity(item.id, actor.id);
if (moveResult.success) {
  emit('if.event.taken', {
    actor,
    item: moveResult.entity,
    from: moveResult.fromLocation
  });
}
```

### 3. Debugging
```typescript
// Debug mode logs all world events
if (DEBUG) {
  on('world.*', (event) => {
    console.log(`[WORLD] ${event.type}`, event.data);
  });
}
```

### 4. Event Sourcing
```typescript
// Record all events for replay
on('world.*', (event) => {
  eventStore.append(event);
});
```

## Benefits of Comprehensive Events

1. **Debugging**: See exactly what the world is doing
2. **Testing**: Assert on world events in tests
3. **Undo/Redo**: Replay or reverse events
4. **Save/Restore**: Event-sourced save games
5. **Analytics**: Track gameplay patterns
6. **Witness System**: NPCs observe world changes
7. **Visualization**: Real-time world state display
8. **Validation**: Ensure world consistency

## Migration Path

### Step 1: Add Event Infrastructure
- Add event emitter to WorldModel
- Create IWorldEvent interface
- Add event type constants

### Step 2: Instrument Core Operations
- Start with moveEntity()
- Add createEntity/removeEntity
- Add state changes

### Step 3: Update Consumers
- Actions use return values
- Witness system subscribes to events
- Debug tools consume events

### Step 4: Remove Platform Events
- Remove platform.world.* emissions
- Update any legacy listeners
- Clean up old code

## Configuration

```typescript
interface WorldEventConfig {
  // Enable categories
  entityEvents: boolean;
  spatialEvents: boolean;
  stateEvents: boolean;
  relationshipEvents: boolean;
  
  // Debug options
  logEvents: boolean;
  recordEvents: boolean;
  
  // Performance
  batchEvents: boolean;
  eventQueueSize: number;
}
```

## Decisions (Resolved Questions)

1. **Should query operations emit events?** ✅ **NO**
   - Query operations (getVisible, findByTrait, etc.) will NOT emit events
   - Keeps performance optimal
   - Reduces event noise

2. **Should failed operations emit events?** ✅ **NO**
   - Failed operations will NOT emit events
   - Return values indicate failure with reason
   - Keeps event stream clean

3. **Event batching?** ✅ **NO (for now)**
   - No batching initially, keep it simple
   - Transactions with multiple actions is interesting for future
   - Can revisit if performance becomes an issue

4. **Sync vs Async emission?** ✅ **SYNC**
   - All events are synchronous
   - We're never writing multi-player stories
   - Keeps implementation simple and predictable

5. **Event ordering?** ✅ **TURN + TIMESTAMP**
   - All events have both turn number and timestamp
   - Provides clear ordering within and across turns
   - Essential for event replay and debugging

## Next Steps

1. Review with team
2. Decide on Option 1, 2, or 3
3. Implement Phase 1 events
4. Test with taking action
5. Roll out to other systems