# ADR-033: Save/Restore Architecture

## Status
Implemented

## Context
Interactive fiction games require save/restore functionality to allow players to persist their progress and return to the game later. The Sharpee engine needs to provide this capability while maintaining its core principles:
- Client-agnostic design
- Event-driven architecture
- Query-able world model
- No virtual machine

The save system must capture the complete game state including:
- Event source (complete event history)
- Spatial index (current world state)
- Turn history (for undo/redo)
- Story configuration (for validation)

## Decision
Implement save/restore through client-provided hooks, with the engine serializing its complete state to a JSON blob. The engine is responsible for serialization/deserialization, while the client handles storage.

### Save Data Structure
```typescript
interface SaveData {
  version: string;        // Engine version for compatibility checking
  timestamp: number;      // When the save was created
  
  metadata: {
    storyId: string;      // Unique story identifier
    storyVersion: string; // Story version for compatibility
    turnCount: number;    // Number of turns played
    playTime?: number;    // Optional: milliseconds of play time
    description?: string; // Optional: player-provided or auto-generated
  };
  
  engineState: {
    // Complete event history
    eventSource: SerializedEvent[];
    
    // Current world state
    spatialIndex: {
      entities: Record<string, SerializedEntity>;
      locations: Record<string, SerializedLocation>;
      relationships: Record<string, SerializedRelationship[]>;
    };
    
    // Turn history for undo/redo
    turnHistory: {
      turnNumber: number;
      eventIds: string[];
      timestamp: number;
    }[];
    
    // Parser state if needed
    parserState?: {
      contextStack?: any[];
      disambiguationState?: any;
    };
  };
  
  // Story configuration (readonly, for validation)
  storyConfig: {
    id: string;
    version: string;
    title: string;
    author: string;
  };
}
```

### Engine Interface
The engine provides hooks for clients to implement save/restore:

```typescript
interface SaveRestoreHooks {
  // Called when save is requested
  onSaveRequested: (data: SaveData) => Promise<void>;
  
  // Called when restore is requested
  // Returns null if cancelled or no save available
  onRestoreRequested: () => Promise<SaveData | null>;
  
  // Called when quit is requested (optional)
  onQuitRequested?: (context: QuitContext) => Promise<boolean>;
  
  // Called when restart is requested (optional)
  onRestartRequested?: (context: RestartContext) => Promise<boolean>;
}

class Engine {
  registerSaveRestoreHooks(hooks: SaveRestoreHooks): void;
  save(): Promise<boolean>;
  restore(): Promise<boolean>;
}
```

### Platform Event Integration
Save and restore operations are now handled through platform events (see ADR-035):

```typescript
// Actions emit platform events
const saving: Action = {
  id: 'save',
  execute: (context) => {
    // Emit platform save requested event
    return [createSaveRequestedEvent({
      saveName: context.saveName,
      timestamp: Date.now(),
      metadata: { score, moves }
    })];
  }
};

// Engine processes platform events after turn completion
class Engine {
  async processPlatformOperations() {
    for (const op of this.pendingPlatformOps) {
      if (op.type === 'platform.save_requested') {
        const saveData = this.createSaveData();
        await this.saveRestoreHooks.onSaveRequested(saveData);
        this.emit(createSaveCompletedEvent(true));
      }
      // Similar for restore, quit, restart
    }
  }
}
```

This architecture ensures:
- Actions remain synchronous
- Platform operations happen after world model updates
- All operations appear in event history
- Text service can report operation results

## Consequences

### Positive
- **Client flexibility**: Each client can implement storage appropriately (localStorage, files, cloud)
- **Complete state**: All game state is preserved
- **Human-readable**: JSON format is debuggable and portable
- **Version aware**: Can detect incompatible saves
- **No replay needed**: Fast restore since we save complete state

### Negative
- **Size**: Complete state can be large for complex games
- **Compatibility**: Story updates may invalidate saves
- **No partial saves**: It's all or nothing

### Neutral
- Clients must implement storage (but this allows platform-appropriate solutions)
- JSON serialization may need optimization for very large games
- Save file inspection could reveal game internals (spoilers)

## Implementation Notes

### Serialization Considerations
1. Entity references must be converted to IDs
2. Circular references must be handled
3. Functions and class instances need special handling
4. BigInt or other non-JSON types need conversion

### Validation on Restore
1. Check engine version compatibility
2. Verify story ID matches
3. Warn if story version differs
4. Validate data structure integrity

### Client Implementation Examples

Browser client:
```typescript
const browserHooks: SaveRestoreHooks = {
  async onSaveRequested(data: SaveData) {
    localStorage.setItem('sharpee_save', JSON.stringify(data));
  },
  
  async onRestoreRequested() {
    const json = localStorage.getItem('sharpee_save');
    return json ? JSON.parse(json) : null;
  }
};
```

Node.js client:
```typescript
const nodeHooks: SaveRestoreHooks = {
  async onSaveRequested(data: SaveData) {
    await fs.writeFile('savegame.json', JSON.stringify(data, null, 2));
  },
  
  async onRestoreRequested() {
    try {
      const content = await fs.readFile('savegame.json', 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
};
```

## Related Decisions
- ADR-012: Debug as System Events (events included in saves)
- ADR-016: Author Recorded Event Metadata (metadata preserved in saves)
- ADR-019: Platform Implementation Patterns (client hook pattern)
- ADR-030: IF Services Package (service architecture)
- ADR-035: Platform Event Architecture (async operation handling)
- ADR-018: Conversational State Management (query integration)

## Questions to Resolve
1. Should we compress the JSON blob in the engine or leave it to clients?
2. How do we handle migration when story version changes?
3. Should we include a subset of events (last N) or all events?
4. Do we need save slots in the engine or leave that to clients?

## References
- Traditional IF save systems (Z-machine, Glulx)
- Browser localStorage limitations
- JSON serialization best practices
