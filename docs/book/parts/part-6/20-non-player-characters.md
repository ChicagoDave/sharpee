::: {.part-page .has-poem}

# Volume VI — Living Worlds {.part .unnumbered}

| All the world's a stage,
| And all the men and women merely players;
| They have their exits and their entrances,
| And one man in his time plays many parts.

*— William Shakespeare, from As You Like It (c. 1599)*
:::

# Non-Player Characters

![](art/parrot.jpg){.chapter-ornament}

Until now the zoo has been still. Animals are scenery, signs wait to be read,
machines wait to be used — nothing moves unless the player moves it. A
**non-player character** changes that. Sam the zookeeper walks a patrol between
the main path, the petting zoo, and the aviary. A scarlet macaw sits on its perch
and squawks at random, and greets you when you walk in. The world starts to feel
inhabited.

Sharpee's NPC system has three parts that work together:

1. **`NpcTrait`** — the trait that marks an entity as an NPC.
2. **`NpcBehavior`** — an object that decides what the NPC does each turn.
3. **`NpcPlugin`** — an engine plugin that gives NPCs their own phase in the turn.

These span four packages — the engine, the world-model, the NPC plugin, and the
stdlib:

```typescript
import { GameEngine } from '@sharpee/engine';
import { NpcTrait } from '@sharpee/world-model';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { NpcBehavior, NpcContext, NpcAction, createPatrolBehavior } from '@sharpee/stdlib';
```

`parrotBehavior` further down is a top-level `const`; the entity creation and
`onEngineReady` are members of your `FamilyZooStory` class.

## Creating an NPC entity

An NPC is an actor, not an item. It needs three traits: `IdentityTrait` for name
and description, `ActorTrait` with `isPlayer: false` to mark it as a character
rather than the player, and `NpcTrait` to connect it to a behavior:

```typescript
const zookeeper = world.createEntity('zookeeper', EntityType.ACTOR);

zookeeper.add(new IdentityTrait({
  name: 'zookeeper',
  description:
    'A friendly zookeeper in khaki overalls and a wide-brimmed hat, ' +
    'carrying a bucket of mixed animal feed. A name tag reads "Sam."',
  aliases: ['keeper', 'zookeeper', 'sam'],
  properName: false,
  article: 'a',
}));

zookeeper.add(new ActorTrait({ isPlayer: false }));

zookeeper.add(new NpcTrait({
  behaviorId: 'zoo-keeper-patrol',  // must match the behavior's id
  canMove: true,                    // allowed to change rooms
  isAlive: true,
  isConscious: true,
}));

world.moveEntity(zookeeper.id, mainPath.id);
```

The `behaviorId` is the crucial link: it must exactly match the `id` of a
behavior you register later. `canMove` decides whether this NPC is allowed to walk
between rooms — the parrot, which stays put, sets it to `false`.

> **The mistake everyone makes once:** a `behaviorId` that doesn't match any
> registered behavior's `id`. The NPC exists and you can examine it, but it never
> acts, because the NPC service can't find a behavior to run for it. Keep the two
> strings identical.

### The parrot becomes an NPC

The parrot already exists — you created it in Chapter 15 as a pettable actor in the
Aviary. Turning it into an NPC is one more trait on that same entity, linking it to
the behavior we write below:

```typescript
// `parrot` is the entity from Chapter 15 (Aviary, already an ACTOR).
parrot.add(new NpcTrait({
  behaviorId: 'zoo-parrot',   // matches parrotBehavior.id, below
  canMove: false,             // it stays on its perch
  isAlive: true,
  isConscious: true,
}));
```

So the zookeeper is a brand-new NPC while the parrot is an existing actor promoted
to one — both routes end at the same place: an actor with an `NpcTrait` whose
`behaviorId` names a behavior.

## Built-in behaviors

You don't have to write a behavior from scratch. The stdlib ships several ready
to use:

| Behavior | What it does |
|---|---|
| `createPatrolBehavior({ route, loop, waitTurns })` | Walk a fixed route of rooms |
| `createWandererBehavior({ moveChance })` | Move randomly between rooms |
| `createFollowerBehavior({ immediate })` | Follow the player |
| `guardBehavior` | Stand guard, block passage, fight |
| `passiveBehavior` | Do nothing (react-only NPCs) |

The zookeeper uses `createPatrolBehavior` — give it a route of room IDs and it
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
    if (!context.playerVisible) return [];        // no audience — stay quiet

    if (context.random.chance(0.5)) {             // 50% chance to squawk
      const phrase = context.random.pick(PARROT_PHRASES);
      return [{
        type: 'speak',
        messageId: 'npc.speech',
        data: { npcName: 'parrot', text: phrase },
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
        npcName: 'parrot',
        text: 'The parrot ruffles its feathers and eyes you with interest.',
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
platform's language layer (`@sharpee/lang-en-us`) — you don't register them in
`extendLanguage`. They render verbatim the `text` you pass in each action's `data`.

## Registering the plugin and behaviors

NPC behaviors don't fire until the `NpcPlugin` is registered with the engine.
That happens in `onEngineReady()` — the story hook called after the engine is
fully built, which is where any plugin needing the engine reference is set up. The
patrol route references `this.roomIds` — the field you started in Chapter 13; make
sure `initializeWorld` records `mainPath`, `pettingZoo`, and `aviary` there so the
route can name them:

```typescript
onEngineReady(engine: GameEngine): void {
  // 1. Create and register the plugin — gives NPCs a turn phase
  const npcPlugin = new NpcPlugin();
  engine.getPluginRegistry().register(npcPlugin);

  // 2. Get the NPC service from the plugin
  const npcService = npcPlugin.getNpcService();

  // 3. Build the zookeeper's patrol from a route of room IDs
  const keeperPatrol = createPatrolBehavior({
    route: [this.roomIds.mainPath, this.roomIds.pettingZoo, this.roomIds.aviary],
    loop: true,      // Main Path → Petting Zoo → Aviary → Main Path → …
    waitTurns: 1,    // pause one turn at each stop
  });

  // The factory's default id is 'patrol' — override it to match NpcTrait.behaviorId
  keeperPatrol.id = 'zoo-keeper-patrol';
  npcService.registerBehavior(keeperPatrol);

  // 4. Register the parrot's custom behavior (its id already matches)
  npcService.registerBehavior(parrotBehavior);
}
```

Two registrations are needed and both matter: register the *plugin* (without it,
no NPC acts at all) and register each *behavior* (without it, an NPC with that
`behaviorId` has nothing to run).

Note the patrol factory: it returns a behavior whose `id` defaults to `'patrol'`,
so the zookeeper's `behaviorId: 'zoo-keeper-patrol'` wouldn't match until you
override `keeperPatrol.id`. The parrot needs no override — `parrotBehavior` was
defined with `id: 'zoo-parrot'` to begin with.

## Try it

```
> south                     Walk to the Main Path, where Sam patrols
> examine zookeeper         See Sam's description
> wait                      Sam patrols on toward the petting zoo
> wait                      …and on toward the aviary
> west                      Aviary — meet the parrot
> examine parrot            See the macaw
> wait                      The parrot might squawk
> wait                      …or not — it's a coin flip each turn
```

## Key takeaway

An NPC is an `EntityType.ACTOR` with `IdentityTrait`, `ActorTrait({ isPlayer:
false })`, and `NpcTrait`, whose `behaviorId` must match a registered behavior's
`id`. Use a built-in like `createPatrolBehavior` or implement `NpcBehavior`
yourself — `onTurn` runs every turn, `onPlayerEnters` on arrival, and each returns
`NpcAction[]`. Nothing acts until `onEngineReady()` registers the `NpcPlugin` with
the engine *and* registers each behavior with its service.
