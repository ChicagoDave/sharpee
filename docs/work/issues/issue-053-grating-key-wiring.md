# ISSUE-053: Grating / Skeleton Key Wiring Is Broken

**Reported**: 2026-03-23
**Severity**: High
**Component**: dungeo (story)

## Description

The grating puzzle (Clearing ↔ Grating Room) has four distinct problems that make it non-functional. The player can walk through a locked grating, and the skeleton key can't unlock anything.

## Problems

### 1. Duplicate grating entities

Two separate grating entities are created:

- **forest.ts:252** — `createClearingObjects()` creates a grating entity with `OpenableTrait` and `SceneryTrait` in the Clearing
- **maze.ts:567** — `createGratingRoomObjects()` creates a *different* grating entity with `OpenableTrait`, `LockableTrait`, and `SceneryTrait` in the Grating Room

In the original game, there is one grating visible from both sides. Opening/unlocking it from below (Grating Room) also opens it from above (Clearing). With two entities, unlocking the one in the Grating Room has no effect on the one in the Clearing.

**Fix**: One grating entity, placed in one room but referenced by both rooms' exits via the `via` field on the exit config. The grating in the Clearing and the grating in the Grating Room are the same physical object.

### 2. `key.attributes.unlocksId` is a no-op

At maze.ts:627:
```typescript
key.attributes.unlocksId = 'metal grating';
```

Nothing in the engine or stdlib reads `attributes.unlocksId`. This is a loose attribute that has no effect. The `LockableBehavior.canUnlockWith()` method checks `lockable.keyId` and `lockable.keyIds` on the *target entity's* `LockableTrait` — it does not look at the key's attributes.

**Fix**: Remove `key.attributes.unlocksId`. The key-to-lock relationship is defined on the lock, not the key.

### 3. `LockableTrait` has no `keyId`

At maze.ts:577:
```typescript
grating.add(new LockableTrait({
  startsLocked: true,
  isLocked: true
  // keyId is missing!
}));
```

Without `keyId`, `LockableBehavior.requiresKey()` returns false, which means *any* unlock attempt succeeds without a key. Conversely if there's a future fix that adds key-checking, no key would match because no `keyId` is set.

**Fix**: Set `keyId` to the skeleton key's entity ID. Since both entities are created in `createMazeObjects()`, the key's ID is available after `createMaze5Objects()` runs. This requires either:
- Returning the key entity from `createMaze5Objects()`, or
- Looking up the key by name after creation

### 4. Exits don't check the grating

`connectMazeToClearing()` at maze.ts:428 sets plain exits:
```typescript
roomTrait.exits[Direction.UP] = { destination: clearingId };
roomTrait.exits[Direction.DOWN] = { destination: mazeIds.gratingRoom };
```

The going action already supports door/barrier checking via the `via` field on exit configs:
```typescript
// going.ts:207
if (exitConfig.via) {
  const door = context.world.getEntity(exitConfig.via);
  // checks LockableBehavior.isLocked() and OpenableBehavior.isOpen()
}
```

But the exits have no `via` field, so the going action never checks whether the grating is open or locked. The player walks straight through.

**Fix**: Set `via` on both the UP and DOWN exits to the grating entity's ID:
```typescript
roomTrait.exits[Direction.UP] = { destination: clearingId, via: gratingId };
roomTrait.exits[Direction.DOWN] = { destination: mazeIds.gratingRoom, via: gratingId };
```

## Correct Behavior (per original Zork)

1. Grating starts **locked and closed**
2. From the Clearing: `> open grating` → "The grating is locked." `> go down` → "The grating is closed."
3. Player finds skeleton key in Maze 5 (near the skeleton)
4. From the Grating Room: `> unlock grating with key` → unlocks the grating
5. `> open grating` → opens the grating (now passable from both sides)
6. From the Clearing: `> go down` → enters Grating Room
7. From the Grating Room: `> go up` → returns to Clearing

## Implementation Plan

1. **Remove** the duplicate grating entity from `createClearingObjects()` in forest.ts. The Clearing still has the pile of leaves.
2. **Move** the single grating entity creation to `connectMazeToClearing()` (or a new function called from there) so it's created at connection time when both room IDs are available.
3. **Set `keyId`** on the grating's `LockableTrait` to the skeleton key's entity ID. This requires `createMaze5Objects()` to return the key ID, or a lookup after creation.
4. **Set `via`** on both exits (Clearing DOWN and Grating Room UP) to the grating entity ID.
5. **Remove** `key.attributes.unlocksId` from the skeleton key.
6. **Place** the grating entity in the Grating Room (it's physically set into the ceiling from below / the ground from above).
7. **Add a transcript test** for the grating puzzle: unlock with key, open, go through both directions, and verify blocked states.
