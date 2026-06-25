# Em-dash review — Chapter 04: Rooms & Navigation

### 1. "Putting it together" intro paragraph (line 77) — prose
OLD:
This chapter adds one new import — `Direction` — to the world-model line from
Chapter 2:

NEW:
This chapter adds one new import, `Direction`, to the world-model line from
Chapter 2:

### 2. `initializeWorld` Step 1 comment (line 94) — comment
OLD:
```typescript
initializeWorld(world: WorldModel): void {
  // Step 1 — create every room first, with empty exits.
  const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
```

NEW:
```typescript
initializeWorld(world: WorldModel): void {
  // Step 1: create every room first, with empty exits.
  const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
```

### 3. `initializeWorld` Step 2 comment (line 145) — comment
OLD:
```typescript
  // Step 2 — wire exits now that every room exists.
  entrance.get(RoomTrait)!.exits = {
    [Direction.SOUTH]: { destination: mainPath.id },
```

NEW:
```typescript
  // Step 2: wire exits now that every room exists.
  entrance.get(RoomTrait)!.exits = {
    [Direction.SOUTH]: { destination: mainPath.id },
```

### 4. `initializeWorld` Step 3 comment (line 161) — comment
OLD:
```typescript
  // Step 3 — scenery. The welcome sign and ticket booth from Chapter 2 stay
  // in the entrance; the three new rooms get scenery of their own. Each is the
  // same pattern you already know: an entity, an IdentityTrait, a SceneryTrait
  // so it can't be taken, and a moveEntity to place it.
```

NEW:
```typescript
  // Step 3: scenery. The welcome sign and ticket booth from Chapter 2 stay
  // in the entrance. The three new rooms get scenery of their own. Each is the
  // same pattern you already know which includes: an entity, an IdentityTrait,
  // a SceneryTrait (so it can't be taken), and a moveEntity to place it.
```

### 5. Ticket booth window text (line 180) — in-world
OLD:
```typescript
    description:
      'A small wooden booth with a sliding glass window reading ' +
      '"Self-Guided Tours — No Ticket Needed Today!"',
```

NEW:
LEAVE (in-world copy) — or if converting:
```typescript
    description:
      'A small wooden booth with a sliding glass window reading ' +
      '"Self-Guided Tours / No Ticket Needed Today!"',
```

### 6. Direction signs description (line 193) — in-world
OLD:
```typescript
    description:
      'A cluster of brightly colored arrow signs nailed to a wooden post. ' +
      'They point to: PETTING ZOO (east), AVIARY (west), ' +
      'REPTILE HOUSE (south — coming soon!), and EXIT (north).',
```

NEW:
LEAVE (in-world copy) — or if converting:
```typescript
    description:
      'A cluster of brightly colored arrow signs nailed to a wooden post. ' +
      'They point to: PETTING ZOO (east), AVIARY (west), ' +
      'REPTILE HOUSE (south -> coming soon!), and EXIT (north).',
```

### 7. `initializeWorld` Step 4 comment (line 226) — comment
OLD:
```typescript
  // Step 4 — place the player at the entrance, as in Chapter 2.
  const player = world.getPlayer();
  if (player) world.moveEntity(player.id, entrance.id);
```

NEW:
```typescript
  // Step 4: place the player at the entrance, as in Chapter 2.
  const player = world.getPlayer();
  if (player) world.moveEntity(player.id, entrance.id);
```

### 8. Key takeaway paragraph (line 269) — prose
OLD:
Rooms are connected by exits on `RoomTrait`, each mapping a `Direction` to a
destination room ID. Create every room before connecting them, and always wire
exits in both directions — or the player will get stuck.

NEW:
Rooms are connected by exits on `RoomTrait`, each mapping a `Direction` to a
destination room ID. Create every room before connecting them, and always wire
exits in both directions, otherwise the player will get stuck.
