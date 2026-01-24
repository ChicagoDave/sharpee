---
title: "Quick Start"
description: "Create your first interactive fiction story with Sharpee"
---

## Your First Story

Let's create a simple two-room adventure to understand the basics.

### 1. Create the Entry Point

Create `src/index.ts`:

```typescript
import { createStory, WorldModel, AuthorModel, IFEntity } from '@sharpee/sharpee';

const story = createStory({
  title: 'My First Adventure',
  author: 'Your Name',
  version: '1.0.0',

  initializeWorld(world: WorldModel): IFEntity {
    // Create starting room
    const foyer = world.createRoom('foyer', {
      name: 'Foyer',
      description: 'A grand entrance hall with marble floors. A doorway leads north.',
    });

    // Create another room
    const library = world.createRoom('library', {
      name: 'Library',
      description: 'Dusty bookshelves line the walls. The foyer is to the south.',
    });

    // Connect the rooms
    world.connectRooms(foyer.id, 'north', library.id);

    // Return the starting room
    return foyer;
  },
});

export default story;
```

### 2. Add an Object

Let's add a book the player can interact with:

```typescript
initializeWorld(world: WorldModel): IFEntity {
  // ... room creation code ...

  // Create a book
  const book = world.createEntity('book', 'object', {
    name: 'dusty book',
    description: 'An ancient tome with faded gold lettering.',
  });

  // Place it in the library
  world.moveEntity(book.id, library.id);

  return foyer;
}
```

### 3. Using AuthorModel for Setup

When placing items in closed containers during world setup, use `AuthorModel` to bypass validation:

```typescript
initializeWorld(world: WorldModel): IFEntity {
  // ... room creation code ...

  // Create a closed chest
  const chest = world.createEntity('chest', 'container', {
    name: 'wooden chest',
    isOpen: false,
  });
  world.moveEntity(chest.id, library.id);

  // Create a gem to hide inside
  const gem = world.createEntity('gem', 'object', {
    name: 'sparkling gem',
  });

  // Use AuthorModel to bypass "container is closed" validation
  const author = new AuthorModel(world.getDataStore(), world);
  author.moveEntity(gem.id, chest.id);

  return foyer;
}
```

### 4. Run Your Story

Build and run with the Sharpee CLI:

```bash
npx sharpee --play
```

You can now explore your world with commands like:

- `look` - Describe the current room
- `north` or `n` - Move north
- `examine book` - Look at the book
- `take book` - Pick up the book
- `inventory` - See what you're carrying

## Next Steps

- Learn about [Rooms and Regions](/author-guide/rooms/) in the Author Guide
- Add [Objects and Traits](/author-guide/objects/) for interactive items
- Create [NPCs](/author-guide/npcs/) with conversations
