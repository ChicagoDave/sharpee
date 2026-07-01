# Version 7: Locked Doors & Keys

## What This Version Does

A staff gate now blocks the path south from the main path. It's locked. You need to find the keycard at the entrance and use it to unlock the gate, then open it, then walk through to reach the supply room.

## What's New (Compared to V6)

V6 introduced openable containers. V7 adds locks — entities that can't be opened until they're unlocked with the right key. It also introduces doors and the exit `via` property.

## What You'll Learn

### LockableTrait

LockableTrait adds lock/unlock state to any entity. It's almost always combined with OpenableTrait, because the whole point of a lock is preventing something from being opened.

```typescript
staffGate.add(new LockableTrait({
  isLocked: true,          // Starts locked
  keyId: keycard.id,       // THIS key unlocks THIS lock
}));
```

The critical property is `keyId` — it creates the wiring between a specific key entity and a specific lock. When the player types `unlock gate with keycard`, the engine checks: does the player have an entity whose ID matches this lock's `keyId`?

### The Unlock Sequence

A locked door requires three steps from the player:

1. **Find the key** — `take keycard`
2. **Unlock the lock** — `unlock gate with keycard`
3. **Open the door** — `open gate`

Only after all three steps can they walk through. This is realistic and creates natural puzzles.

### DoorTrait

DoorTrait marks an entity as a connection between two rooms:

```typescript
staffGate.add(new DoorTrait({
  room1: mainPath.id,        // One side of the door
  room2: supplyRoom.id,      // Other side
  bidirectional: true,       // Can go through both ways
}));
```

This tells the engine which rooms the door sits between, so it can be visible from either side.

### Exit `via` Property

The key to making doors work is the `via` property on room exits:

```typescript
mainPathRoom.exits = {
  [Direction.SOUTH]: {
    destination: supplyRoom.id,
    via: staffGate.id,          // Must pass through this entity
  },
};
```

When the player types `south`, the going action checks the `via` entity:
- Is it closed? → "The staff gate is closed."
- Is it locked? → "The staff gate is locked."
- Is it open? → Player walks through.

Without `via`, the exit would be unconditional — the player could always walk through regardless of the gate's state.

### Wiring It All Together

A locked door needs five traits working together:

| Trait | Purpose |
|-------|---------|
| `IdentityTrait` | Name, description, aliases |
| `DoorTrait` | Connects two rooms |
| `OpenableTrait` | Can be opened/closed |
| `LockableTrait` | Can be locked/unlocked with a key |
| `SceneryTrait` | Can't be picked up |

Plus:
- A **key entity** (any portable item — its `id` goes in `LockableTrait.keyId`)
- Exits with **`via`** pointing to the door entity

### Keys Are Just Items

A key doesn't need any special trait. It's just a regular `EntityType.ITEM` with an `IdentityTrait`. The only thing that makes it a "key" is that some `LockableTrait` references its `id` in `keyId`.

This means anything can be a key — a literal key, a keycard, a magic word, a gemstone. The lock decides what unlocks it, not the key.

## Commands to Try

```
> take keycard                Pick up the keycard
> south                       Go to Main Path
> south                       "The staff gate is locked."
> unlock gate with keycard    Unlock it
> open gate                   Open it
> south                       Walk through to Supply Room
> examine shelves             Look at the supply room
> north                       Back through the open gate
```

## The Code

See `src/v07.ts` for the complete, commented source.

## Key Takeaway

LockableTrait prevents opening until unlocked with the right key. The `keyId` property wires a key to a lock. Exit `via` makes the going action check a door entity before letting the player through. Keys are just items — the lock decides what fits.
