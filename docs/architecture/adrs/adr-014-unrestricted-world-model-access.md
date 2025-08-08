# ADR-014: Unrestricted World Model Access

## Status
Proposed

## Context
During the implementation of the visibility system, we discovered that the WorldModel's `moveEntity` method prevents moving entities into closed containers. While this is correct behavior during gameplay, it creates significant problems for:

1. **Initial world construction** - Authors need to populate containers regardless of their open/closed state
2. **Save/load operations** - Restoring world state should bypass gameplay rules  
3. **Special game mechanics** - Magic, teleportation, or debug commands may need to bypass normal restrictions
4. **Story file authoring** - Authors shouldn't need to worry about container states during world setup

Currently, to place an item in a closed container during world setup, authors must:
```typescript
// Current workaround
cabinet.add(new OpenableTrait({ isOpen: true }));  // Start open
world.moveEntity(medicineId, cabinet.id);          // Now it works
(cabinet.getTrait(TraitType.OPENABLE) as any).isOpen = false; // Close it
```

This is cumbersome and error-prone.

## Decision
We will provide two separate interfaces to the same underlying world state:

1. **WorldModel** - Enforces game rules, generates events, used during gameplay
2. **AuthorModel** - Unrestricted access, no events, used for world building

Both models will share the same underlying data structures (SpatialIndex, EntityStore) but expose different methods and behaviors.

### Example Usage

```typescript
// During world building (story files, setup)
import { AuthorModel } from '@sharpee/world-model';

const author = new AuthorModel();
author.createEntity('Medicine Cabinet', 'container');
author.createEntity('Medicine', 'item');
author.moveEntity(medicineId, cabinetId); // Works even if cabinet is closed
author.setState('game-started', false);

// During gameplay
import { WorldModel } from '@sharpee/world-model';

const world = new WorldModel(author.getDataStore()); // Same underlying data
if (world.moveEntity(playerId, cabinetId)) {
  // Only succeeds if cabinet is open
  // Generates movement events
}
```

### Implementation Details

1. **Shared State**: Both models reference the same SpatialIndex and EntityStore instances
2. **No Events in AuthorModel**: Author operations never generate events or trigger handlers
3. **No Validation in AuthorModel**: Author operations bypass all game rule checks
4. **Clear Separation**: Different import paths make the distinction explicit
5. **Type Safety**: Each model can have methods optimized for its use case

### AuthorModel Methods

The AuthorModel will provide unrestricted versions of WorldModel methods plus author-specific conveniences:

```typescript
class AuthorModel {
  // Unrestricted basics
  moveEntity(entityId: string, targetId: string | null): void
  createEntity(name: string, type: string): IFEntity
  removeEntity(entityId: string): void
  
  // Author conveniences  
  populate(containerId: string, entities: string[]): void
  connect(room1: string, room2: string, direction: string): void
  fillContainer(containerId: string, itemDescriptions: ItemSpec[]): void
  placeActor(actorId: string, locationId: string, posture?: string): void
  
  // Bulk operations
  import(data: StoryData): void
  clear(): void
  
  // State access
  getDataStore(): { spatialIndex: SpatialIndex, entities: EntityStore }
}
```

## Consequences

### Positive
- **Clear Mental Model**: Authors know when they're building vs. when game rules apply
- **No Workarounds**: No need to temporarily change object states during setup
- **Clean Event History**: Event source only contains actual gameplay events
- **Better Testing**: Can test game rules separately from world construction
- **Type Safety**: Each API can be optimized for its specific use case
- **Future Flexibility**: Can add author-specific methods without polluting gameplay API

### Negative  
- **Two APIs to Maintain**: Must keep both models in sync with shared functionality
- **Learning Curve**: Developers must understand when to use which model
- **Potential Confusion**: Using the wrong model could lead to subtle bugs
- **Import Complexity**: Need to import from different paths for different use cases

### Neutral
- **Explicit Mode Switching**: Makes it very clear which "mode" the code is operating in
- **Parallel APIs**: Similar method names but different behaviors

## Alternatives Considered

### 1. Force Parameter
Add an optional `force` flag to existing methods:
```typescript
world.moveEntity(entityId, targetId, { force: true });
```
- **Pros**: Single API, backwards compatible
- **Cons**: Easy to misuse, clutters API, still generates events

### 2. Mode Switching
Add a mode flag to WorldModel:
```typescript
world.setAuthorMode(true);
world.moveEntity(entityId, targetId); // Bypasses rules
world.setAuthorMode(false);
```
- **Pros**: Single API, explicit mode
- **Cons**: Stateful, easy to forget to switch back, threading issues

### 3. Method Prefixes
Different method names for unrestricted operations:
```typescript
world.authorMoveEntity(entityId, targetId);
world.directMoveEntity(entityId, targetId);
```
- **Pros**: Single API, clear distinction
- **Cons**: Doubles API surface, naming conventions unclear

### 4. Direct Property Access
Allow direct manipulation of entity properties:
```typescript
entity.location = targetId;
```
- **Pros**: Simple, no API needed
- **Cons**: Breaks encapsulation, no validation possible, inconsistent state

## References
- Similar pattern in game engines: Unity's Editor vs Runtime APIs
- Inform 7's distinction between "setting up" and "play begins"
- MUD codebases often have "wizard" vs "player" commands
