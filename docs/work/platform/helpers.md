# Plan: Add Convenience Creators to WorldModel

## Overview

Add `createRoom()`, `createObject()`, `createScenery()`, `connectRooms()`, `createDoor()` convenience methods to WorldModel. These handle common trait bundles and reduce boilerplate in story setup code.

## Why WorldModel, Not AuthorModel

Story code already uses `world.createEntity()` + `entity.add(trait)` for ~95% of entity creation. Putting helpers on WorldModel means no workflow change — stories keep using `world` for everything.

AuthorModel's purpose is bypassing validation (placing items in closed containers, debug teleport). It's used in only 4 places in Dungeo, all for that specific reason. Adding creation helpers to AuthorModel would force stories to switch models for normal setup, which is the wrong direction.

**AuthorModel stays as-is** for its 3 closed-container placements and GDT debug commands.

## File to Modify

`packages/world-model/src/world/WorldModel.ts`

## New Methods

All methods create an entity via `createEntity()`, add the appropriate trait bundle, and return the entity for further customization.

```typescript
createRoom(id: string, name: string, opts?: {
  description?: string;
  aliases?: string[];
  isDark?: boolean;
  isOutdoors?: boolean;
  isUnderground?: boolean;
  region?: string;
}): IFEntity
// Adds: IdentityTrait + RoomTrait

createObject(id: string, name: string, opts?: {
  description?: string;
  aliases?: string[];
  adjectives?: string[];
  article?: string;
  weight?: number;
  readable?: string;        // if set, adds ReadableTrait with this text
}): IFEntity
// Adds: IdentityTrait, optionally ReadableTrait

createScenery(id: string, name: string, opts?: {
  description?: string;
  aliases?: string[];
}): IFEntity
// Adds: IdentityTrait + SceneryTrait

connectRooms(room1Id: string, room2Id: string, direction: string): void
// Creates bidirectional exit connection between two rooms
// Note: AuthorModel already has connect() — this is the validated equivalent

createDoor(id: string, name: string, opts: {
  room1Id: string;
  room2Id: string;
  direction: string;        // direction from room1 to room2
  description?: string;
  aliases?: string[];
  isOpen?: boolean;
  isLocked?: boolean;
  keyId?: string;
}): IFEntity
// Creates door entity + wires it into both rooms' exit data
// Adds: IdentityTrait + DoorTrait + OpenableTrait, optionally LockableTrait
```

## Design Notes

- **Explicit IDs**: Story code uses meaningful IDs like `'dungeo.room.kitchen'`. All methods take an explicit `id` parameter — no auto-generation.
- **connectRooms vs AuthorModel.connect()**: Same logic (bidirectional with auto-opposite direction), but lives on WorldModel so stories don't need AuthorModel for basic room wiring.
- **createDoor is the high-value helper**: Doors require creating an entity AND modifying two rooms' exit data. This multi-step boilerplate is exactly what a helper should eliminate.
- **No createContainer/createNPC yet**: These can be added later if the pattern proves useful. Start with the most common operations.

## Verification

1. `./build.sh --skip stdlib -s dungeo` — build succeeds
2. Optionally refactor one region file (e.g. white-house.ts) to use new helpers to validate ergonomics — but this is a story change so discuss first
