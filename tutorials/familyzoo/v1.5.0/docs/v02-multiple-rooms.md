# Version 2: Multiple Rooms & Navigation

## What This Version Does

The zoo now has four locations: the Zoo Entrance, a Main Path, a Petting Zoo with pygmy goats, and an Aviary with a toucan. You can walk between them using compass directions — north, south, east, west.

## What's New (Compared to V1)

V1 had one room with nowhere to go. V2 adds three more rooms and connects them with exits. Everything from V1 (the entrance, the sign, the booth) is still here.

## What You'll Learn

### Room Connections via Exits

Rooms are connected through **exits** on the `RoomTrait`. Each exit maps a compass direction to a destination room:

```typescript
entranceRoom.exits = {
  [Direction.SOUTH]: { destination: mainPath.id },
};
```

This means: "when the player types `south` in the entrance, move them to the main path."

The `Direction` enum provides all the standard IF directions:

| Direction | Short Form | What the Player Types |
|-----------|-----------|----------------------|
| `Direction.NORTH` | `n` | "north", "n", "go north" |
| `Direction.SOUTH` | `s` | "south", "s", "go south" |
| `Direction.EAST` | `e` | "east", "e", "go east" |
| `Direction.WEST` | `w` | "west", "w", "go west" |
| `Direction.UP` | `u` | "up", "u", "go up" |
| `Direction.DOWN` | `d` | "down", "d", "go down" |
| `Direction.NORTHEAST` | `ne` | "northeast", "ne" |
| `Direction.NORTHWEST` | `nw` | "northwest", "nw" |
| `Direction.SOUTHEAST` | `se` | "southeast", "se" |
| `Direction.SOUTHWEST` | `sw` | "southwest", "sw" |
| `Direction.IN` | — | "in", "enter" |
| `Direction.OUT` | — | "out", "exit" |

### Exits Are One-Way

This is the most common mistake new authors make: **exits only go one direction.** If the entrance has a south exit to the main path, the player can walk south — but they can't walk back north unless the main path ALSO has a north exit to the entrance.

Always wire exits in pairs:

```typescript
// Entrance → Main Path
entranceRoom.exits = {
  [Direction.SOUTH]: { destination: mainPath.id },
};

// Main Path → Entrance (the return trip)
mainPathRoom.exits = {
  [Direction.NORTH]: { destination: entrance.id },
};
```

If you forget the return exit, the player gets stuck with no way back.

### Create First, Connect Second

You can't set an exit to a room that doesn't exist yet. If you try to reference `mainPath.id` before creating `mainPath`, you'll get an error.

The pattern is:

1. Create all rooms (with empty exits)
2. Wire up all exits after every room exists

```typescript
// Step 1: Create rooms with empty exits
const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
entrance.add(new RoomTrait({ exits: {} }));

const mainPath = world.createEntity('Main Path', EntityType.ROOM);
mainPath.add(new RoomTrait({ exits: {} }));

// Step 2: Wire exits now that both rooms exist
const entranceRoom = entrance.get(RoomTrait)!;
entranceRoom.exits = {
  [Direction.SOUTH]: { destination: mainPath.id },
};
```

### Getting a Trait Back

Once you've attached a trait to an entity, you can retrieve it later with `.get()`:

```typescript
const entranceRoom = entrance.get(RoomTrait)!;
```

The `!` (non-null assertion) tells TypeScript "I know this trait exists." If you're not sure whether an entity has a trait, use an `if` check instead:

```typescript
const roomTrait = entrance.get(RoomTrait);
if (roomTrait) {
  roomTrait.exits = { ... };
}
```

### The Going Action

You don't need to write any code to handle movement. Sharpee's standard library includes a `going` action that:

1. Looks at the current room's exits
2. Finds the exit matching the player's direction
3. Moves the player to the destination room
4. Displays the new room's description

All of this happens automatically when the player types a direction command.

## The Zoo Map

```
                    Zoo Entrance
                         |
                       south
                         |
          Aviary ---  Main Path  --- Petting Zoo
              east ←    ↕    → east
              west →    ↕    ← west
                       north
                         |
                    Zoo Entrance
```

## Commands to Try

```
> look                  See where you are
> south                 Walk to the Main Path
> examine signs         Read the direction signs
> east                  Walk to the Petting Zoo
> examine goats         Look at the pygmy goats
> west                  Back to the Main Path
> west                  Walk to the Aviary
> examine toucan        Look at the toucan
> east                  Back to the Main Path
> north                 Back to the Zoo Entrance
```

## The Code

See `src/v02.ts` for the complete, commented source.

## Key Takeaway

Rooms are connected by exits on `RoomTrait`. Each exit maps a `Direction` to a destination room ID. Always wire exits in both directions, and create all rooms before connecting them.
