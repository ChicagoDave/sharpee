# Your First Room: Entities, Traits, and the World

You're standing at the entrance to the Willowbrook Family Zoo. There's a welcome sign and a ticket booth. You can look around and examine things, but there's nowhere to go yet.

That's it: one room, two things to look at. This is the simplest possible Sharpee story, and it's where the Family Zoo begins. By the end of this chapter you'll have a game you can play.

## The Story interface

Every Sharpee story is a TypeScript class that implements the `Story` interface. The engine calls your class's methods during startup to build the world. Three things every story must provide:

1. **`config`** — metadata: the story's title, author, version, and ID. The
   engine shows this as a banner when the game starts.
2. **`createPlayer(world)`** — creates the player character. The engine calls this first. You create an entity, attach traits, and return it.
3. **`initializeWorld(world)`** — builds the world: rooms, objects, connections. The engine calls this after `createPlayer`.

There are optional methods too — `extendParser`, `extendLanguage`,
`onEngineReady`, and others — but a basic story needs none of them.

::: under-the-hood
**Under the Hood — `Story`** · `@sharpee/engine`

```typescript
interface Story {
  config: StoryConfig;
  initializeWorld(world: WorldModel): void;
  createPlayer(world: WorldModel): IFEntity;
  // optional:
  getCustomActions?(): any[];
  getCustomVocabulary?(): CustomVocabulary;
  extendParser?(parser: Parser): void;
  isComplete?(): boolean;
}
```

The three required members are exactly the three things above. Everything else is optional and we'll meet the relevant ones in later chapters.
:::

## Entities and traits

Everything in a Sharpee game is an **entity** — rooms, objects, characters,
doors, even the player. An entity by itself is just an empty shell with an ID. You make it useful by attaching **traits**: components that answer "what *is* this thing?" and "what can it *do*?"

You create entities with `world.createEntity(name, type)`. The type is a hint to the engine — `EntityType.ROOM`, `EntityType.ITEM`, `EntityType.ACTOR`, `EntityType.SCENERY`, and so on.

In this version we use five traits:

- **`IdentityTrait`** — a name, description, and aliases. Almost every entity has one. The `description` is what `examine` shows; the `aliases` are the alternative words the parser will accept.
- **`ActorTrait`** — marks an entity as a character. `isPlayer: true` tells the engine this is *the* player.
- **`ContainerTrait`** — lets an entity hold other entities. The player needs it to carry an inventory.
- **`SceneryTrait`** — marks an entity as fixed. The player can examine it but not take it.
- **`RoomTrait`** — marks an entity as a room, with exits and a darkness flag.

## The shape of the file

Before the methods, the top of the file: the **imports**, the **config**, and the
**class** that holds everything. Every symbol the story uses comes from one of two
packages — `@sharpee/engine` (the `Story` contract and `StoryConfig`) and
`@sharpee/world-model` (the world, entity types, and traits).

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity, EntityType } from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  SceneryTrait,
} from '@sharpee/world-model';

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.1.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};

class FamilyZooStory implements Story {
  config = config;

  // createPlayer(world)     — fills in next
  // initializeWorld(world)  — and after that
}
```

The two methods below are members of this `FamilyZooStory` class — they go where
the comments are. We'll write each one, then assemble the whole file at the end.

**The scaffolded stub looks a little different — and that's fine.** The
`src/index.ts` that `sharpee init` generated isn't written exactly like the file we
build here, but both are valid. The stub imports `Story` and `StoryConfig` from
**`@sharpee/sharpee`** (a convenience barrel that re-exports the engine, world
model, and parser as one package), where the book imports them from
**`@sharpee/engine`** directly; the two names refer to the same types. The stub
also defines the story as a plain **object literal**
(`export const story: Story = { config, createPlayer, … }`) rather than a `class`.
An object literal and a class instance satisfy the `Story` interface identically —
we use the class form throughout the book because it gives the two methods a
natural home and reads well as the story grows. Either style works; pick one and
stay consistent.

## Creating the player

The engine calls `createPlayer` first. Inside the class, you build the player like
any other entity — create it, add traits, return it.

```typescript
createPlayer(world: WorldModel): IFEntity {
  const player = world.createEntity('yourself', EntityType.ACTOR);

  player.add(new IdentityTrait({
    name: 'yourself',
    description: 'Just an ordinary visitor to the zoo.',
    aliases: ['self', 'myself', 'me'],
    properName: true,
    article: '',
  }));

  player.add(new ActorTrait({ isPlayer: true }));

  player.add(new ContainerTrait({
    capacity: { maxItems: 10 },
  }));

  return player;
}
```

The `ContainerTrait` is what makes `take` and `inventory` work — without it, the player has nowhere to put anything.

::: under-the-hood
**Under the Hood — `ContainerTrait`** · `@sharpee/world-model`

```typescript
class ContainerTrait implements ITrait {
  constructor(data?: Partial<ContainerTrait>);
  capacity?: { maxWeight?: number; maxVolume?: number; maxItems?: number };
  isTransparent: boolean;
  enterable: boolean;
}
```

The constructor takes a `Partial` of the trait's own fields, so you set only what you need — here, just `capacity`. The standard `take` action reads `capacity` to decide whether an item fits.
:::

## Building the world

`initializeWorld` runs after the player exists. Create a room, give it a
`RoomTrait` and an `IdentityTrait`, then add some scenery.

```typescript
initializeWorld(world: WorldModel): void {
  const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);

  entrance.add(new RoomTrait({ exits: {}, isDark: false }));
  entrance.add(new IdentityTrait({
    name: 'Zoo Entrance',
    description:
      'You stand before the gates of the Willowbrook Family Zoo. ' +
      'A cheerful welcome sign arches over the entrance, and a small ' +
      'ticket booth sits to one side.',
    aliases: ['entrance', 'gates', 'gate'],
    article: 'the',
  }));

  const sign = world.createEntity('welcome sign', EntityType.SCENERY);
  sign.add(new IdentityTrait({
    name: 'welcome sign',
    description: 'A brightly painted wooden sign welcomes you to the zoo.',
    aliases: ['sign', 'wooden sign'],
    article: 'a',
  }));
  sign.add(new SceneryTrait());

  const booth = world.createEntity('ticket booth', EntityType.SCENERY);
  booth.add(new IdentityTrait({
    name: 'ticket booth',
    description:
      'A small wooden booth with a sliding glass window. A sign in the ' +
      'window reads "Self-Guided Tours — No Ticket Needed Today!"',
    aliases: ['booth', 'ticket booth', 'window'],
    article: 'a',
  }));
  booth.add(new SceneryTrait());

  world.moveEntity(sign.id, entrance.id);
  world.moveEntity(booth.id, entrance.id);

  const player = world.getPlayer();
  if (player) world.moveEntity(player.id, entrance.id);
}
```

The ticket booth is built exactly like the sign: an entity, an `IdentityTrait` for
its name and description, and a `SceneryTrait` so it stays put. Both are placed in
the entrance — and now `examine booth` in the "Try it" list has something to find.

## Placing things

Creating an entity doesn't put it anywhere. You place it with
`world.moveEntity(entityId, locationId)` — that puts the entity *inside* the
location, whether that's an object in a room, an item in a container, or the
player in a room. Forget this step and the entity exists in the database but is invisible: the player can never reach it.

The player is no exception. `world.moveEntity(player.id, entrance.id)` is what sets the starting location.

## Exposing the story

The two methods live inside the `FamilyZooStory` class from "The shape of the file."
The last piece is the bottom of the file: the engine loads your story from the
module's exports, so provide both a named `story` and a default — it then works
however the module is loaded.

```typescript
export const story: Story = new FamilyZooStory();
export default story;
```

The `: Story` annotation matters: it types `story` as the full `Story` interface —
including the *optional* hooks like `extendParser` and `extendLanguage` you'll add in
later chapters. The browser client that `sharpee init-browser` generated in Chapter 1
checks for those hooks (`if (story.extendParser) …`), and under TypeScript's `strict`
mode that check only compiles if the type knows the hooks *might* exist. Without the
annotation, `story` is typed as just `FamilyZooStory`, which doesn't have them yet, and
the browser build fails. Annotate the export and every chapter builds.

That's the whole file: imports, `config`, the `class` with `createPlayer` and
`initializeWorld`, and these exports. Build it and it runs.

## Try it

```
> look                  See the room description
> examine sign          Read the welcome sign
> examine booth         Look at the ticket booth
> take sign             Can't — it's scenery ("fixed in place")
> inventory             Check what you're carrying (nothing yet)
```

## Key takeaway

A Sharpee story is a class with a config, a player creator, and a world
initializer. The world is made of entities with traits. Place everything
explicitly, or it won't exist.
