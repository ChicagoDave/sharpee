---
title: "Quick Start"
description: "Create your first interactive fiction story with Sharpee"
---

## Create Your Project

```bash
npx @sharpee/sharpee init my-adventure
cd my-adventure
npm install
```

The scaffolded project gives you a single starting room. Let's expand it into a two-region story.

## Build a Region

Create `src/regions/house.ts` with a few connected rooms and objects:

```typescript
import {
  WorldModel,
  IFEntity,
  EntityType,
  IdentityTrait,
  RoomTrait,
  PortableTrait,
  Direction,
} from '@sharpee/world-model';

export function createHouse(world: WorldModel) {
  // Rooms
  const foyer = world.createEntity('foyer', EntityType.ROOM);
  foyer.add(new IdentityTrait({
    name: 'Foyer',
    description: 'A grand entrance hall with marble floors. A doorway leads north to the library. The front door is to the south.',
  }));
  foyer.add(new RoomTrait());

  const library = world.createEntity('library', EntityType.ROOM);
  library.add(new IdentityTrait({
    name: 'Library',
    description: 'Dusty bookshelves line every wall. A reading desk sits beneath a window. The foyer is south.',
  }));
  library.add(new RoomTrait());

  // Connect rooms via RoomTrait exits
  const foyerTrait = foyer.get(RoomTrait);
  if (foyerTrait) {
    foyerTrait.exits[Direction.NORTH] = { destination: library.id };
  }
  const libraryTrait = library.get(RoomTrait);
  if (libraryTrait) {
    libraryTrait.exits[Direction.SOUTH] = { destination: foyer.id };
  }

  // Objects in this region
  const book = world.createEntity('dusty-book', EntityType.OBJECT);
  book.add(new IdentityTrait({
    name: 'dusty book',
    description: 'An ancient tome with faded gold lettering. The title reads "A History of the Valley".',
  }));
  book.add(new PortableTrait());
  world.moveEntity(book.id, library.id);

  const key = world.createEntity('brass-key', EntityType.OBJECT);
  key.add(new IdentityTrait({
    name: 'brass key',
    description: 'A small brass key with an ornate handle.',
  }));
  key.add(new PortableTrait());
  world.moveEntity(key.id, foyer.id);

  return { foyer, library };
}
```

Everything for the house — rooms, connections, objects — lives in one file.

## Wire It Into Your Story

Update `src/index.ts` to use the region:

```typescript
import { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
} from '@sharpee/world-model';
import { createHouse } from './regions/house';

export const config: StoryConfig = {
  id: 'my-adventure',
  title: 'My Adventure',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A short adventure in a mysterious house.',
};

export class MyAdventure implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    const house = createHouse(world);

    // Place the player in the foyer
    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, house.foyer.id);
    }
  }

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me'],
      description: 'As good-looking as ever.',
      properName: false,
    }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: 100 }));
    return player;
  }
}

export const story = new MyAdventure();
export default story;
```

## Using AuthorModel for Setup

When placing items inside closed containers during world setup, normal game rules block the action ("the chest is closed"). Use `AuthorModel` to bypass validation:

```typescript
import {
  WorldModel,
  EntityType,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  PortableTrait,
  AuthorModel,
} from '@sharpee/world-model';

export function createHouse(world: WorldModel) {
  // ... rooms ...

  const chest = world.createEntity('chest', EntityType.OBJECT);
  chest.add(new IdentityTrait({
    name: 'wooden chest',
    description: 'A sturdy wooden chest with iron bands.',
  }));
  chest.add(new ContainerTrait({ capacity: 10 }));
  chest.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(chest.id, library.id);

  const gem = world.createEntity('gem', EntityType.OBJECT);
  gem.add(new IdentityTrait({
    name: 'sparkling gem',
    description: 'A gem that catches the light.',
  }));
  gem.add(new PortableTrait());

  // AuthorModel skips "container is closed" validation
  const author = new AuthorModel(world.getDataStore(), world);
  author.moveEntity(gem.id, chest.id);

  // ...
}
```

## Play Your Story

Build and run:

```bash
npm run build
node dist/index.js --play
```

Try these commands:

- `look` — describe the current room
- `north` or `n` — move north
- `examine book` — look at something
- `take key` — pick up an item
- `inventory` — see what you're carrying

## Add a Browser Client

If working from the Sharpee monorepo, build a browser client:

```bash
./build.sh -s my-adventure -c browser
npx serve dist/web/my-adventure
```

Or build the React client with a theme:

```bash
./build.sh -s my-adventure -c react -t modern-dark
```

## Next Steps

- Learn about [Rooms and Regions](/author-guide/rooms/) in the Author Guide
- Add [Objects and Traits](/author-guide/objects/) for interactive items
- Create [NPCs](/author-guide/npcs/) with conversations
- Explore the [Design Patterns](/design-patterns/) map for IF design inspiration
