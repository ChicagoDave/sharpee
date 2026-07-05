::: {.part-page}

# Volume VI — Living Worlds {.part .unnumbered}

:::

# Non-Player Characters: Actors That Take Turns

Until now the zoo has been still. Animals are scenery, signs wait to be read,
machines wait to be used. Nothing moves unless the player moves it. A
**non-player character** changes that. Sam the zookeeper walks a patrol between
the main path, the petting zoo, and the aviary. A scarlet macaw sits on its perch
and squawks at random, and greets you when you walk in. The world starts to feel
inhabited.

Sharpee's NPC system has three parts that work together:

1. **`NpcTrait`**: the trait that marks an entity as an NPC.
2. **`NpcBehavior`**: an object that decides what the NPC does each turn.
3. **`NpcPlugin`**: an engine plugin that gives NPCs their own phase in the turn.

These span four packages: the engine, the world-model, the NPC plugin, and the
stdlib.

```typescript
import { GameEngine } from '@sharpee/engine';
import { NpcTrait } from '@sharpee/world-model';
import { NpcPlugin } from '@sharpee/plugin-npc';
import {
  NpcBehavior, NpcContext, NpcAction, createPatrolBehavior,
} from '@sharpee/stdlib';
```

`parrotBehavior` further down is a top-level `const`; the entity creation and
`onEngineReady` are members of your `FamilyZooStory` class.

## Creating an NPC entity

An NPC is an actor, not an item. It needs three traits: `IdentityTrait` for name
and description, `ActorTrait` with `isPlayer: false` to mark it as a character
rather than the player, and `NpcTrait` to connect it to a behavior:

```typescript
const zookeeper = world.createEntity(
  'zookeeper',
  EntityType.ACTOR,
);

zookeeper.add(new IdentityTrait({
  name: 'zookeeper',
  description:
    'A friendly zookeeper in khaki overalls and a ' +
    'wide-brimmed hat, carrying a bucket of mixed ' +
    'animal feed. A name tag reads "Sam."',
  aliases: ['keeper', 'zookeeper', 'sam'],
  properName: false,
  article: 'a',
}));

zookeeper.add(new ActorTrait({ isPlayer: false }));

zookeeper.add(new NpcTrait({
  // must match the behavior's id
  behaviorId: 'zoo-keeper-patrol',
  canMove: true,                    // allowed to change rooms
  // "The zookeeper leaves to the east."
  announcesMovement: true,
  isAlive: true,
  isConscious: true,
}));

world.moveEntity(zookeeper.id, mainPath.id);
```

The `behaviorId` is the crucial link: it must exactly match the `id` of a
behavior you register later. `canMove` decides whether this NPC is allowed to walk
between rooms. The parrot, which stays put, sets it to `false`.

`announcesMovement` is what makes the patrol *visible*: when Sam walks out of
(or into) the player's room, the platform prints a line like "The zookeeper
leaves to the east." It defaults to `false`, but a silent NPC that changes rooms
between turns is imperceptible until the player types `look`, so switch it on
for any NPC whose comings and goings the player should notice. (Moves between
two rooms the player isn't in stay silent either way.)

> **The mistake everyone makes once:** a `behaviorId` that doesn't match any
> registered behavior's `id`. The NPC exists and you can examine it, but it never
> acts, because the NPC service can't find a behavior to run for it. Keep the two
> strings identical.

### The parrot becomes an NPC

The parrot already exists; you created it in Chapter 15 as a pettable actor in the
Aviary. Turning it into an NPC is one more trait on that same entity, linking it to
the behavior we write below:

```typescript
// `parrot` is the entity from Chapter 15 (Aviary, already
// an ACTOR).
parrot.add(new NpcTrait({
  behaviorId: 'zoo-parrot',   // matches parrotBehavior.id, below
  canMove: false,             // it stays on its perch
  isAlive: true,
  isConscious: true,
}));
```

So the zookeeper is a brand-new NPC while the parrot is an existing actor promoted
to one. Both routes end at the same place: an actor with an `NpcTrait` whose
`behaviorId` names a behavior.

## Built-in behaviors

The stdlib ships several behaviors ready to use, so common NPCs need no custom code:

| Behavior | What it does |
|---|---|
| `createPatrolBehavior({ route, loop, waitTurns })` | Walk a fixed route of rooms |
| `createWandererBehavior({ moveChance })` | Move randomly between rooms |
| `createFollowerBehavior({ immediate })` | Follow the player |
| `guardBehavior` | Stand guard, block passage, fight |
| `passiveBehavior` | Do nothing (react-only NPCs) |

The zookeeper uses `createPatrolBehavior`: give it a route of room IDs and it
walks them in order, finding the exits on its own.

## Writing a custom behavior

When the built-ins don't fit, implement the `NpcBehavior` interface yourself. Its
only required hook is `onTurn`, called every turn; the others fire on specific
events. The parrot squawks a random phrase when the player is present and greets
them on arrival:

```typescript
const PARROT_PHRASES = [
  'Polly wants a cracker!',
  'SQUAWK! Pretty bird! Pretty bird!',
  'Pieces of eight! Pieces of eight!',
  "Who's a good bird? WHO'S A GOOD BIRD?",
  'BAWK! Welcome to the zoo!',
];

const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot',
  name: 'Parrot Behavior',

  // Called every turn, whether or not the player is here.
  onTurn(context: NpcContext): NpcAction[] {
    // no audience, stay quiet
    if (!context.playerVisible) return [];

    // 50% chance to squawk
    if (context.random.chance(0.5)) {
      const phrase = context.random.pick(PARROT_PHRASES);
      return [{
        type: 'speak',
        messageId: 'npc.speech',
        data: { text: phrase },
      }];
    }
    return [];
  },

  // Called once when the player walks into the parrot's room.
  onPlayerEnters(context: NpcContext): NpcAction[] {
    return [{
      type: 'emote',
      messageId: 'npc.emote',
      data: {
        text:
          'The parrot ruffles its feathers and eyes you ' +
          'with interest.',
      },
    }];
  },
};
```

`NpcContext` hands the behavior everything it needs: `playerVisible` (is the
player in this room?), `random` for chance and selection, and access to the NPC
and the world. Each hook returns an array of `NpcAction` describing what the NPC
does this turn:

| Action | What it does |
|---|---|
| `{ type: 'move', direction: Direction.NORTH }` | Walk to a connected room |
| `{ type: 'speak', messageId, data }` | Say something (visible text) |
| `{ type: 'emote', messageId, data }` | Do something visible |
| `{ type: 'wait' }` | Do nothing this turn |
| `{ type: 'take', target }` / `{ type: 'drop', target }` | Pick up / drop an item |

Return an empty array for a turn where the NPC does nothing.

The `npc.speech` and `npc.emote` message ids the behavior emits are provided by the
platform's language layer (`@sharpee/lang-en-us`). You don't register them in
`extendLanguage`. They render verbatim the `text` you pass in each action's `data`.

## Registering the plugin and behaviors

NPC behaviors don't fire until the `NpcPlugin` is registered with the engine.
That happens in `onEngineReady()`, the story hook called after the engine is
fully built, which is where any plugin needing the engine reference is set up.
Chapter 13 already gave your story an `onEngineReady` (it holds the two chain
handlers), so *add* the plugin code below at the top of that existing method;
don't declare a second one.

The patrol route references `this.roomIds`, the field you started in Chapter 13.
That field currently remembers only `giftShop` and `pettingZoo`; the route also
needs `mainPath` and `aviary`. Widen the field's declaration to this:

```typescript
private roomIds: {
  giftShop: string;
  pettingZoo: string;
  mainPath: string;
  aviary: string;
} = { giftShop: '', pettingZoo: '', mainPath: '', aviary: '' };
```

Then add two lines to the Chapter 13 recording block in `initializeWorld` (both
rooms already exist; you are only remembering their ids):

```typescript
this.roomIds.mainPath = mainPath.id;
this.roomIds.aviary = aviary.id;
```

With the ids recorded, the registration itself looks like this:

```typescript
onEngineReady(engine: GameEngine): void {
  // 1. Create and register the plugin: gives NPCs a turn phase
  const npcPlugin = new NpcPlugin();
  engine.getPluginRegistry().register(npcPlugin);

  // 2. Get the NPC service from the plugin
  const npcService = npcPlugin.getNpcService();

  // 3. Build the zookeeper's patrol from a route of room IDs
  const keeperPatrol = createPatrolBehavior({
    route: [
      this.roomIds.mainPath,
      this.roomIds.pettingZoo,
      this.roomIds.aviary,
    ],
    // Main Path → Petting Zoo → Aviary → Main Path → …
    loop: true,
    waitTurns: 1,    // pause one turn at each stop
  });

  // The factory's default id is 'patrol'; override it to
  // match NpcTrait.behaviorId
  keeperPatrol.id = 'zoo-keeper-patrol';
  npcService.registerBehavior(keeperPatrol);

  // 4. Register the parrot's custom behavior
  // (its id already matches)
  npcService.registerBehavior(parrotBehavior);
}
```

Two registrations are needed and both matter: register the *plugin* (without it,
no NPC acts at all) and register each *behavior* (without it, an NPC with that
`behaviorId` has nothing to run).

Note the patrol factory: it returns a behavior whose `id` defaults to `'patrol'`,
so the zookeeper's `behaviorId: 'zoo-keeper-patrol'` wouldn't match until you
override `keeperPatrol.id`. The parrot needs no override; `parrotBehavior` was
defined with `id: 'zoo-parrot'` to begin with.

## Try it

```
> south                     Walk to the Main Path, where Sam patrols
> examine zookeeper         See Sam's description (this uses up Sam's one-turn pause)
> wait                      "The zookeeper leaves to the east."
> west                      Aviary, meet the parrot
> examine parrot            See the macaw
> wait                      The parrot might squawk
> wait                      …or not; it's a coin flip each turn
```

(Without `announcesMovement: true` on Sam's `NpcTrait`, that wait prints only
"Time passes...", but the patrol still happens, invisibly. And the timing is
worth noticing: `waitTurns: 1` means Sam pauses one turn at each stop, so the
turn you spend examining him is the turn he rests; he walks on the next.)

## Test it

NPCs act on their own clock, so the test pins the *turn* things happen on as
much as the text. Add `tests/transcripts/npcs.transcript` (the two closing
waits assert nothing specific, because the parrot's squawk is a coin flip):

```text
title: NPCs
story: familyzoo
description: Sam patrols visibly; the parrot greets and squawks

---

> south
[OK: contains "Main Path"]

> examine zookeeper
[OK: contains "Sam"]

> wait
[OK: contains "leaves to the east"]

> west
[OK: contains "Aviary"]
[OK: contains "ruffles its feathers"]

> examine parrot
[OK: contains "scarlet macaw"]

> wait
[OK: matches /./]

> wait
[OK: matches /./]
```

## Key takeaway

An NPC is an actor carrying `IdentityTrait`, `ActorTrait`, and `NpcTrait`, with a
`behaviorId` that matches a registered behavior, whether you use a built-in such as
`createPatrolBehavior` or write your own `NpcBehavior`, whose `onTurn` and
`onPlayerEnters` return `NpcAction[]`. Nothing acts until `onEngineReady()` does
*both*: registers the `NpcPlugin` with the engine and registers each behavior with
its service.
