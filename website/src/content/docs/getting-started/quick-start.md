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
import { WorldModel } from '@sharpee/sharpee';

export function createHouse(world: WorldModel) {
  // Rooms
  const foyer = world.createRoom('foyer', {
    name: 'Foyer',
    description: 'A grand entrance hall with marble floors. A doorway leads north to the library. The front door is to the south.',
  });

  const library = world.createRoom('library', {
    name: 'Library',
    description: 'Dusty bookshelves line every wall. A reading desk sits beneath a window. The foyer is south.',
  });

  world.connectRooms(foyer.id, 'north', library.id);

  // Objects in this region
  const book = world.createEntity('dusty-book', 'object', {
    name: 'dusty book',
    description: 'An ancient tome with faded gold lettering. The title reads "A History of the Valley".',
  });
  world.moveEntity(book.id, library.id);

  const key = world.createEntity('brass-key', 'object', {
    name: 'brass key',
    description: 'A small brass key with an ornate handle.',
  });
  world.moveEntity(key.id, foyer.id);

  return { foyer, library };
}
```

Everything for the house — rooms, connections, objects — lives in one file.

## Wire It Into Your Story

Update `src/index.ts` to use the region:

```typescript
import { Story, StoryConfig, WorldModel, IFEntity } from '@sharpee/sharpee';
import { createHouse } from './regions/house';

export const config: StoryConfig = {
  id: 'my-adventure',
  title: 'My Adventure',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A short adventure in a mysterious house.',
};

export const story: Story = {
  config,

  initializeWorld(world: WorldModel): IFEntity {
    const player = world.getPlayer();

    // Set up regions
    const house = createHouse(world);

    // Place the player
    world.moveEntity(player.id, house.foyer.id);

    return house.foyer;
  },
};

export default story;
```

## Using AuthorModel for Setup

When placing items inside closed containers during world setup, normal game rules block the action ("the chest is closed"). Use `AuthorModel` to bypass validation:

```typescript
import { WorldModel, AuthorModel } from '@sharpee/sharpee';

export function createHouse(world: WorldModel) {
  // ... rooms ...

  const chest = world.createEntity('chest', 'container', {
    name: 'wooden chest',
    isOpen: false,
  });
  world.moveEntity(chest.id, library.id);

  const gem = world.createEntity('gem', 'object', {
    name: 'sparkling gem',
    description: 'A gem that catches the light.',
  });

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
npx sharpee --play
```

Try these commands:

- `look` — describe the current room
- `north` or `n` — move north
- `examine book` — look at something
- `take key` — pick up an item
- `inventory` — see what you're carrying

## Add a Browser Client

To play in a web browser:

```bash
npx sharpee init-browser
npx sharpee build-browser
```

This generates a web bundle you can open in any browser.

## Next Steps

- Learn about [Rooms and Regions](/author-guide/rooms/) in the Author Guide
- Add [Objects and Traits](/author-guide/objects/) for interactive items
- Create [NPCs](/author-guide/npcs/) with conversations
- Explore the [Design Patterns](/design-patterns/) map for IF design inspiration
