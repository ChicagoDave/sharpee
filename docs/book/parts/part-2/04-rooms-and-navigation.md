::: part-page
![](assets/sharpee-sword.png){.part-sword}

# Part II — Building a World {.part .unnumbered}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde
omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam
rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto.
:::

# Rooms & Navigation

One room is a demo, not a game. In this chapter the zoo grows to four
locations — the Zoo Entrance, a Main Path, a Petting Zoo, and an Aviary — and the
player can walk between them with compass directions: north, south, east, west.

Everything from the first chapter is still here. We're adding rooms and the
connections between them.

## Exits live on the room

Rooms are connected through **exits** on the `RoomTrait`. Each exit maps a
compass direction to a destination, which is just the ID of another room:

```typescript
entranceRoom.exits = {
  [Direction.SOUTH]: { destination: mainPath.id },
};
```

Read that as: "when the player types `south` in the entrance, move them to the
main path." The `Direction` enum gives you all the standard IF directions —
`NORTH`, `SOUTH`, `EAST`, `WEST`, `UP`, `DOWN`, the four diagonals, and `IN` /
`OUT`. The parser already understands the short forms (`n`, `se`, and so on), so
you never spell those out yourself.

## Two rules that trip up everyone

**Exits are one-way.** This is the single most common beginner mistake. If the
entrance has a south exit to the main path, the player can walk south — but they
*cannot* walk back unless the main path also has a north exit to the entrance.
Always wire exits in pairs:

```typescript
entranceRoom.exits = {
  [Direction.SOUTH]: { destination: mainPath.id },   // entrance → path
};
mainPathRoom.exits = {
  [Direction.NORTH]: { destination: entrance.id },    // path → entrance (the way back)
};
```

Forget the return exit and the player gets stranded.

**Create first, connect second.** An exit needs its destination's ID, and you
can't reference a room that doesn't exist yet. So build every room with empty
exits first, then wire the exits once they all exist.

## Getting a trait back with `.get()`

In the first chapter we only ever *added* traits. To wire exits we need to read
a trait back off an entity, which is what `.get()` does:

```typescript
const entranceRoom = entrance.get(RoomTrait)!;
entranceRoom.exits = { /* ... */ };
```

The `!` is a non-null assertion — "I know this room has a `RoomTrait`." If you
aren't certain an entity has the trait, check instead of asserting:

```typescript
const roomTrait = entrance.get(RoomTrait);
if (roomTrait) {
  roomTrait.exits = { /* ... */ };
}
```

## Putting it together

Create all four rooms, then wire the exits in both directions:

```typescript
initializeWorld(world: WorldModel): void {
  // Step 1 — create every room first, with empty exits.
  const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
  entrance.add(new RoomTrait({ exits: {}, isDark: false }));
  entrance.add(new IdentityTrait({ name: 'Zoo Entrance', /* description, aliases */ }));

  const mainPath = world.createEntity('Main Path', EntityType.ROOM);
  mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
  mainPath.add(new IdentityTrait({ name: 'Main Path', /* ... */ }));

  const pettingZoo = world.createEntity('Petting Zoo', EntityType.ROOM);
  pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
  pettingZoo.add(new IdentityTrait({ name: 'Petting Zoo', /* ... */ }));

  const aviary = world.createEntity('Aviary', EntityType.ROOM);
  aviary.add(new RoomTrait({ exits: {}, isDark: false }));
  aviary.add(new IdentityTrait({ name: 'Aviary', /* ... */ }));

  // Step 2 — wire exits now that every room exists.
  entrance.get(RoomTrait)!.exits = {
    [Direction.SOUTH]: { destination: mainPath.id },
  };
  mainPath.get(RoomTrait)!.exits = {
    [Direction.NORTH]: { destination: entrance.id },
    [Direction.EAST]:  { destination: pettingZoo.id },
    [Direction.WEST]:  { destination: aviary.id },
  };
  pettingZoo.get(RoomTrait)!.exits = {
    [Direction.WEST]: { destination: mainPath.id },
  };
  aviary.get(RoomTrait)!.exits = {
    [Direction.EAST]: { destination: mainPath.id },
  };

  // ...scenery and the player are placed exactly as before.
}
```

Don't forget to `import { Direction } from '@sharpee/world-model'`.

## The going action is free

You don't write any movement code. Sharpee's standard library includes a
**going** action that, when the player types a direction, looks up the current
room's exits, finds the matching one, moves the player to the destination, and
prints the new room's description. Wiring the exits is the whole job.

## The map

```
            Zoo Entrance
                 |  (south / north)
              Main Path
            /            \
   (west) Aviary      Petting Zoo (east)
```

## Try it

```
> south                 Walk to the Main Path
> examine signs         Read the direction signs
> east                  Walk to the Petting Zoo
> west                  Back to the Main Path
> west                  Walk to the Aviary
> east                  Back to the Main Path
> north                 Back to the Zoo Entrance
```

## Key takeaway

Rooms are connected by exits on `RoomTrait`, each mapping a `Direction` to a
destination room ID. Create every room before connecting them, and always wire
exits in both directions — or the player will get stuck.
