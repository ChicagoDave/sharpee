---
title: "Rooms and Regions"
description: "Creating rooms, connecting them, and organizing your world into regions"
section: "author-guide"
order: 2
---

# Rooms and Regions

Rooms are the locations players explore. Regions are logical groupings of related rooms that help organize larger stories.

## Creating Rooms

### Basic Room

```typescript
import { WorldModel, EntityType, RoomTrait, IdentityTrait } from '@sharpee/world-model';

const kitchen = world.createEntity('kitchen', EntityType.ROOM);
kitchen.add(new RoomTrait({
  exits: {},
  isDark: false
}));
kitchen.add(new IdentityTrait({
  name: 'Kitchen',
  description: 'A small kitchen with copper pots hanging from the ceiling.',
  properName: true,
  article: 'the'
}));
```

### Room Properties

| Property | Type | Description |
|----------|------|-------------|
| `isDark` | boolean | Requires light source to see |
| `isOutdoors` | boolean | Outdoor location (affects weather, etc.) |
| `exits` | object | Direction-to-destination mapping |

### Dark Rooms

```typescript
const cellar = world.createEntity('cellar', EntityType.ROOM);
cellar.add(new RoomTrait({
  exits: {},
  isDark: true  // Player needs a light source
}));
cellar.add(new IdentityTrait({
  name: 'Cellar',
  description: 'A damp cellar with stone walls.',
  properName: true,
  article: 'the'
}));
```

## Connecting Rooms

### Using Direction Constants

```typescript
import { Direction } from '@sharpee/world-model';

// Get the room trait and set exits
const kitchenTrait = kitchen.get(RoomTrait);
kitchenTrait.exits[Direction.NORTH] = { destination: diningRoom.id };
kitchenTrait.exits[Direction.DOWN] = { destination: cellar.id };

// Bidirectional connection
const diningTrait = diningRoom.get(RoomTrait);
diningTrait.exits[Direction.SOUTH] = { destination: kitchen.id };
```

### Available Directions

```typescript
Direction.NORTH   // 'north'
Direction.SOUTH   // 'south'
Direction.EAST    // 'east'
Direction.WEST    // 'west'
Direction.UP      // 'up'
Direction.DOWN    // 'down'
Direction.IN      // 'in'
Direction.OUT     // 'out'
Direction.NORTHEAST  // 'northeast'
Direction.NORTHWEST  // 'northwest'
Direction.SOUTHEAST  // 'southeast'
Direction.SOUTHWEST  // 'southwest'
```

### Helper Function

Create a reusable helper for setting exits:

```typescript
function setExits(
  room: IFEntity,
  exits: Partial<Record<DirectionType, string>>
): void {
  const trait = room.get(RoomTrait);
  if (trait) {
    for (const [dir, dest] of Object.entries(exits)) {
      trait.exits[dir as DirectionType] = { destination: dest };
    }
  }
}

// Usage
setExits(kitchen, {
  [Direction.NORTH]: diningRoom.id,
  [Direction.DOWN]: cellar.id,
  [Direction.OUT]: garden.id
});
```

## Exits Through Doors

Connect rooms through a door that can be opened/closed:

```typescript
// Create the door
const door = world.createEntity('oak-door', EntityType.OBJECT);
door.add(new IdentityTrait({
  name: 'oak door',
  description: 'A heavy oak door with iron bands.'
}));
door.add(new OpenableTrait({ isOpen: false }));
door.add(new DoorTrait());
world.moveEntity(door.id, hallway.id);

// Connect rooms through the door
const hallwayTrait = hallway.get(RoomTrait);
hallwayTrait.exits[Direction.NORTH] = {
  destination: study.id,
  via: door.id  // Must open door first
};
```

## Organizing into Regions

For larger stories, organize rooms into regions:

### Region Structure

```
src/regions/
├── forest/
│   ├── index.ts         # Region setup and exports
│   └── rooms/
│       ├── clearing.ts
│       └── path.ts
├── castle/
│   ├── index.ts
│   └── rooms/
│       ├── entrance.ts
│       └── throne-room.ts
└── index.ts             # Connects all regions
```

### Region Pattern

```typescript
// src/regions/forest/index.ts
import { WorldModel, IFEntity } from '@sharpee/world-model';

export interface ForestRoomIds {
  clearing: string;
  path: string;
  grove: string;
}

export function createForestRegion(world: WorldModel): ForestRoomIds {
  // Create rooms
  const clearing = createClearing(world);
  const path = createPath(world);
  const grove = createGrove(world);

  // Internal connections
  setExits(clearing, { [Direction.EAST]: path.id });
  setExits(path, {
    [Direction.WEST]: clearing.id,
    [Direction.NORTH]: grove.id
  });
  setExits(grove, { [Direction.SOUTH]: path.id });

  // Return IDs for external connections
  return {
    clearing: clearing.id,
    path: path.id,
    grove: grove.id
  };
}
```

### Connecting Regions

```typescript
// src/index.ts
import { createForestRegion } from './regions/forest';
import { createCastleRegion } from './regions/castle';

initializeWorld(world: WorldModel): void {
  const forest = createForestRegion(world);
  const castle = createCastleRegion(world);

  // Connect regions
  const forestClearing = world.getEntity(forest.clearing);
  const castleEntrance = world.getEntity(castle.entrance);

  setExits(forestClearing, { [Direction.NORTH]: castle.entrance });
  setExits(castleEntrance, { [Direction.SOUTH]: forest.clearing });

  // Set starting location
  const player = world.getPlayer();
  world.moveEntity(player.id, forest.clearing);
}
```

## Room Descriptions

### Static Description

```typescript
room.add(new IdentityTrait({
  name: 'Library',
  description: 'Dusty bookshelves line every wall, reaching to the vaulted ceiling.',
  properName: true,
  article: 'the'
}));
```

### Dynamic Descriptions

For descriptions that change based on state, use event handlers:

```typescript
// Register handler for room description events
world.on('if.event.room.describe', (event, world) => {
  if (event.data.roomId === library.id) {
    const booksTaken = (library as any).booksTaken || false;
    if (booksTaken) {
      return {
        description: 'Empty shelves line the walls. All the books are gone.'
      };
    }
  }
});
```

## Room Aliases

Allow multiple names to refer to the same room:

```typescript
room.add(new IdentityTrait({
  name: 'Forest Path',
  aliases: ['path', 'trail', 'forest trail'],
  description: 'A winding path through the trees.',
  properName: true,
  article: 'the'
}));
```

## Special Room Types

### Outdoor Rooms

```typescript
room.add(new RoomTrait({
  exits: {},
  isDark: false,
  isOutdoors: true  // Affected by weather, sky visible
}));
```

### One-Way Exits

```typescript
// Cliff edge - can go down but not back up
setExits(cliffTop, { [Direction.DOWN]: ravine.id });
// Don't add UP exit from ravine
```

### Conditional Exits

Handle with event handlers or custom actions:

```typescript
// Bridge that collapses after crossing
world.on('if.event.going', (event, world) => {
  if (event.data.from === bridgeRoom.id &&
      event.data.direction === Direction.EAST) {
    (bridgeRoom as any).collapsed = true;
    // Remove the exit
    const trait = bridgeRoom.get(RoomTrait);
    delete trait.exits[Direction.EAST];
  }
});
```

## Best Practices

1. **Use meaningful IDs**: `'forest-clearing'` not `'room1'`
2. **Group related rooms**: Organize by geographic area or theme
3. **Document connections**: Keep a map or diagram
4. **Test navigation**: Create transcript tests for critical paths
5. **Consider light**: Dark rooms add puzzle opportunities
6. **Use regions**: Break large maps into manageable chunks
