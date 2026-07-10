::: {.part-page}

# Volume II — Building a World {.part .unnumbered}

:::

# Rooms & Navigation: Exits Wired in Pairs

One room is a demo, not a game. In this chapter the zoo grows to four
locations: the Zoo Entrance, a Main Path, a Petting Zoo, and an Aviary. The
player can walk between them with compass directions: north, south, east, west.

Everything from the first chapter is still here. We're adding rooms and the
connections between them.

## Exits live on the room

Rooms are connected through **exits** on the `RoomTrait`. Each exit maps a
compass direction to a destination, which is just the ID of another room. The
fragments in this section and the next are shapes to read, not code to type
(the illustrative rule): `entranceRoom` stands for the entrance's `RoomTrait`,
which the `.get()` section below shows you how to fetch, and the complete
listing at the end of the chapter wires every exit inline without that
intermediate variable.

```typescript
entranceRoom.exits = {
  [Direction.SOUTH]: { destination: mainPath.id },
};
```

Read that as: "when the player types `south` in the entrance, move them to the
main path." The `Direction` enum gives you all the standard IF directions:
`NORTH`, `SOUTH`, `EAST`, `WEST`, `UP`, `DOWN`, the four diagonals, and `IN` /
`OUT`. The parser already understands the short forms (`n`, `se`, and so on), so
you never spell those out yourself.

## Two rules that trip up everyone

**Exits are one-way.** This is the single most common beginner mistake. If the
entrance has a south exit to the main path, the player can walk south, but they
*cannot* walk back unless the main path also has a north exit to the entrance.
Always wire exits in pairs:

```typescript
entranceRoom.exits = {
  // entrance → path
  [Direction.SOUTH]: { destination: mainPath.id },
};
mainPathRoom.exits = {
  // path → entrance (the way back)
  [Direction.NORTH]: { destination: entrance.id },
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

The `!` is a non-null assertion: "I know this room has a `RoomTrait`." If you
aren't certain an entity has the trait, check instead of asserting:

```typescript
const roomTrait = entrance.get(RoomTrait);
if (roomTrait) {
  roomTrait.exits = { /* ... */ };
}
```

## First visits get their own prose

A room can carry two descriptions. The `description` on its `IdentityTrait` is
the standing text: it prints every time the player looks or walks back in. The
`RoomTrait` can also hold an **`initialDescription`**, and when it does, that
text prints instead on the player's first visit only. The distinction matters
because arrival prose reads perfectly once and oddly ever after: "You step
inside a soaring mesh dome" is exactly right the first time the player walks
into the Aviary, and slightly wrong every time after, when they are already
standing in it.

So the Aviary gets the pair. The arrival moment keeps its drama in
`initialDescription`, and the standing `description` settles into plain
present tense:

```typescript
const aviary = world.createEntity('Aviary', EntityType.ROOM);
aviary.add(new RoomTrait({
  exits: {},
  isDark: false,
  initialDescription:
    'You step inside a soaring mesh dome. Brilliantly ' +
    'colored parrots chatter from rope perches, and a toucan ' +
    'eyes you curiously from a branch overhead. The exit ' +
    'back to the main path is to the east.',
}));
aviary.add(new IdentityTrait({
  name: 'Aviary',
  description:
    'Inside the soaring mesh dome, brilliantly colored ' +
    'parrots chatter from rope perches, and a toucan eyes ' +
    'you curiously from a branch overhead. The exit back to ' +
    'the main path is to the east.',
  aliases: ['aviary', 'bird house', 'dome'],
  article: 'the',
}));
```

Most rooms don't need the pair; write one only where the arrival genuinely
reads differently from the stay. (For a localized story there is a message-ID
variant, `initialDescriptionId`; Chapter 18 covers the language layer.)

## Putting it together

This chapter adds one new import, `Direction`, to the world-model line from
Chapter 2:

```typescript
import {
  WorldModel, IFEntity, EntityType, Direction,
} from '@sharpee/world-model';
```

Here is the complete `initializeWorld` for this version. It replaces the
single-room one from Chapter 2: four rooms with full descriptions, the exits wired
in both directions, the scenery for every room (your Chapter 2 welcome sign and
ticket booth, plus three new objects for the new rooms), and the player placed at
the entrance.

```typescript
initializeWorld(world: WorldModel): void {
  // Step 1: create every room first, with empty exits.
  const entrance = world.createEntity(
    'Zoo Entrance',
    EntityType.ROOM,
  );
  entrance.add(new RoomTrait({ exits: {}, isDark: false }));
  entrance.add(new IdentityTrait({
    name: 'Zoo Entrance',
    description:
      'You stand before the gates of the Willowbrook Family ' +
      'Zoo. A cheerful welcome sign arches over the entrance, ' +
      'and a small ticket booth sits to one side. The main ' +
      'path leads south into the zoo grounds.',
    aliases: ['entrance', 'gates', 'gate'],
    article: 'the',
  }));

  const mainPath = world.createEntity(
    'Main Path',
    EntityType.ROOM,
  );
  mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
  mainPath.add(new IdentityTrait({
    name: 'Main Path',
    description:
      'A wide gravel path winds through the heart of the zoo. ' +
      'Colorful direction signs point every which way. To the ' +
      'east, a white picket fence surrounds the petting zoo. ' +
      'To the west, a tall mesh enclosure rises above the ' +
      'treetops, the aviary. The entrance gates are back to ' +
      'the north.',
    aliases: ['path', 'main path', 'gravel path'],
    article: 'the',
  }));

  const pettingZoo = world.createEntity(
    'Petting Zoo',
    EntityType.ROOM,
  );
  pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
  pettingZoo.add(new IdentityTrait({
    name: 'Petting Zoo',
    description:
      'A cheerful open-air enclosure filled with friendly ' +
      'animals. Pygmy goats trot around nibbling at visitors\' ' +
      'shoelaces, while a pair of fluffy rabbits hop near a ' +
      'hay bale. The main path is back to the west.',
    aliases: ['petting zoo', 'petting area', 'pen'],
    article: 'the',
  }));

  const aviary = world.createEntity('Aviary', EntityType.ROOM);
  aviary.add(new RoomTrait({
    exits: {},
    isDark: false,
    initialDescription:
      'You step inside a soaring mesh dome. Brilliantly ' +
      'colored parrots chatter from rope perches, and a toucan ' +
      'eyes you curiously from a branch overhead. The exit ' +
      'back to the main path is to the east.',
  }));
  aviary.add(new IdentityTrait({
    name: 'Aviary',
    description:
      'Inside the soaring mesh dome, brilliantly colored ' +
      'parrots chatter from rope perches, and a toucan eyes ' +
      'you curiously from a branch overhead. The exit back to ' +
      'the main path is to the east.',
    aliases: ['aviary', 'bird house', 'dome'],
    article: 'the',
  }));

  // Step 2: wire exits now that every room exists.
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

  // Step 3: scenery. The welcome sign and ticket booth from
  // Chapter 2 stay in the entrance. The three new rooms get
  // scenery of their own. Each is the same pattern you already
  // know: an entity, an IdentityTrait, and a moveEntity to place
  // it. The EntityType.SCENERY type makes each one fixed.
  const sign = world.createEntity(
    'welcome sign',
    EntityType.SCENERY,
  );
  sign.add(new IdentityTrait({
    name: 'welcome sign',
    description:
      'A brightly painted wooden sign welcomes you to the zoo.',
    aliases: ['sign', 'welcome sign', 'wooden sign'],
    article: 'a',
  }));
  world.moveEntity(sign.id, entrance.id);

  const booth = world.createEntity(
    'ticket booth',
    EntityType.SCENERY,
  );
  booth.add(new IdentityTrait({
    name: 'ticket booth',
    description:
      'A small wooden booth with a sliding glass window ' +
      'reading "Self-Guided Tours / No Ticket Needed Today!"',
    aliases: ['booth', 'ticket booth', 'window'],
    article: 'a',
  }));
  world.moveEntity(booth.id, entrance.id);

  const directionSigns = world.createEntity(
    'direction signs',
    EntityType.SCENERY,
  );
  directionSigns.add(new IdentityTrait({
    name: 'direction signs',
    description:
      'A cluster of brightly colored arrow signs nailed to a ' +
      'wooden post. They point to: PETTING ZOO (east), AVIARY ' +
      '(west), REPTILE HOUSE (south -> coming soon!), and EXIT ' +
      '(north).',
    aliases: ['signs', 'direction signs', 'arrow signs', 'post'],
    article: 'some',
    grammaticalNumber: 'plural',
  }));
  world.moveEntity(directionSigns.id, mainPath.id);

  const goats = world.createEntity(
    'pygmy goats',
    EntityType.SCENERY,
  );
  goats.add(new IdentityTrait({
    name: 'pygmy goats',
    description:
      'Three pygmy goats with stubby legs and rectangular ' +
      'pupils, clearly hoping you have food.',
    aliases: ['goats', 'pygmy goats', 'goat'],
    article: 'some',
    grammaticalNumber: 'plural',
  }));
  world.moveEntity(goats.id, pettingZoo.id);

  const toucan = world.createEntity('toucan', EntityType.SCENERY);
  toucan.add(new IdentityTrait({
    name: 'toucan',
    description:
      'A Toco toucan with an enormous orange-and-black bill. ' +
      'It regards you with one intelligent eye.',
    aliases: ['toucan', 'bird', 'toco toucan'],
    article: 'a',
  }));
  world.moveEntity(toucan.id, aviary.id);

  // Step 4: place the player at the entrance, as in Chapter 2.
  const player = world.getPlayer();
  if (player) world.moveEntity(player.id, entrance.id);
}
```

The method is complete; nothing is abbreviated with an "as before" comment. The
`direction signs` on the Main Path are what `examine signs` in the "Try it" list
below reads.

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

One line can carry several commands: `south. east`, `west; west`, or
`east then north` all work, and each statement runs as its own full turn. If a
statement fails, the rest of the line is dropped; the parser won't march on
after a wrong turn.

## Test it

A forgotten return exit is the classic map bug, and nothing catches it faster
than replaying the round trip. Save this as
`tests/transcripts/navigation.transcript` and run `npx sharpee build --test`;
your first-room test runs right alongside it:

```text
title: Navigation
story: familyzoo
description: Four rooms wired in pairs

---

> south
[OK: contains "Main Path"]

> examine signs
[OK: contains "PETTING ZOO"]

> east
[OK: contains "Petting Zoo"]

> west
[OK: contains "Main Path"]

> west
[OK: contains "Aviary"]

> east
[OK: contains "Main Path"]

> north
[OK: contains "Zoo Entrance"]
```

## Key takeaway

Rooms are connected by exits on `RoomTrait`, each mapping a `Direction` to a
destination room ID. Create every room before connecting them, and always wire
exits in both directions, otherwise the player will get stuck.
