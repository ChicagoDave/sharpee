::: {.part-page}

# Volume IV — Custom Behavior {.part .unnumbered}

:::

# Event Handlers: Reacting to What Happens

So far every object in the zoo has *been* something: scenery, a container, a
readable sign. This chapter is where the world starts to *react*. Drop the bag
of feed in the petting zoo and the goats rush over to devour it. Feed a souvenir
penny into the press in the gift shop and it comes out flattened and embossed.
Neither of those is a new verb. The player is using ordinary `drop` and `put
in`. The reaction comes from an **event handler** listening for those actions
and adding something on top.

This is the workhorse pattern for puzzles and special effects: let the standard
actions do their job, then hook the events they emit.

## Every action emits an event

When a standard action succeeds, it announces what happened by emitting an event.
You react by registering a handler for that event type:

| Event | Fired when |
|---|---|
| `if.event.taken` | Player took an item |
| `if.event.dropped` | Player dropped an item |
| `if.event.put_in` | Player put an item in a container |
| `if.event.put_on` | Player put an item on a supporter |
| `if.event.opened` | Player opened something |
| `if.event.closed` | Player closed something |
| `if.event.locked` | Player locked something |
| `if.event.unlocked` | Player unlocked something |

…and many more. The list grows with the stdlib, but the shape is always the
same: an action happens, an event fires, your handler gets a look.

## Two kinds of handler

There are two ways to listen, and which you choose depends on whether you want
the player to *see* anything.

**Silent handlers** mutate world state and produce no text. Register them with
`world.registerEventHandler()`:

```typescript
world.registerEventHandler('if.event.dropped', (event, world) => {
  // Set a flag, move an item, change state; but no visible text
  world.setStateValue('item-was-dropped', true);
});
```

**Chain handlers** return an event that turns into visible text. Register them
with `world.chainEvent()`. The handler returns either an event (which gets
dispatched and rendered) or `null` to stay quiet:

```typescript
world.chainEvent(
  'if.event.dropped',
  (event, w) => {
    const data = event.data as Record<string, any>;
    if (data.itemId !== feedId) return null;   // not our item, ignore
    return {
      id: `goats-react-${Date.now()}`,
      type: 'zoo.event.goats_react',
      timestamp: Date.now(),
      entities: {},
      data: { text: 'The goats rush over and devour the feed!' },
    };
  },
  { key: 'zoo.chain.goats-eat-feed' },
);
```

Use `registerEventHandler()` for bookkeeping the player never sees; use
`chainEvent()` when something visible should happen.

> **The mistake everyone makes once:** reaching for `type: 'game.message'` in a
> chain handler. The event processor treats a `game.message` returned from a
> handler as an *override* of the original action's text, so instead of adding
> your reaction it replaces the "You drop the feed." line. Use a custom event
> type like `zoo.event.goats_react` with a `text` field instead; the renderer
> displays any event that carries `text`, and the original action message
> survives.

## Reading the event data

Each event carries a `data` object describing what happened. The fields depend
on the event type:

```typescript
// if.event.dropped
{ item: string, itemId: EntityId, toLocation: EntityId }

// if.event.put_in
{ itemId: EntityId, targetId: EntityId, preposition: 'in' }
```

Note `item` is the item's *name* and `itemId` is its *entity ID*. Compare
against `itemId`. Names aren't unique; IDs are.

## Setting up: the gift shop, the press, and remembering IDs

The reactions in this chapter need three things the world doesn't have yet: a Gift
Shop room, the souvenir press to put the penny in, and a way for a handler to
*refer* to specific entities long after `initializeWorld` has run. The story
remembers the IDs it cares about in two class fields, and the handler signatures
pull in a few new types:

```typescript
import { GameEngine } from '@sharpee/engine';
import { ISemanticEvent } from '@sharpee/core';
import { IWorldModel } from '@sharpee/world-model';

class FamilyZooStory implements Story {
  config = config;

  private roomIds: { giftShop: string; pettingZoo: string } =
    { giftShop: '', pettingZoo: '' };
  private entityIds: { animalFeed: string; penny: string; souvenirPress: string } =
    { animalFeed: '', penny: '', souvenirPress: '' };

  // createPlayer / initializeWorld / onEngineReady …
}
```

In `initializeWorld`, add the Gift Shop west of the Aviary and the press inside it,
then record the IDs the handlers will match against (the `penny` and `animalFeed`
entities were created back in Chapter 5):

```typescript
const giftShop = world.createEntity('Gift Shop', EntityType.ROOM);
giftShop.add(new RoomTrait({ exits: {}, isDark: false }));
giftShop.add(new IdentityTrait({
  name: 'Gift Shop',
  description:
    'A small zoo gift shop crammed with stuffed animals and postcards. A large ' +
    'souvenir penny press stands near the door. The aviary is back to the east.',
  aliases: ['gift shop', 'shop', 'store'],
  article: 'the',
}));
// Connect it west of the Aviary (and back east). This replaces the Aviary
// exits from Chapter 4, adding the west passage.
aviary.get(RoomTrait)!.exits = {
  [Direction.EAST]: { destination: mainPath.id },
  [Direction.WEST]: { destination: giftShop.id },
};
giftShop.get(RoomTrait)!.exits = {
  [Direction.EAST]: { destination: aviary.id },
};

const souvenirPress = world.createEntity('souvenir press', EntityType.CONTAINER);
souvenirPress.add(new IdentityTrait({
  name: 'souvenir press',
  description:
    'A heavy cast-iron machine with a crank handle and a slot that accepts ' +
    'pennies. A sign reads: "INSERT PENNY, TURN HANDLE, KEEP FOREVER!"',
  aliases: ['press', 'souvenir press', 'penny press', 'machine'],
  article: 'a',
}));
souvenirPress.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
souvenirPress.add(new SceneryTrait());
world.moveEntity(souvenirPress.id, giftShop.id);

// Remember the IDs the event handlers will match against.
this.roomIds.giftShop = giftShop.id;
this.roomIds.pettingZoo = pettingZoo.id;
this.entityIds.animalFeed = animalFeed.id;
this.entityIds.penny = penny.id;
this.entityIds.souvenirPress = souvenirPress.id;
```

The handlers themselves are registered in `onEngineReady`, which the engine calls
once the world is fully built. The two reaction sections that follow both live
inside it:

```typescript
onEngineReady(engine: GameEngine): void {
  const world = engine.getWorld();
  // the chainEvent registrations below go here
}
```

## Reaction pattern: the goats eat the feed

Putting it together: when the player drops the feed in the petting zoo, the
goats react, but only once:

```typescript
const feedId = this.entityIds.animalFeed;
const pettingZooId = this.roomIds.pettingZoo;

world.chainEvent(
  'if.event.dropped',
  (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
    const data = event.data as Record<string, any>;

    // Is it the feed, dropped in the petting zoo?
    if (data.itemId !== feedId || data.toLocation !== pettingZooId) {
      return null;
    }

    // Only react once
    if (w.getStateValue('goats-fed')) return null;
    w.setStateValue('goats-fed', true);

    return {
      id: `zoo-goats-eat-${Date.now()}`,
      type: 'zoo.event.goats_react',
      timestamp: Date.now(),
      entities: {},
      data: {
        text: 'The pygmy goats spot the bag of feed and rush over! They ' +
              'crowd around, bleating excitedly, and devour the corn and ' +
              'pellets in seconds. The smallest goat looks up at you with ' +
              'big grateful eyes.',
      },
    };
  },
  { key: 'zoo.chain.goats-eat-feed' },
);
```

The `getStateValue`/`setStateValue` flag is the guard that keeps the goats from
re-staging their feast every time the feed touches the ground.

## Transformation pattern: put A in, get B out

A classic puzzle shape: the player puts one item into a machine and a different
item comes out. The souvenir press swallows a plain penny and produces a pressed
one:

```typescript
const pennyId = this.entityIds.penny;
const pressId = this.entityIds.souvenirPress;

world.chainEvent(
  'if.event.put_in',
  (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
    const data = event.data as Record<string, any>;
    if (data.itemId !== pennyId || data.targetId !== pressId) return null;

    // 1. Destroy the input
    w.removeEntity(pennyId);

    // 2. Create the output
    const pressedPenny = w.createEntity('pressed penny', EntityType.ITEM);
    pressedPenny.add(new IdentityTrait({
      name: 'pressed penny',
      description: 'A flattened oval of copper with an embossed toucan.',
      aliases: ['pressed penny', 'pressed coin', 'souvenir'],
      properName: false,
      article: 'a',
    }));

    // 3. Hand it to the player
    const player = w.getPlayer();
    if (player) w.moveEntity(pressedPenny.id, player.id);

    // 4. Tell them what happened
    return {
      id: `zoo-press-penny-${Date.now()}`,
      type: 'zoo.event.penny_pressed',
      timestamp: Date.now(),
      entities: {},
      data: {
        text: 'CLUNK! CRUNCH! WHIRRR! The souvenir press swallows the penny ' +
              'and spits out a beautiful pressed penny with an embossed ' +
              'toucan design. You pocket it proudly.',
      },
    };
  },
  { key: 'zoo.chain.penny-press' },
);
```

Remove the old entity, create the new one, move it to the player, return the
text. That four-step shape covers a surprising number of machines, ovens,
forges, and vending slots.

The `{ key: '...' }` option gives each handler a unique identifier, which the
engine needs to manage handlers across saves and reloads.

## Try it

```
> south; east               Go to the Petting Zoo
> take feed                 Pick up the bag of animal feed
> drop feed                 The goats rush over!
> west                      Back to Main Path
> take penny                Grab the souvenir penny
> west                      Aviary
> west                      Gift Shop
> examine press             See the souvenir press
> put penny in press        CLUNK! CRUNCH! WHIRRR!
> inventory                 You're holding a pressed penny
```

## Key takeaway

Event handlers let standard actions do the work while you react to what they
emit. `world.registerEventHandler()` runs silently for state bookkeeping;
`world.chainEvent()` returns an event with a `text` field to show the player
something. Match on `itemId`/`targetId` (not names), guard one-time reactions
with a state flag, and never return `game.message` from a chain handler. Use a
custom event type so your reaction adds to the action's text instead of replacing
it.
