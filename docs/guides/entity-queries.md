# EntityQuery Guide

## Overview

EntityQuery provides a fluent, chainable API for querying entities in the world model. Instead of writing loops and manual filtering, you can express queries declaratively:

```typescript
// Find all lit light sources in the dungeon
const torches = world.objects
  .withTrait('lightSource')
  .withinRegion('reg-dungeon', world)
  .where(e => e.get(LightSourceTrait)?.isLit === true)
  .toArray();
```

## Getting Started

EntityQuery is available on the concrete `WorldModel` class via convenience properties and methods.

### Built-in Entry Points

```typescript
world.all        // All entities
world.rooms      // All room entities
world.actors     // All actor entities (players + NPCs)
world.objects    // All object entities (items, containers, scenery)
world.scenes     // All scene entities
world.regions    // All region entities
```

### Scoped Queries

```typescript
world.contents(roomId)      // Direct contents of a room or container
world.allContents(roomId)   // Recursive contents (items inside containers inside the room)
world.having('container')   // All entities with a specific trait
world.visible(playerId)     // Entities visible to an observer
world.inScope(playerId)     // Entities in interaction scope
```

## Filtering

Chain filter methods to narrow results. Each returns a new `EntityQuery` — the original is not modified.

### By Trait

```typescript
// Entities with a trait
world.objects.withTrait('container')

// Entities without a trait
world.objects.withoutTrait('scenery')

// Combine: portable containers
world.objects.withTrait('container').withoutTrait('scenery')
```

### By Name

```typescript
// Exact name match (case-sensitive)
world.all.named('brass lantern')

// Fuzzy match against name and aliases (case-insensitive)
world.all.matching('lantern')
```

### By Entity Type

```typescript
world.all.ofType('room')
world.all.ofType('object')
```

### By Region

```typescript
// Rooms in a region (traverses parent hierarchy)
world.rooms.inRegion('reg-caves', world)

// Any entities located in rooms belonging to a region
world.objects.withinRegion('reg-caves', world)
```

### By Predicate

```typescript
// Custom filter — any condition you want
world.rooms.where(room => {
  const trait = room.get(RoomTrait);
  return trait?.isDark === true && Object.keys(trait.exits).length <= 1;
})
```

### Portable Items

```typescript
// Items without SceneryTrait
world.objects.portable()
```

## Retrieval

### Single Entity

```typescript
// First match, or undefined
const lamp = world.objects.named('brass lantern').first();

// First match, or throw
const lamp = world.objects.named('brass lantern').firstOrThrow('Lamp not found');

// Exactly one match — throws if zero or multiple
const lamp = world.objects.named('brass lantern').single();

// Last match
const lastRoom = world.rooms.last();

// By index
const thirdRoom = world.rooms.at(2);
```

### As Collections

```typescript
// Array
const darkRooms = world.rooms.where(r => r.get(RoomTrait)?.isDark).toArray();

// Map (keyed by entity ID)
const roomMap = world.rooms.toMap();

// Set of IDs
const roomIds = world.rooms.toIdSet();
```

## Aggregation

```typescript
// Count
const roomCount = world.rooms.count();
const darkCount = world.rooms.count(r => r.get(RoomTrait)?.isDark === true);

// Boolean checks
world.objects.withTrait('lightSource').any()                   // Are there any light sources?
world.rooms.all(r => r.get(RoomTrait)?.isDark === true)        // Are all rooms dark?
world.objects.withTrait('container').none()                     // No containers at all?
```

## Transformation

### Extract Data

```typescript
// Get room names
const names = world.rooms.select(r => r.get(IdentityTrait)?.name ?? r.id);

// Get all traits from containers
const containerTraits = world.objects.withTrait('container').traitsOf<ContainerTrait>('container');

// Flatten: get all exit destinations from all rooms
const allExits = world.rooms.selectMany(r => {
  const exits = r.get(RoomTrait)?.exits ?? {};
  return Object.values(exits).map(e => e.destination);
});
```

### Extract Traits

```typescript
// Get traits (undefined for entities that lack the trait)
const roomTraits = world.rooms.traits<RoomTrait>('room');

// Get traits, filtering out entities that lack it
const roomTraits = world.rooms.traitsOf<RoomTrait>('room');
```

## Ordering

```typescript
// Sort by name
const sorted = world.objects.orderBy(e => e.get(IdentityTrait)?.name ?? '');

// Sort descending
const byValue = world.objects
  .withTrait('treasure')
  .orderBy(e => e.get(TreasureTrait)?.trophyCaseValue ?? 0, 'desc');
```

## Set Operations

```typescript
const containers = world.having('container');
const openables = world.having('openable');

// Union: entities that are containers OR openable
const either = containers.union(openables);

// Intersection: entities that are both
const both = containers.intersect(openables);

// Difference: containers that are NOT openable
const closedOnly = containers.except(openables);

// Remove duplicates
const unique = either.distinct();
```

## Partitioning and Grouping

```typescript
// Pagination
const page2 = world.rooms.skip(10).take(10);

// Group by region
const byRegion = world.rooms.groupBy(r => r.get(RoomTrait)?.regionId ?? 'none');
// Returns Map<string, EntityQuery>

for (const [regionId, rooms] of byRegion) {
  console.log(`${regionId}: ${rooms.count()} rooms`);
}
```

## Iteration

```typescript
// for-of loop
for (const room of world.rooms) {
  console.log(room.get(IdentityTrait)?.name);
}

// forEach (returns the query for chaining)
world.objects.withTrait('lightSource').forEach(e => {
  console.log(`Light source: ${e.get(IdentityTrait)?.name}`);
});

// Spread into array
const allRooms = [...world.rooms];
```

## Common Patterns

### Find Where an Item Is

```typescript
const itemLocation = world.getLocation(itemId);
const room = itemLocation ? world.all.named(itemLocation).first() : undefined;
```

### Count Treasures in the Trophy Case

```typescript
const trophyContents = world.contents(trophyCaseId);
const treasureCount = trophyContents.withTrait('treasure').count();
```

### All NPCs in the Current Room

```typescript
const playerLoc = world.getLocation(playerId);
const npcsHere = playerLoc
  ? world.contents(playerLoc).withTrait('actor').withoutTrait('player')
  : [];
```

### Dark Rooms with No Light Source

```typescript
const dangerousRooms = world.rooms
  .where(r => r.get(RoomTrait)?.isDark === true)
  .where(r => {
    const contents = world.contents(r.id);
    return !contents.withTrait('lightSource').any(e => e.get(LightSourceTrait)?.isLit);
  })
  .toArray();
```

## Important Note

EntityQuery is available on the concrete `WorldModel` class, not the `IWorldModel` interface. Story code and internal platform code can use queries freely. Code that accepts `IWorldModel` (e.g., action interfaces) cannot use queries directly.
