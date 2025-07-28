# Test Patterns for ID Refactor

## Overview

With the new ID system, tests no longer specify entity IDs directly. Instead, they provide display names and the system generates IDs automatically. This document shows the new patterns for writing tests.

## Basic Patterns

### Creating Entities

**Before:**
```typescript
const room = world.createEntity('kitchen', 'Kitchen');
const player = world.createEntity('player', 'Player');
```

**After:**
```typescript
const room = world.createEntity('Kitchen', 'room');  // ID: r01
const player = world.createEntity('Player', 'actor'); // ID: a01
```

### Referencing Entities

**Before:**
```typescript
world.moveEntity('player', 'kitchen');
expect(world.getEntity('kitchen')).toBeDefined();
```

**After:**
```typescript
world.moveEntity(player.id, room.id);
expect(world.getEntity(room.id)).toBeDefined();

// Or use name lookup when needed:
const kitchenId = world.getId('Kitchen');
expect(world.getEntity(kitchenId)).toBeDefined();
```

## Test Factory Functions

All test factory functions now require a `WorldModel` instance as the first parameter:

```typescript
import { createTestRoom, createTestActor, createTestItem } from '../fixtures/test-entities';

const world = new WorldModel();
const room = createTestRoom(world, 'Living Room');
const player = createTestActor(world, 'Player', true);
const item = createTestItem(world, 'Red Key');
```

## Test Helper Functions

Use the new helper functions for name-based operations in tests:

```typescript
import { 
  getTestEntity, 
  expectEntity, 
  moveEntityByName,
  canSeeByName 
} from '../fixtures/test-helpers';

// Get entity by name
const kitchen = expectEntity(world, 'Kitchen');

// Move entity by name
moveEntityByName(world, 'Player', 'Kitchen');

// Check visibility by name
expect(canSeeByName(world, 'Player', 'Red Key')).toBe(true);
```

## Room Connections

When setting up room exits, always use entity IDs:

```typescript
const room1 = createTestRoom(world, 'Room 1');
const room2 = createTestRoom(world, 'Room 2');
const door = createTestDoor(world, 'Connecting Door', room1.id, room2.id);

// Set up exits
const room1Trait = room1.getTrait(TraitType.ROOM) as RoomTrait;
room1Trait.exits = {
  north: { destination: room2.id, via: door.id }
};
```

## Test Scenarios

For complex tests, use the scenario helpers:

```typescript
import { createTestScenario, addRoom, addItem, connectRooms } from '../fixtures/test-helpers';

const scenario = createTestScenario();

// Add rooms
addRoom(scenario, 'Kitchen');
addRoom(scenario, 'Living Room');

// Connect them
connectRooms(scenario, 'Kitchen', 'Living Room', 'north', 'south');

// Add items
addItem(scenario, 'Apple', 'Kitchen');

// Access everything through the scenario
expect(scenario.rooms.get('Kitchen')).toBeDefined();
expect(scenario.world.getId('Apple')).toBeDefined();
```

## Common Patterns

### Pattern 1: Testing Entity Creation
```typescript
it('should create entities with correct IDs', () => {
  const room = world.createEntity('Test Room', 'room');
  expect(room.id).toBe('r01');
  expect(room.name).toBe('Test Room');
  expect(world.getId('Test Room')).toBe('r01');
});
```

### Pattern 2: Testing Entity Movement
```typescript
it('should move entities by ID', () => {
  const room = world.createEntity('Room', 'room');
  const item = world.createEntity('Item', 'item');
  
  world.moveEntity(item.id, room.id);
  expect(world.getLocation(item.id)).toBe(room.id);
});
```

### Pattern 3: Testing with Name Lookup
```typescript
it('should find entities by name', () => {
  world.createEntity('Special Item', 'item');
  
  const id = world.getId('Special Item');
  expect(id).toBe('i01');
  
  const entity = world.getEntity(id!);
  expect(entity?.name).toBe('Special Item');
});
```

### Pattern 4: Testing Save/Load
```typescript
it('should preserve IDs and names on save/load', () => {
  const room = world.createEntity('Test Room', 'room');
  const saved = world.toJSON();
  
  const newWorld = new WorldModel();
  newWorld.loadJSON(saved);
  
  expect(newWorld.getId('Test Room')).toBe('r01');
  expect(newWorld.getEntity('r01')?.name).toBe('Test Room');
});
```

## Migration Tips

1. **Never hardcode IDs**: Always use entity references or name lookup
2. **Update factory calls**: Add `world` as first parameter
3. **Use `.id` property**: When you need an ID, use `entity.id`
4. **Name lookups are case-insensitive**: `world.getId('kitchen')` === `world.getId('Kitchen')`
5. **Check for undefined**: Name lookups return `undefined` if not found

## Debugging

To see what IDs are generated:
```typescript
console.log(entity.id);        // Shows generated ID like 'r01'
console.log(entity.name);      // Shows display name like 'Kitchen'
console.log(world.getId(name)); // Shows ID for a given name
```
