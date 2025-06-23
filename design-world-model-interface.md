# World Model Interface Design

## Overview

The World Model provides the interface between the generic Core entity system and the IF-specific game world. It manages spatial relationships, entity queries, and world state while maintaining the clean architectural separation between layers.

## Architectural Context

```
┌─────────────────────────────────────────────────────────┐
│                    StdLib Layer                         │
│  (Actions, Parser, Services use IWorldModel interface)  │
└────────────────────────┬────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────┐
│                 World-Model Layer                       │
│  (IWorldModel implementation, IFEntity, Traits)         │
└────────────────────────┬────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────┐
│                    Core Layer                           │
│        (Entity, Events, Rules, Extensions)              │
└─────────────────────────────────────────────────────────┘
```

## Interface Requirements

Based on the door, visibility, and container/supporter designs, the World Model must provide:

### 1. Entity Management
- Create, retrieve, update, delete entities
- Type-safe access to IF entities with trait methods
- Entity validation and lifecycle hooks

### 2. Spatial Relationships
- Track entity locations (what contains what)
- Move entities between locations
- Query contents and containment hierarchies
- Validate spatial operations (prevent loops, check capacity)

### 3. World State
- Global state (time of day, turn count, etc.)
- State persistence and loading
- State change notifications

### 4. Query Operations
- Find entities by various criteria
- Spatial queries (what's here, what's nearby)
- Visibility and scope calculations
- Relationship traversal

## Interface Design

### IWorldModel - Main Interface

```typescript
// world-model/src/world/world-model.ts

/**
 * The main world model interface that StdLib and games interact with.
 * Provides IF-specific world management on top of Core's entity system.
 */
export interface IWorldModel {
  // ========== Entity Management ==========
  
  /**
   * Create a new IF entity
   */
  createEntity(id: string, type: string, options?: {
    traits?: Trait[];
    location?: string;
    attributes?: Record<string, unknown>;
    relationships?: Record<string, string[]>;
  }): IFEntity;
  
  /**
   * Get an entity by ID (returns IFEntity with trait methods)
   */
  getEntity(id: string): IFEntity | null;
  
  /**
   * Check if an entity exists
   */
  hasEntity(id: string): boolean;
  
  /**
   * Remove an entity and clean up relationships
   */
  removeEntity(id: string): boolean;
  
  /**
   * Get all entities
   */
  getAllEntities(): IFEntity[];
  
  // ========== Spatial Management ==========
  
  /**
   * Get the immediate container of an entity
   */
  getLocation(entityId: string): string | null;
  
  /**
   * Get all entities directly contained by a location
   */
  getContents(locationId: string): IFEntity[];
  
  /**
   * Move an entity to a new location
   * Validates the move and updates relationships
   */
  moveEntity(entityId: string, targetId: string | null): boolean;
  
  /**
   * Check if a move would be valid without performing it
   */
  canMoveEntity(entityId: string, targetId: string | null): boolean | string;
  
  /**
   * Get the room containing an entity (traverses up containers)
   */
  getContainingRoom(entityId: string): IFEntity | null;
  
  /**
   * Get all entities recursively contained within a location
   */
  getAllContents(locationId: string, options?: {
    includeContainers?: boolean;
    includeClosed?: boolean;
  }): IFEntity[];
  
  // ========== World State ==========
  
  /**
   * Get world state object
   */
  getState(): IWorldState;
  
  /**
   * Update world state
   */
  setState(updates: Partial<IWorldState>): void;
  
  /**
   * Get specific state value
   */
  getStateValue<K extends keyof IWorldState>(key: K): IWorldState[K];
  
  /**
   * Set specific state value
   */
  setStateValue<K extends keyof IWorldState>(key: K, value: IWorldState[K]): void;
  
  // ========== Query Operations ==========
  
  /**
   * Find entities with specific traits
   */
  findByTrait(trait: TraitType | TraitType[]): IFEntity[];
  
  /**
   * Find entities by type
   */
  findByType(type: string): IFEntity[];
  
  /**
   * Find entities matching a predicate
   */
  findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[];
  
  /**
   * Get objects visible to an observer
   */
  getVisible(observer: IFEntity): IFEntity[];
  
  /**
   * Get objects in scope for parser (can be referenced by name)
   */
  getInScope(actor: IFEntity): IFEntity[];
  
  /**
   * Check if an entity can see another entity
   */
  canSee(observer: IFEntity, target: IFEntity): boolean;
  
  // ========== Relationship Queries ==========
  
  /**
   * Get entities related by a specific relationship type
   */
  getRelated(entityId: string, relationshipType: string): IFEntity[];
  
  /**
   * Check if two entities are related
   */
  areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean;
  
  /**
   * Add a relationship between entities
   */
  addRelationship(sourceId: string, relationshipType: string, targetId: string): void;
  
  /**
   * Remove a relationship
   */
  removeRelationship(sourceId: string, relationshipType: string, targetId: string): void;
  
  // ========== Utility Methods ==========
  
  /**
   * Get total weight of an entity including contents
   */
  getTotalWeight(entity: IFEntity): number;
  
  /**
   * Check if moving an entity would create a containment loop
   */
  wouldCreateLoop(entity: string, target: string): boolean;
  
  /**
   * Find path between rooms
   */
  findPath(fromRoom: string, toRoom: string): string[] | null;
  
  /**
   * Get player entity
   */
  getPlayer(): IFEntity | null;
  
  /**
   * Set player entity
   */
  setPlayer(entityId: string): void;
  
  // ========== Persistence ==========
  
  /**
   * Serialize world state to JSON
   */
  toJSON(): any;
  
  /**
   * Load world state from JSON
   */
  loadJSON(data: any): void;
  
  /**
   * Clear all world data
   */
  clear(): void;
}
```

### IWorldState - Global State

```typescript
// world-model/src/world/world-state.ts

/**
 * Global world state that isn't tied to specific entities
 */
export interface IWorldState {
  // Time
  timeOfDay: 'day' | 'night';
  turnCount: number;
  
  // Player state
  playerId: string | null;
  
  // Game state
  gameStarted: boolean;
  gameEnded: boolean;
  score: number;
  
  // Extensible for game-specific state
  custom: Record<string, unknown>;
}
```

### IWorldConfig - Configuration

```typescript
// world-model/src/world/world-config.ts

/**
 * Configuration options for world model
 */
export interface IWorldConfig {
  // Validation
  validateRelationships?: boolean;  // Check relationship targets exist
  validateMoves?: boolean;         // Check moves are valid
  preventLoops?: boolean;          // Prevent containment loops
  
  // Defaults
  defaultRoomLight?: number;       // Default light level for rooms
  defaultTimeOfDay?: 'day' | 'night';
  
  // Limits
  maxNestingDepth?: number;        // Maximum containment depth
  maxEntities?: number;            // Maximum number of entities
  
  // Features
  trackVisitedRooms?: boolean;     // Remember which rooms player has seen
  persistentState?: boolean;       // Enable save/load
}
```

## Implementation Details

### WorldModel Class Structure

```typescript
// world-model/src/world/world-model-impl.ts

export class WorldModel implements IWorldModel {
  private entities: EntityStore;           // From existing entity-store.ts
  private locations: Map<string, string>; // entityId -> containerId
  private state: IWorldState;
  private config: IWorldConfig;
  private eventBus: EventEmitter;         // For change notifications
  
  constructor(config?: IWorldConfig) {
    this.entities = new EntityStore();
    this.locations = new Map();
    this.state = this.createDefaultState();
    this.config = { ...defaultConfig, ...config };
    this.eventBus = new EventEmitter();
  }
  
  // ... implementation of interface methods ...
}
```

### Spatial Index

The spatial system tracks containment relationships separately from the entity's relationships for performance:

```typescript
// Internal spatial tracking
class SpatialIndex {
  private parentMap: Map<string, string>;      // child -> parent
  private childrenMap: Map<string, Set<string>>; // parent -> children
  
  setLocation(entityId: string, containerId: string | null): void {
    // Remove from old location
    const oldLocation = this.parentMap.get(entityId);
    if (oldLocation) {
      this.childrenMap.get(oldLocation)?.delete(entityId);
    }
    
    // Add to new location
    if (containerId) {
      this.parentMap.set(entityId, containerId);
      if (!this.childrenMap.has(containerId)) {
        this.childrenMap.set(containerId, new Set());
      }
      this.childrenMap.get(containerId)!.add(entityId);
    } else {
      this.parentMap.delete(entityId);
    }
  }
  
  getLocation(entityId: string): string | null {
    return this.parentMap.get(entityId) || null;
  }
  
  getContents(containerId: string): string[] {
    return Array.from(this.childrenMap.get(containerId) || []);
  }
}
```

### Integration with Existing Systems

#### Using with Services

```typescript
// stdlib/src/services/inventory-service.ts
export class InventoryService {
  constructor(private world: IWorldModel) {}
  
  canContain(container: IFEntity, item: IFEntity): boolean | string {
    // Check for loops using world model
    if (this.world.wouldCreateLoop(container.id, item.id)) {
      return "Would create containment loop";
    }
    
    // Use world model for spatial queries
    const contents = this.world.getContents(container.id);
    // ... rest of logic
  }
}
```

#### Using with Actions

```typescript
// stdlib/src/actions/take-action.ts
export class TakeAction {
  execute(actor: IFEntity, target: IFEntity, world: IWorldModel): ActionResult {
    // Use world model for location checks
    const actorRoom = world.getContainingRoom(actor.id);
    const targetRoom = world.getContainingRoom(target.id);
    
    if (actorRoom?.id !== targetRoom?.id) {
      return ActionResult.fail("Not here");
    }
    
    // Use world model to move entity
    if (!world.moveEntity(target.id, actor.id)) {
      return ActionResult.fail("Can't take that");
    }
    
    return ActionResult.success();
  }
}
```

#### Using with Visibility

```typescript
// stdlib/src/services/visibility-service.ts
export class VisibilityService {
  constructor(private world: IWorldModel) {}
  
  getVisible(observer: IFEntity): IFEntity[] {
    // Get room
    const room = this.world.getContainingRoom(observer.id);
    if (!room) return [];
    
    // Check darkness
    if (RoomBehavior.isDark(room, this.world)) {
      // Only light sources visible in darkness
      return this.world.getAllContents(room.id)
        .filter(e => e.has(TraitType.LIGHT_SOURCE) && e.isLit);
    }
    
    // Get all visible contents
    return this.world.getAllContents(room.id, {
      includeClosed: false  // Can't see inside closed containers
    });
  }
}
```

## Benefits

1. **Clean Layer Separation** - StdLib doesn't depend on Core types
2. **Type Safety** - Returns IFEntity with trait methods
3. **Spatial Intelligence** - Dedicated spatial tracking for performance
4. **Validation** - Prevents invalid states (loops, capacity violations)
5. **Extensibility** - Custom state, events, and configuration options

## Migration Path

1. Implement IWorldModel interface in world-model package
2. Update EntityStore to be used by WorldModel
3. Migrate stdlib services to use IWorldModel instead of temporary interface
4. Update all imports to use world-model types
5. Add world model factory/builder for game initialization

## Future Considerations

- **Performance**: Spatial index could use more sophisticated data structures
- **Transactions**: Batch operations with rollback capability
- **Events**: Richer event system for world changes
- **Queries**: More sophisticated query builder pattern
- **Caching**: Cache frequently accessed computations (visibility, paths)
