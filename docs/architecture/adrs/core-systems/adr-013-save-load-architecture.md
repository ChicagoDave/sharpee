# ADR-013: Save/Load Architecture

## Status
Proposed

## Context
Interactive Fiction requires robust save/load functionality. Players expect to save their progress and return later, potentially across different devices. The event-driven architecture of Sharpee, where all state changes flow through events, provides a unique opportunity for a clean save/load implementation.

## Decision
Implement save/load by serializing the entire in-memory world state, not by replaying events. The world model is the single source of truth at any point in time.

## Architecture

### Save Structure
```typescript
interface SaveGame {
  metadata: {
    version: string;
    timestamp: number;
    storyId: string;
    storyVersion: string;
    turnCount: number;
    playTime: number;
    description?: string; // Player-provided or auto-generated
  };
  
  worldState: {
    // Complete serialization of world model
    entities: Map<string, IFEntity>;
    rooms: Map<string, Room>;
    player: PlayerState;
    
    // Game-specific state
    variables: Map<string, any>;
    flags: Set<string>;
    
    // Relationship/conversation state
    npcStates: Map<string, NPCState>;
    conversations: Map<string, ConversationState>;
  };
  
  // Optional: Last N events for context
  recentHistory?: SemanticEvent[];
}
```

### Serialization Strategy

```typescript
class SaveSystem {
  save(world: IWorldModel, slot: string): SaveGame {
    return {
      metadata: this.generateMetadata(world),
      worldState: this.serializeWorld(world),
      recentHistory: this.getRecentEvents(10) // Last 10 events
    };
  }
  
  private serializeWorld(world: IWorldModel): WorldState {
    // Deep clone all entities with their traits
    const entities = new Map();
    for (const [id, entity] of world.entities) {
      entities.set(id, this.serializeEntity(entity));
    }
    
    // Serialize all rooms with contents
    const rooms = new Map();
    for (const [id, room] of world.rooms) {
      rooms.set(id, this.serializeRoom(room));
    }
    
    return {
      entities,
      rooms,
      player: this.serializePlayer(world.player),
      variables: new Map(world.variables),
      flags: new Set(world.flags),
      npcStates: this.serializeNPCStates(world),
      conversations: this.serializeConversations(world)
    };
  }
  
  load(saveData: SaveGame): IWorldModel {
    // Validate save version compatibility
    this.validateSave(saveData);
    
    // Reconstruct world from serialized state
    const world = new WorldModel();
    
    // Restore all entities
    for (const [id, data] of saveData.worldState.entities) {
      world.addEntity(this.deserializeEntity(data));
    }
    
    // Restore rooms and relationships
    for (const [id, data] of saveData.worldState.rooms) {
      world.addRoom(this.deserializeRoom(data));
    }
    
    // Restore game state
    world.variables = new Map(saveData.worldState.variables);
    world.flags = new Set(saveData.worldState.flags);
    
    return world;
  }
}
```

### Storage Options

```typescript
interface StorageProvider {
  save(slot: string, data: SaveGame): Promise<void>;
  load(slot: string): Promise<SaveGame>;
  list(): Promise<SaveSlot[]>;
  delete(slot: string): Promise<void>;
}

// Multiple storage backends
class LocalStorageProvider implements StorageProvider {
  async save(slot: string, data: SaveGame): Promise<void> {
    const json = JSON.stringify(data);
    localStorage.setItem(`save_${slot}`, json);
  }
}

class FileSystemProvider implements StorageProvider {
  async save(slot: string, data: SaveGame): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(`saves/${slot}.json`, json);
  }
}

class CloudStorageProvider implements StorageProvider {
  async save(slot: string, data: SaveGame): Promise<void> {
    await fetch('/api/saves', {
      method: 'POST',
      body: JSON.stringify({ slot, data })
    });
  }
}
```

## Consequences

### Positive
- **Complete State**: Everything is saved, no edge cases
- **Fast Loading**: No need to replay events
- **Portable**: Save files can move between devices
- **Debuggable**: Save files are readable JSON
- **Versioned**: Can handle story updates
- **Simple**: No complex event replay logic

### Negative
- **Size**: Full state can be large
- **Compatibility**: Story changes may break saves
- **No History**: Don't get full game history (but see ADR-014 for undo)

### Neutral
- Save files are human-readable (both good and bad)
- Need migration strategy for story updates
- May want compression for large games

## Implementation Notes

### Entity Serialization
```typescript
private serializeEntity(entity: IFEntity): SerializedEntity {
  const data: SerializedEntity = {
    id: entity.id,
    traits: {}
  };
  
  // Serialize each trait
  for (const [name, trait] of entity.traits) {
    data.traits[name] = this.serializeTrait(trait);
  }
  
  return data;
}

private serializeTrait(trait: Trait): any {
  // Most traits are POJOs and serialize directly
  return { ...trait };
}
```

### Handling References
```typescript
// Convert entity references to IDs during serialization
private serializeReferences(obj: any): any {
  if (obj instanceof IFEntity) {
    return { $ref: 'entity', id: obj.id };
  }
  if (obj instanceof Room) {
    return { $ref: 'room', id: obj.id };
  }
  if (Array.isArray(obj)) {
    return obj.map(item => this.serializeReferences(item));
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.serializeReferences(value);
    }
    return result;
  }
  return obj;
}
```

### Save Slots UI
```typescript
interface SaveSlotUI {
  displayName: string;
  timestamp: Date;
  turnCount: number;
  location: string;
  preview?: string; // First line of recent output
}

class SaveUI {
  async showSaveDialog(): Promise<string | null> {
    const slots = await this.storage.list();
    const choice = await this.ui.choose([
      ...slots.map(s => `${s.displayName} (${s.timestamp})`),
      '[New Save]'
    ]);
    
    if (choice === '[New Save]') {
      return await this.ui.prompt('Save name:');
    }
    
    return choice;
  }
}
```

## Migration Strategy

When story version changes:

```typescript
interface SaveMigration {
  fromVersion: string;
  toVersion: string;
  migrate(save: SaveGame): SaveGame;
}

class SaveMigrator {
  migrations: SaveMigration[] = [];
  
  migrate(save: SaveGame, targetVersion: string): SaveGame {
    let current = save;
    
    while (current.metadata.storyVersion !== targetVersion) {
      const migration = this.findMigration(
        current.metadata.storyVersion,
        targetVersion
      );
      
      if (!migration) {
        throw new Error('No migration path available');
      }
      
      current = migration.migrate(current);
    }
    
    return current;
  }
}
```

## Example Usage

```typescript
// In game loop
game.commands.register('save', async (args) => {
  const slot = await ui.getSaveSlot();
  if (slot) {
    await saveSystem.save(world, slot);
    ui.message('Game saved.');
  }
});

game.commands.register('load', async (args) => {
  const slot = await ui.getLoadSlot();
  if (slot) {
    const save = await saveSystem.load(slot);
    world.restore(save);
    ui.message('Game loaded.');
    ui.refresh();
  }
});

// Auto-save
game.on('turn.end', async () => {
  if (game.config.autosave) {
    await saveSystem.save(world, 'autosave');
  }
});
```

## Related Decisions
- ADR-014: Undo System (uses event replay instead)
- World Model Architecture (defines what gets saved)
- Event System (provides recent history)

## References
- Inform 7's save system
- Twine's state serialization
- Browser localStorage limits
- JSON serialization best practices
