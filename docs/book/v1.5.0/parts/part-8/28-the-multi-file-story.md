::: {.part-page}

# Volume VIII — Shipping {.part .unnumbered}

:::

# The Multi-File Story: Putting It All Together

Every chapter so far has shown a fragment: a trait here, a daemon there, a custom
action on its own. A real story is all of it at once, and by now the Family Zoo has
grown past what one file should hold. This chapter is the turn from *learning
Sharpee* to *shipping a Sharpee game*. It starts where every growing project does:
splitting one long file into many.

## When one file stops working

Through most of this book the zoo lived in a single source file because each version
added just one idea. By version 17 that file holds rooms, items, characters, four
custom actions, a scheduler full of daemons, an NPC plugin, scoring rules, and every
line of player-facing prose. A single file that large is hard to navigate and harder
to change. Touching the scoring rules means scrolling past the map, the items, and
the parser grammar to find them.

The fix is the same one every codebase reaches for: split by **concern**. The
guiding question is "what changes together?" The rooms change together; the scoring
rules change together; the prose changes together. Each becomes a file.

## Organizing by concern, not by code type

Family Zoo splits into seven files, each owning one slice of the world. All seven
live in the companion repository at
[`tutorials/familyzoo/src/ch28-multi-file/`](https://github.com/ChicagoDave/sharpee/tree/main/tutorials/familyzoo/src/ch28-multi-file);
this chapter walks their structure rather than reprinting every line, so open them
on GitHub alongside as we go:

| File | Owns |
|---|---|
| `zoo-map.ts` | rooms, exits, scenery: the physical zoo |
| `zoo-items.ts` | the objects players pick up and use |
| `characters.ts` | the zookeeper, the parrot, pettable animals, their NPC behaviors |
| `events.ts` | PA announcements, feeding time, the after-hours daemons |
| `scoring.ts` | point values, score IDs, the victory condition |
| `language.ts` | every line of player-facing prose |
| `index.ts` | the `Story` class that wires them all together |

Notice what the split is *not*: there's no `traits.ts`, no `actions.ts`, no
`behaviors.ts`. Sharpee doesn't ask you to group code by its type. The petting
feature's trait, its capability behavior, and its prose can each live near the rest
of *their* concern (the animal in `characters.ts`, the message in `language.ts`)
because that's what you'll edit together when you change how petting works. Group by
the part of the *world* a file describes, and a change stays in one place.

## Each file exports a builder and its IDs

The files don't reach into each other's internals. Each exposes a small, intentional
interface: a function that builds its part of the world, and a typed set of the IDs
it created so other files can refer to them.

```typescript
// zoo-map.ts
export interface RoomIds {
  entrance: string;
  pettingZoo: string;
  aviary: string;
  // …
}

export function createZooMap(world: WorldModel): { rooms: RoomIds; /* … */ } {
  // create rooms, wire exits, add scenery
  // return the IDs the rest of the story needs
}
```

`createZooItems(world, rooms)` then takes the room IDs it needs and returns its own
`ItemIds`; `createCharacters(world, rooms)` returns `CharacterIds`. IDs flow forward
through the build, each file handing the next exactly what it needs and nothing more.
This is the "clear boundaries" discipline from the start of the book made concrete:
the map doesn't know the items exist, and the items only know the rooms by their IDs.

## The index wires it together

`index.ts` holds the `Story` class: the same four hooks you've used all along, now
calling out to the builder functions instead of doing the work inline:

```typescript
initializeWorld(world: WorldModel): void {
  world.setMaxScore(MAX_SCORE);

  const { rooms } = createZooMap(world);
  this.roomIds = rooms;
  this.itemIds = createZooItems(world, rooms);
  this.characterIds = createCharacters(world, rooms);

  // register the petting capability, place the player…
}
```

`getCustomActions()` returns the action objects (defined near the top of `index.ts`
since they coordinate across concerns), `extendParser` adds their grammar,
`extendLanguage` calls `registerMessages` from `language.ts`, and `onEngineReady`
installs the NPC and scheduler plugins and registers every daemon. The class reads
like a table of contents for the story, which is exactly what a wiring file should
be.

## A feature that spans the files: after hours

Version 17 isn't only a reorganization; it adds a second act. After enough turns the
zoo closes: the zookeeper leaves, and the animals, freed from human ears, start to
talk. It's the perfect feature to show how a single idea now threads cleanly through
the split files instead of tangling one big one:

- **`events.ts`** defines the after-hours daemons (created by
  `createAfterHoursDaemons`) that fire the closing announcements and the animals'
  candid lines.
- **A world-state flag** acts as the game-phase switch: a daemon sets
  `zoo.after_hours` to `true`, and other daemons gate their behavior on it. State
  values you met in Volume III turn out to be exactly the right tool for "what act
  are we in?"
- **`characters.ts`** exports two NPC behaviors for the parrot: `parrotBehavior`
  (daytime squawking) and `parrotAfterHoursBehavior` (articulate). A small daemon in
  `index.ts` watches the flag and performs a **runtime behavior swap**: when
  `zoo.after_hours` flips, it calls `npcService.removeBehavior('zoo-parrot')` and
  registers the after-hours behavior in its place. Swapping a behavior at runtime is
  the canonical way to change how an NPC acts mid-game.
- **`scoring.ts`** grows a bonus tier: 25 points for witnessing the after-hours
  events, on top of the 75-point base game.

Every one of those touches lands in the file that owns its concern: the daemons in
`events.ts`, the phase flag in world state, the behavior swap in `index.ts`, the
bonus tier in `scoring.ts`. A whole second act, and no single file grew harder to read.

## Key takeaway

As your story grows, one file becomes unwieldy. Split your story elements by
**concern**: things that change together are sticky, so they belong in the same
file. Each file exposes a builder and a typed set of IDs that flow forward through
the build, so files stay decoupled and the `Story` class in `index.ts` is just a
thin wiring layer. Version 17 proves the structure by adding a whole second act (the
after-hours phase) without making any one file harder to read. The rest of this
volume is about getting the zoo to players: testing, saving, building, and serving
it.
