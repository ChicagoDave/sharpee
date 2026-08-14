# Regions Guide

## Overview

Regions group rooms into named geographic areas. Use them to organize your map, trigger events when the player crosses boundaries, and set ambient properties (sound, smell, darkness) for an entire area at once.

## Creating Regions

Create region entities in `initializeWorld()` before creating rooms:

```typescript
initializeWorld(world: WorldModel): void {
  // Create regions first
  world.createRegion('reg-forest', {
    name: 'The Dark Forest',
    defaultDark: false,
  });

  world.createRegion('reg-caves', {
    name: 'Underground Caves',
    defaultDark: true,
    ambientSound: 'dripping water',
    ambientSmell: 'damp stone',
  });

  // Then create rooms...
}
```

### RegionOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Human-readable region name |
| `parentRegionId` | `string` | No | Parent region ID for nesting |
| `defaultDark` | `boolean` | No | Whether rooms default to dark |
| `ambientSound` | `string` | No | Region-wide ambient sound |
| `ambientSmell` | `string` | No | Region-wide ambient smell |

## Assigning Rooms to Regions

After creating rooms, assign them to regions with `world.assignRoom()`:

```typescript
// Create rooms
const clearing = world.createEntity('clearing', EntityType.ROOM);
clearing.add(new RoomTrait({ exits: {}, isDark: false }));
clearing.add(new IdentityTrait({ name: 'Forest Clearing', description: '...' }));

const cave = world.createEntity('cave-entrance', EntityType.ROOM);
cave.add(new RoomTrait({ exits: {}, isDark: true }));
cave.add(new IdentityTrait({ name: 'Cave Entrance', description: '...' }));

// Assign to regions
world.assignRoom(clearing.id, 'reg-forest');
world.assignRoom(cave.id, 'reg-caves');
```

### Bulk Assignment

When your region files return ID maps, assign all rooms in a loop:

```typescript
const forestIds = createForestRegion(world);

for (const roomId of Object.values(forestIds)) {
  const entity = world.getEntity(roomId);
  if (entity?.get(RoomTrait)) {
    world.assignRoom(roomId, 'reg-forest');
  }
}
```

The `RoomTrait` check is important if your ID map includes non-room entity IDs.

## Nested Regions

Regions can nest via `parentRegionId`. A room in a child region is also considered to be in the parent:

```typescript
world.createRegion('reg-underground', {
  name: 'The Underground',
  defaultDark: true,
});

world.createRegion('reg-coal-mine', {
  name: 'Coal Mine',
  parentRegionId: 'reg-underground',
  defaultDark: true,
});

// A room in reg-coal-mine is also "in" reg-underground
world.isInRegion(mineShaftId, 'reg-underground'); // true
```

## Querying Regions

### Check Region Membership

```typescript
// Is this room in the forest?
if (world.isInRegion(roomId, 'reg-forest')) {
  // ...
}
```

### Find All Rooms in a Region

Using EntityQuery:

```typescript
const forestRooms = world.rooms.inRegion('reg-forest', world).toArray();
```

### Find All Entities Within a Region

```typescript
const caveItems = world.objects.withinRegion('reg-caves', world).toArray();
```

## Region Crossing Events

When the player moves between rooms in different regions, the engine automatically emits events:

- `if.event.region_exited` — emitted for each region being left (innermost first)
- `if.event.region_entered` — emitted for each region being entered (outermost first)

### Reacting to Region Crossings

```typescript
world.registerEventHandler('if.event.region_entered', (event, world) => {
  if (event.data.regionId === 'reg-caves') {
    // Player just entered the caves — show a warning
    // (your message registration handles the actual text)
  }
});

world.registerEventHandler('if.event.region_exited', (event, world) => {
  if (event.data.regionId === 'reg-forest') {
    // Player left the forest
  }
});
```

### Getting Crossings Programmatically

```typescript
const crossings = world.getRegionCrossings(fromRoomId, toRoomId);
// crossings.exited: string[]  — regions left, innermost first
// crossings.entered: string[] — regions entered, outermost first
```

## Region ID Conventions

Use a `reg-` prefix for region IDs to distinguish them from room IDs:

```typescript
world.createRegion('reg-forest', { name: 'Forest' });
world.createRegion('reg-village', { name: 'Village' });
world.createRegion('reg-dungeon', { name: 'Dungeon' });
```
