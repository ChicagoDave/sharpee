---
title: "Cloak of Darkness Tutorial"
description: "Build the classic IF tutorial game step by step"
section: "tutorials"
order: 1
---

# Cloak of Darkness Tutorial

*Cloak of Darkness* is a simple game used to compare interactive fiction systems. By building it, you'll learn the core concepts of Sharpee.

## The Game

**Three rooms**: Foyer, Bar, Cloakroom

**One object**: A velvet cloak (worn by the player)

**The puzzle**: The bar is dark. If you try to do anything in the dark, you "disturb" a message written in the dust. Hang your cloak on the hook in the cloakroom first—the cloak blocks light. Then you can read the message in the now-lit bar.

**Win condition**: Read the message in the bar without disturbing it.

## Prerequisites

- Node.js 18+
- Basic TypeScript knowledge

## Step 1: Create the Project

Use the Sharpee CLI to scaffold your project:

```bash
npx @sharpee/sharpee init cloak-of-darkness
```

Answer the prompts:
- **Story title**: Cloak of Darkness
- **Story ID**: cloak-of-darkness
- **Author name**: Your Name
- **Description**: A basic IF demonstration

Then install dependencies:

```bash
cd cloak-of-darkness
npm install
```

Your project now has:
```
cloak-of-darkness/
├── src/
│   └── index.ts      # Your story code
├── package.json
├── tsconfig.json
└── .gitignore
```

## Step 2: Understand the Story Structure

Open `src/index.ts`. The template gives you:

```typescript
import {
  Story,
  StoryConfig,
  WorldModel,
  IFEntity,
  Parser,
  LanguageProvider,
} from '@sharpee/sharpee';

export const config: StoryConfig = {
  id: 'cloak-of-darkness',
  title: 'Cloak of Darkness',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A basic IF demonstration',
};

export const story: Story = {
  config,

  initializeWorld(world: WorldModel): IFEntity {
    const player = world.getPlayer();

    // Your rooms and objects go here

    return startRoom; // Return the starting room
  },
};

export default story;
```

## Step 3: Create the Rooms

Replace the `initializeWorld` function with our three rooms:

```typescript
initializeWorld(world: WorldModel): IFEntity {
  const player = world.getPlayer();

  // === FOYER ===
  const foyer = world.createRoom('foyer', {
    name: 'Foyer of the Opera House',
    description: 'You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead. The entrance from the street is to the north, and there are doorways south and west.',
  });

  // === CLOAKROOM ===
  const cloakroom = world.createRoom('cloakroom', {
    name: 'Cloakroom',
    description: 'The walls of this small room were clearly once lined with hooks, though now only one remains. The exit is a door to the east.',
  });

  // === BAR (dark) ===
  const bar = world.createRoom('bar', {
    name: 'Foyer Bar',
    description: 'The bar, much rougher than you would have guessed after the opulence of the foyer to the north, is completely empty. There seems to be some sort of message scrawled in the sawdust on the floor.',
    isDark: true,  // Dark until cloak is removed
  });

  // === CONNECT ROOMS ===
  world.connectRooms(foyer.id, 'south', bar.id);
  world.connectRooms(foyer.id, 'west', cloakroom.id);
  // Note: no north exit from foyer (opera has ended)

  // Place player in foyer
  world.moveEntity(player.id, foyer.id);

  return foyer;
}
```

## Step 4: Create the Cloak

The cloak is key—it blocks light while worn. Add this before the `return foyer;`:

```typescript
  // === THE CLOAK ===
  const cloak = world.createObject('cloak', {
    name: 'velvet cloak',
    aliases: ['cloak', 'velvet', 'dark cloak', 'black cloak'],
    description: 'A handsome cloak, of velvet trimmed with satin, and slightly spattered with raindrops. Its blackness is so deep that it almost seems to suck light from the room.',
  });

  // Make it wearable and start worn
  world.addTrait(cloak.id, 'wearable', { isWorn: true });

  // The cloak blocks light (custom property)
  (cloak as any).blocksLight = true;

  // Place on player (worn)
  world.moveEntity(cloak.id, player.id);
```

## Step 5: Create the Hook

The hook in the cloakroom holds the cloak:

```typescript
  // === THE HOOK ===
  const hook = world.createObject('hook', {
    name: 'small brass hook',
    aliases: ['hook', 'brass hook', 'peg'],
    description: "It's just a small brass hook, screwed to the wall.",
  });

  // It's scenery (can't take) and a supporter (can hold things)
  world.addTrait(hook.id, 'scenery');
  world.addTrait(hook.id, 'supporter', { capacity: 1 });

  world.moveEntity(hook.id, cloakroom.id);
```

## Step 6: Create the Message

The message in the sawdust is the win condition:

```typescript
  // === THE MESSAGE ===
  const message = world.createObject('message', {
    name: 'message',
    aliases: ['message', 'sawdust', 'scrawl', 'writing', 'floor'],
    description: '',  // Set dynamically
  });

  world.addTrait(message.id, 'scenery');

  // Track disturbance count
  (message as any).disturbCount = 0;

  world.moveEntity(message.id, bar.id);
```

## Step 7: Build and Test

Build your story:

```bash
npm run build
```

If you want to test with the Sharpee CLI (when running from the monorepo):

```bash
node dist/index.js
```

## Step 8: Add Browser Support

To play your game in a web browser:

```bash
npx @sharpee/sharpee init-browser
npm install
npm run build:browser
```

This creates a `dist/web/` folder with your playable game. Test it locally:

```bash
npx serve dist/web
```

Open http://localhost:3000 in your browser.

## Complete Code

Here's the full `src/index.ts`:

```typescript
import {
  Story,
  StoryConfig,
  WorldModel,
  IFEntity,
  Parser,
  LanguageProvider,
} from '@sharpee/sharpee';

export const config: StoryConfig = {
  id: 'cloak-of-darkness',
  title: 'Cloak of Darkness',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A basic IF demonstration',
};

export const story: Story = {
  config,

  initializeWorld(world: WorldModel): IFEntity {
    const player = world.getPlayer();

    // === ROOMS ===

    const foyer = world.createRoom('foyer', {
      name: 'Foyer of the Opera House',
      description: 'You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead. The entrance from the street is to the north, and there are doorways south and west.',
    });

    const cloakroom = world.createRoom('cloakroom', {
      name: 'Cloakroom',
      description: 'The walls of this small room were clearly once lined with hooks, though now only one remains. The exit is a door to the east.',
    });

    const bar = world.createRoom('bar', {
      name: 'Foyer Bar',
      description: 'The bar, much rougher than you would have guessed after the opulence of the foyer to the north, is completely empty. There seems to be some sort of message scrawled in the sawdust on the floor.',
      isDark: true,
    });

    // === CONNECT ROOMS ===
    world.connectRooms(foyer.id, 'south', bar.id);
    world.connectRooms(foyer.id, 'west', cloakroom.id);

    // === THE CLOAK ===
    const cloak = world.createObject('cloak', {
      name: 'velvet cloak',
      aliases: ['cloak', 'velvet', 'dark cloak'],
      description: 'A handsome cloak, of velvet trimmed with satin, and slightly spattered with raindrops. Its blackness is so deep that it almost seems to suck light from the room.',
    });
    world.addTrait(cloak.id, 'wearable', { isWorn: true });
    (cloak as any).blocksLight = true;
    world.moveEntity(cloak.id, player.id);

    // === THE HOOK ===
    const hook = world.createObject('hook', {
      name: 'small brass hook',
      aliases: ['hook', 'brass hook', 'peg'],
      description: "It's just a small brass hook, screwed to the wall.",
    });
    world.addTrait(hook.id, 'scenery');
    world.addTrait(hook.id, 'supporter', { capacity: 1 });
    world.moveEntity(hook.id, cloakroom.id);

    // === THE MESSAGE ===
    const message = world.createObject('message', {
      name: 'message',
      aliases: ['message', 'sawdust', 'scrawl'],
      description: '',
    });
    world.addTrait(message.id, 'scenery');
    (message as any).disturbCount = 0;
    world.moveEntity(message.id, bar.id);

    // === PLACE PLAYER ===
    world.moveEntity(player.id, foyer.id);

    return foyer;
  },

  extendParser(parser: Parser): void {
    // Add custom vocabulary here
  },

  extendLanguage(language: LanguageProvider): void {
    // Add custom messages here
  },
};

export default story;
```

## Sample Playthrough

**Winning path:**

```
> look
Foyer of the Opera House
You are standing in a spacious hall...

> west
Cloakroom
The walls of this small room were clearly once lined with hooks...

> hang cloak on hook
You put the velvet cloak on the small brass hook.

> east
Foyer of the Opera House

> south
Foyer Bar
The bar, much rougher than you would have guessed...

> read message
The message, neatly marked in the sawdust, reads: "You have won!"
```

**Losing path:**

```
> south
It's pitch dark, and you can't see a thing.

> look
In the dark? You could easily disturb something!

> north
Foyer of the Opera House

> west
Cloakroom

> hang cloak on hook
You put the velvet cloak on the small brass hook.

> east. south
Foyer Bar

> read message
The message has been carelessly trampled...
```

## What You Learned

- **Project setup**: Using `npx @sharpee/sharpee init` to scaffold a project
- **Rooms**: Creating locations with `world.createRoom()`
- **Connections**: Linking rooms with `world.connectRooms()`
- **Objects**: Creating items with `world.createObject()`
- **Traits**: Adding behaviors with `world.addTrait()`
- **Dark rooms**: Using `isDark: true` for rooms requiring light
- **Custom properties**: Adding game state with `(entity as any).property`
- **Browser build**: Using `init-browser` and `build:browser` for web deployment

## Next Steps

- Add **event handlers** to block the north exit and disturb the message
- Implement proper **light blocking** logic
- Add **scoring** for winning
- Create a **transcript test** to verify both win and lose paths

## Resources

- [Cloak of Darkness specification](https://www.firthworks.com/roger/cloak/)
- [Rooms and Regions Guide](/docs/author-guide/rooms)
- [Objects and Traits Guide](/docs/author-guide/objects)
