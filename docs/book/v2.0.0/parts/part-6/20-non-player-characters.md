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

1. **`NpcTrait`**: the trait that marks an entity as an NPC and names its behavior.
2. **`NpcBehavior`**: an object that decides what the NPC does each turn.
3. **The engine's actor turn phase**: after the player's command has run, the
   engine gives each NPC a turn of its own and carries out whatever its behavior
   decided.

These span three packages: the world-model, the stdlib, and the engine. There is
no plugin to install or register; the engine owns the phase.

```typescript
import { GameEngine } from '@sharpee/engine';
import { definePoint } from '@sharpee/core';
import { NpcTrait } from '@sharpee/world-model';
import {
  NpcBehavior, NpcContext, createPatrolBehavior,
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
}));

world.moveEntity(zookeeper.id, mainPath.id);
```

The `behaviorId` is the crucial link: it must exactly match the `id` of a
behavior you register later. `canMove` decides whether `getAvailableExits()` offers this
NPC any way out of a room, which is how the built-in behaviors decide whether to
walk. The parrot, which stays put, sets it to `false`.

`announcesMovement` is what makes the patrol *visible*: when Sam walks out of
(or into) the player's room, the platform prints a line like "The zookeeper
leaves to the east." It defaults to `false`, but a silent NPC that changes rooms
between turns is imperceptible until the player types `look`, so switch it on
for any NPC whose comings and goings the player should notice. (Moves between
two rooms the player isn't in stay silent either way.) The line is not special
NPC text: it is the standard `going` action reporting a move, the same action
that runs when the player types `east`. Sam simply performs it instead of the
player, which is the idea this whole chapter rests on.

> **The mistake everyone makes once:** a `behaviorId` that doesn't match any
> registered behavior's `id`. The NPC exists and you can examine it, but it never
> acts, because the engine has no behavior to run for it. Keep the two strings
> identical.

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
walks them in order, finding the exits on its own. Every one of these moves,
blocks, or fights through the same two calls your own behaviors will use, so
there is nothing a built-in can do that a custom behavior cannot.

## Writing a custom behavior

When the built-ins don't fit, implement the `NpcBehavior` interface yourself. Its
only required hook is `onTurn`, called every turn; the others fire on specific
events. A hook returns nothing. Instead, it *does* things through the context it
is handed, and a hook that does nothing is simply a turn on which the NPC stands
still. Randomness in a behavior always goes through a named choice point,
declared once with `definePoint` (imported from `@sharpee/core`). The parrot
squawks a random phrase when the player is present and greets them on arrival:

```typescript
const PARROT_PHRASES = [
  'Polly wants a cracker!',
  'SQUAWK! Pretty bird! Pretty bird!',
  'Pieces of eight! Pieces of eight!',
  "Who's a good bird? WHO'S A GOOD BIRD?",
  'BAWK! Welcome to the zoo!',
];

// Every random draw names a choice point. The name is what lets you force
// the outcome in a test, see it in a coverage report, and replay a session
// exactly. The squawk decision has yes/no outcomes; the phrase pick is a
// plain draw with no outcome classes.
const PARROT_SQUAWK = definePoint('family-zoo.parrot.squawk', {
  classes: ['yes', 'no'],
});
const PARROT_PHRASE = definePoint('family-zoo.parrot.phrase');

const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot',
  name: 'Parrot Behavior',

  // Called every turn, whether or not the player is here.
  onTurn(context: NpcContext): void {
    // no audience, stay quiet
    if (!context.playerVisible) return;

    // 50% chance to squawk
    if (context.random.chance(PARROT_SQUAWK, 0.5)) {
      const phrase = context.random.pick(PARROT_PHRASE, PARROT_PHRASES);
      context.narrate({ text: phrase });
    }
  },

  // Called once when the player walks into the parrot's room.
  onPlayerEnters(context: NpcContext): void {
    context.narrate({
      text:
        'The parrot ruffles its feathers and eyes you ' +
        'with interest.',
    });
  },
};
```

`NpcContext` hands the behavior everything it needs to decide: `playerVisible`
(is the player in this room?), `random` for chance and selection, `npc` and
`world` for the NPC itself and everything around it, `npcLocation`, and
`getAvailableExits()` for the ways out of the current room. It also hands the
behavior the only two things a behavior can *do*:

| Method | What it does |
|---|---|
| `narrate({ text })` | Print a line about this NPC, verbatim |
| `narrate(messageId, params)` | Print a line from a message id in your language layer |
| `act(actionId, slots)` | Perform a standard action as this NPC |

`narrate` is for things that are not actions: a squawk, a greeting, a growl. The
line is attributed to the NPC at the NPC's location, so a player in another room
never sees it. (The `playerVisible` check in `onTurn` is still worth keeping. A
squawk nobody hears would still spend the coin flip, and every later flip in the
session would land differently.) The `{ text }` form needs no message id, so
there is nothing to add in `extendLanguage`. If you would rather keep the
parrot's lines with the rest of your text, register a message id there and pass
it as the first argument instead.

`act` is the door into the rest of the platform. A call such as
`context.act('if.action.taking', { directObject: cracker })` runs the standard
`taking` action *as the parrot*: the same `validate`, `execute`, and `report`
phases you met in Chapter 14, the same scope rules, the same trait checks. If a
trait refuses the take (scenery, or something inside a closed container), the
action is blocked exactly as it would be for the player, and `act` returns
`{ success: false }` so the behavior can decide what to do instead. If it
succeeds, the world has changed by the time `act` returns, and a player standing
in the same room witnesses it, reported the way Sam's patrol is reported: by the
action itself, about the actor who performed it. The `slots` are the things the action
works on: `directObject`, `indirectObject`, `instrument`, and, for `going`, a
`direction`. There is no parser step, because the behavior has already chosen
them.

This is how the built-in patrol walks. It does not teleport Sam and print a
line; it finds the exit that leads toward the next waypoint and performs `going`
as him, which is why "The zookeeper leaves to the east." reads exactly like the
player's own movement would:

::: under-the-hood
**Under the Hood: `createPatrolBehavior`** · `@sharpee/stdlib`

```typescript
// inside the patrol's onTurn, once it knows the target room
const exits = context.getAvailableExits();
const exitToTarget = exits.find(
  (e) => e.destination === targetRoom,
);

if (exitToTarget) {
  context.act(IFActions.GOING, {
    direction: exitToTarget.direction,
  });
  return;
}
```
:::

A locked door refuses Sam the same way it would refuse the player, and the
patrol simply tries again next turn. `canMove: false` works one step earlier:
`getAvailableExits()` offers nothing, so a built-in mover never asks.

## Registering the behaviors

NPC behaviors don't fire until they are registered with the engine's NPC
service. The engine already owns the turn phase; you never create it. What you
register is each behavior, by id, in `onEngineReady()`, the story hook called
after the engine is fully built. Chapter 13 already gave your story an
`onEngineReady` (it holds the two chain handlers), so *add* the code below at the
top of that existing method; don't declare a second one.

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
  // 1. The engine owns the NPC turn phase; ask it for the
  //    service that holds the behaviors
  const npcService = engine.getNpcService();

  // 2. Build the zookeeper's patrol from a route of room IDs
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

  // 3. Register the parrot's custom behavior
  // (its id already matches)
  npcService.registerBehavior(parrotBehavior);
}
```

One registration per behavior, and each one matters: an NPC whose `behaviorId`
names nothing that was registered has nothing to run, and stands there for the
whole game.

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
`createPatrolBehavior` or write your own `NpcBehavior`. A behavior's hooks return
nothing; they act through the context, with `narrate` for a line and `act` for a
standard action performed as the NPC, through the same four phases the player's
own commands take. Nothing acts until `onEngineReady()` registers each behavior
with `engine.getNpcService()`.
