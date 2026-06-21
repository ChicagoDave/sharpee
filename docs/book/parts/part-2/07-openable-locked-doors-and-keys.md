# Openable Things, Locked Doors & Keys

The containers in the last chapter gave up their contents freely. Real worlds make
you work a little: a lunchbox you must open before you can reach the juice inside,
a staff gate that stays shut until you find the right keycard. This chapter adds
the *closed* state — first to containers, then to doors — and along the way wires
up the zoo's first real puzzle: find a key, unlock a gate, walk through.

It builds in two steps. `OpenableTrait` adds open and closed. `LockableTrait`
adds locked and unlocked on top of it. Doors then connect rooms through that
machinery.

## OpenableTrait

`OpenableTrait` gives an entity an open/closed state and hooks up the built-in
`open` and `close` actions. On its own it just tracks a boolean; its power comes
from combining with other traits.

```typescript
lunchbox.add(new OpenableTrait({
  isOpen: false,          // starts closed
  canClose: true,         // the player can close it again
  revealsContents: true,  // opening announces what's inside
}));
```

The three properties:

| Property | Default | What it does |
|---|---|---|
| `isOpen` | `false` | Current state — open or closed |
| `canClose` | `true` | Whether the player can close it again after opening |
| `revealsContents` | `true` | Whether opening prints "Inside you can see…" |

### Openable + Container = a discoverable container

Put `OpenableTrait` and `ContainerTrait` on the same entity and the closed state
starts to matter:

- **Closed:** contents are hidden. `look in lunchbox` reports it's closed;
  `put map in lunchbox` is blocked.
- **Open:** contents are visible and every container operation works normally.

This is how you make the player *discover* things — they open something and find
items they couldn't see before.

### Stocking a container that starts closed

Here's a wrinkle you'll hit during world setup. You want the lunchbox to start
closed, but you also want a juice box inside it from the beginning. The engine
enforces the same rules on you that it enforces on the player: you can't
`moveEntity` into a closed container. The fix is to open it, place the item, and
close it back:

```typescript
lunchbox.get(OpenableTrait)!.isOpen = true;   // temporarily open
world.moveEntity(juice.id, lunchbox.id);       // place the item inside
lunchbox.get(OpenableTrait)!.isOpen = false;   // close it again
```

> **The mistake everyone makes once:** calling `moveEntity` into a container
> that's closed at setup time and wondering why the item never appears. The
> engine plays by its own rules during `initializeWorld()` — open the container,
> stock it, then close it.

## LockableTrait

A lock is just a gate on opening. `LockableTrait` adds locked/unlocked state, and
it's almost always paired with `OpenableTrait`, because the entire point of a lock
is to stop something from being opened.

```typescript
staffGate.add(new LockableTrait({
  isLocked: true,      // starts locked
  keyId: keycard.id,   // THIS key unlocks THIS lock
}));
```

The critical property is `keyId`. It wires one specific key entity to one specific
lock. When the player types `unlock gate with keycard`, the engine asks: does the
player hold an entity whose `id` matches this lock's `keyId`? If so, the unlock
succeeds.

### Keys are just items

A key needs no special trait. It's an ordinary `EntityType.ITEM` with an
`IdentityTrait` — nothing more. The *only* thing that makes it a key is that some
lock's `keyId` points at its `id`. Which means anything can be a key: a literal
key, a keycard, a gemstone, a spoken word. The lock decides what opens it, not the
key.

### The unlock sequence

A locked door asks three separate actions of the player, in order:

1. **Find the key** — `take keycard`
2. **Unlock the lock** — `unlock gate with keycard`
3. **Open the door** — `open gate`

Only after all three can they pass. That sequence is a puzzle in miniature, and
you get it for free just by combining the traits.

## DoorTrait and the exit `via` property

A locked lunchbox is one thing; a locked *door between rooms* is what makes the
zoo bigger. Two pieces connect a door to the map.

First, `DoorTrait` marks an entity as the connection between two rooms:

```typescript
staffGate.add(new DoorTrait({
  room1: mainPath.id,      // one side
  room2: supplyRoom.id,    // the other side
  bidirectional: true,     // passable both ways
}));
```

Second — and this is the part that's easy to forget — the rooms' exits must route
*through* the door using the `via` property:

```typescript
mainPathRoom.exits = {
  [Direction.SOUTH]: {
    destination: supplyRoom.id,
    via: staffGate.id,          // must pass through this entity
  },
};
```

Now when the player types `south`, the going action checks the `via` entity
before moving them:

- Is it closed? → *"The staff gate is closed."*
- Is it locked? → *"The staff gate is locked."*
- Is it open? → the player walks through.

> **The mistake everyone makes once:** giving the gate every trait but forgetting
> `via` on the exit. Without `via`, the going action never consults the door — the
> exit is unconditional and the player strolls through a "locked" gate as if it
> weren't there. The door's state only matters because the exit points at it.

## Wiring it all together

A working locked door is five traits on the door entity, plus a key, plus the
`via` on the exit:

| Trait | Purpose |
|---|---|
| `IdentityTrait` | Name, description, aliases |
| `DoorTrait` | Connects two rooms |
| `OpenableTrait` | Can be opened and closed |
| `LockableTrait` | Can be locked and unlocked with a key |
| `SceneryTrait` | Can't be picked up |

Plus a **key** — any portable item whose `id` you put in `LockableTrait.keyId` —
and **exits with `via`** pointing at the door from both sides.

```typescript
const staffGate = world.createEntity('staff gate', EntityType.SCENERY);
staffGate.add(new IdentityTrait({
  name: 'staff gate',
  description: 'A chain-link gate marked STAFF ONLY, with a card reader beside it.',
  aliases: ['gate', 'staff gate'],
}));
staffGate.add(new DoorTrait({ room1: mainPath.id, room2: supplyRoom.id, bidirectional: true }));
staffGate.add(new OpenableTrait({ isOpen: false }));
staffGate.add(new LockableTrait({ isLocked: true, keyId: keycard.id }));
staffGate.add(new SceneryTrait());
```

## Try it

```
> take keycard                Pick up the keycard
> south                       Go to the Main Path
> south                       "The staff gate is locked."
> unlock gate with keycard    Unlock it
> open gate                   Open it
> south                       Walk through to the Supply Room
> examine shelves             Look around the supply room
> north                       Back through the open gate
```

## Key takeaway

`OpenableTrait` adds open/closed state and the `open`/`close` actions; combined
with `ContainerTrait` it hides contents until opened. `LockableTrait` adds a lock
on top, with `keyId` wiring one key to one lock — and keys are just ordinary
items. A door between rooms needs `DoorTrait` *and* a `via` on the exits pointing
at it, or the going action will never check the door at all.
