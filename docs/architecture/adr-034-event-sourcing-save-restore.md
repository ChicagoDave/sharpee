# ADR-034: Event Sourcing for Save/Restore (Future Enhancement)

## Status
Proposed (Future)

## Context
During implementation of save/restore functionality (ADR-033), we realized that our event-driven architecture naturally supports event sourcing as an alternative approach to save/restore. Since all state changes flow through events and we maintain a complete event history, we could implement save/restore by simply storing and replaying the event stream.

Current implementation (ADR-033) takes a state snapshot approach, serializing the world model, spatial index, and other runtime state. However, event sourcing could provide a simpler and more elegant solution.

With the addition of platform events (ADR-035), the event stream now includes all platform operations (save, restore, quit, restart) as first-class events, making event sourcing even more attractive.

## Decision
Consider implementing event sourcing for save/restore in a future iteration. This would involve:

1. **Save**: Store only the complete event stream
2. **Restore**: Create a fresh world and replay all events through the event processor

## Proposed Implementation

### Pure Event Sourcing
```typescript
interface EventSourcedSaveData {
  version: string;
  timestamp: number;
  metadata: SaveMetadata;
  eventStream: SerializedEvent[];
  storyConfig: StoryConfig;
}

class Engine {
  async save(): Promise<boolean> {
    const saveData: EventSourcedSaveData = {
      version: '2.0.0',
      timestamp: Date.now(),
      metadata: this.createMetadata(),
      eventStream: this.eventSource.getAllEvents(),
      storyConfig: this.story.getConfig()
    };
    
    await this.saveRestoreHooks.onSaveRequested(saveData);
    return true;
  }
  
  async restore(): Promise<boolean> {
    const saveData = await this.saveRestoreHooks.onRestoreRequested();
    
    // Reset to initial state
    this.initializeWorld();
    
    // Replay all events
    for (const event of saveData.eventStream) {
      await this.eventProcessor.process(event, this.world);
    }
    
    return true;
  }
}
```

### Hybrid Approach (Event Sourcing + Snapshots)
```typescript
interface HybridSaveData {
  version: string;
  timestamp: number;
  metadata: SaveMetadata;
  
  // Full event stream
  eventStream: SerializedEvent[];
  
  // Periodic snapshots for performance
  snapshots: {
    turnNumber: number;
    worldState: SerializedSpatialIndex;
    timestamp: number;
  }[];
  
  storyConfig: StoryConfig;
}

// Restore would:
// 1. Find the latest snapshot before the save point
// 2. Restore from snapshot
// 3. Replay only events after the snapshot
```

## Benefits

### Advantages of Event Sourcing
1. **Simplicity**: No complex serialization logic needed
2. **Auditability**: Complete history of what happened
3. **Debugging**: Can replay to see exact sequence of events
4. **Time Travel**: Could implement "rewind" to any turn
5. **Analytics**: Can analyze player behavior patterns
6. **Less Code**: Eliminates most serialization/deserialization logic

### Advantages of Hybrid Approach
1. **Performance**: Fast restore from snapshots
2. **Flexibility**: Can choose snapshot frequency
3. **Best of Both**: History + performance

## Challenges

### Technical Challenges
1. **Performance**: Replaying thousands of events could be slow
2. **Determinism**: Events must be perfectly deterministic
3. **Event Evolution**: Changing event structure breaks old saves
4. **Memory**: Keeping full event stream in memory

### Design Challenges
1. **Event Compatibility**: Need versioning strategy for events
2. **Side Effects**: External calls must be idempotent
3. **Random State**: Need to capture and restore RNG state
4. **Time-based Events**: Must handle timing consistently

## Migration Strategy

To migrate from current snapshot-based saves:

```typescript
class SaveMigrator {
  migrateV1ToV2(v1Save: SaveData): EventSourcedSaveData {
    // Generate synthetic events from state snapshot
    const events: SerializedEvent[] = [];
    
    // Create "restore" event with full state
    events.push({
      id: 'migrate-v1',
      type: 'system.restore_from_snapshot',
      timestamp: v1Save.timestamp,
      data: {
        spatialIndex: v1Save.engineState.spatialIndex,
        turnHistory: v1Save.engineState.turnHistory
      }
    });
    
    return {
      version: '2.0.0',
      timestamp: v1Save.timestamp,
      metadata: v1Save.metadata,
      eventStream: events,
      storyConfig: v1Save.storyConfig
    };
  }
}
```

## Implementation Considerations

### Event Store Optimizations
```typescript
class EventStore {
  private events: SerializedEvent[] = [];
  private index: Map<string, number> = new Map(); // ID to index
  private turnIndex: Map<number, number[]> = new Map(); // Turn to event indices
  
  // Efficient queries
  getEventsForTurn(turn: number): SerializedEvent[] {
    const indices = this.turnIndex.get(turn) || [];
    return indices.map(i => this.events[i]);
  }
  
  getEventsSince(timestamp: number): SerializedEvent[] {
    return this.events.filter(e => e.timestamp > timestamp);
  }
}
```

### Compression
Since event streams can be repetitive, compression could significantly reduce save size:

```typescript
// Browser
const compressed = pako.deflate(JSON.stringify(eventStream));

// Node.js
const compressed = zlib.gzipSync(JSON.stringify(eventStream));
```

## Platform Event Compatibility

The platform event architecture (ADR-035) is designed to be compatible with event sourcing:

### Event Stream Includes Platform Operations
```typescript
// Example event stream with platform events
[
  { type: 'action.take', ... },
  { type: 'action.go', ... },
  { type: 'platform.save_requested', ... },
  { type: 'platform.save_completed', ... },
  { type: 'action.look', ... },
  { type: 'platform.quit_requested', ... },
  { type: 'platform.quit_cancelled', ... }
]
```

### Replay Considerations
When replaying events:
1. **Skip completion events**: These are generated by the engine
2. **Skip request events**: Platform ops shouldn't re-execute during replay
3. **Use events for state**: But track that save/quit happened

```typescript
class EventReplayer {
  shouldReplay(event: SerializedEvent): boolean {
    // Don't re-execute platform operations
    if (isPlatformEvent(event)) {
      return false;
    }
    
    // Replay all game events
    return true;
  }
  
  extractState(event: SerializedEvent): void {
    // But do track platform operation history
    if (event.type === 'platform.save_completed') {
      this.lastSaveTime = event.timestamp;
    }
  }
}
```

## Decision Outcome
Defer implementation to a future iteration. Current snapshot-based approach works well and is already implemented. Event sourcing can be added later as an optimization or alternative save format. The platform event architecture has been designed to be compatible with future event sourcing.

## Future Work
1. Prototype event sourcing with a simple game
2. Benchmark performance vs snapshot approach
3. Design event compatibility/versioning strategy
4. Consider hybrid approach for large games

## References
- Event Sourcing pattern: https://martinfowler.com/eaaDev/EventSourcing.html
- Event Store documentation
- CQRS and Event Sourcing in practice
