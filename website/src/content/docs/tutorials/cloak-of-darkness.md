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
- pnpm (`npm install -g pnpm`)
- Basic TypeScript knowledge

## Step 1: Create the Project

```bash
mkdir cloak-of-darkness
cd cloak-of-darkness
pnpm init
```

Edit `package.json`:

```json
{
  "name": "cloak-of-darkness",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "play": "node dist/index.js"
  },
  "dependencies": {
    "@sharpee/engine": "^0.9.0",
    "@sharpee/world-model": "^0.9.0",
    "@sharpee/stdlib": "^0.9.0",
    "@sharpee/parser-en-us": "^0.9.0",
    "@sharpee/lang-en-us": "^0.9.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

Install dependencies:

```bash
pnpm install
```

## Step 2: Create the Story Entry Point

Create `src/index.ts`:

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel,
  EntityType,
  RoomTrait,
  IdentityTrait,
  Direction,
  SceneryTrait,
  WearableTrait,
  SupporterTrait,
  LightSourceTrait
} from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'cloak-of-darkness',
  title: 'Cloak of Darkness',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A basic IF demonstration'
};

export class CloakOfDarkness implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    // We'll add rooms and objects here
  }
}

export default CloakOfDarkness;
```

## Step 3: Create the Foyer

The foyer is the starting room. Add this inside `initializeWorld`:

```typescript
initializeWorld(world: WorldModel): void {
  // === FOYER ===
  const foyer = world.createEntity('foyer', EntityType.ROOM);
  foyer.add(new RoomTrait({
    exits: {},
    isDark: false
  }));
  foyer.add(new IdentityTrait({
    name: 'Foyer of the Opera House',
    description: 'You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead. The entrance from the street is to the north, and there are doorways south and west.',
    properName: true,
    article: 'the'
  }));
}
```

## Step 4: Create the Cloakroom

Add the cloakroom (west of foyer):

```typescript
  // === CLOAKROOM ===
  const cloakroom = world.createEntity('cloakroom', EntityType.ROOM);
  cloakroom.add(new RoomTrait({
    exits: {},
    isDark: false
  }));
  cloakroom.add(new IdentityTrait({
    name: 'Cloakroom',
    description: 'The walls of this small room were clearly once lined with hooks, though now only one remains. The exit is a door to the east.',
    properName: true,
    article: 'the'
  }));
```

## Step 5: Create the Bar

The bar is dark—and stays dark while you wear the cloak:

```typescript
  // === BAR ===
  const bar = world.createEntity('bar', EntityType.ROOM);
  bar.add(new RoomTrait({
    exits: {},
    isDark: true  // Dark until cloak is removed
  }));
  bar.add(new IdentityTrait({
    name: 'Foyer Bar',
    description: 'The bar, much rougher than you would have guessed after the opulence of the foyer to the north, is completely empty. There seems to be some sort of message scrawled in the sawdust on the floor.',
    properName: true,
    article: 'the'
  }));
```

## Step 6: Connect the Rooms

Add exits to connect all three rooms:

```typescript
  // === CONNECT ROOMS ===
  const foyerTrait = foyer.get(RoomTrait)!;
  const cloakroomTrait = cloakroom.get(RoomTrait)!;
  const barTrait = bar.get(RoomTrait)!;

  // Foyer exits
  foyerTrait.exits[Direction.SOUTH] = { destination: bar.id };
  foyerTrait.exits[Direction.WEST] = { destination: cloakroom.id };
  // North exit blocked (opera has ended)

  // Cloakroom exits
  cloakroomTrait.exits[Direction.EAST] = { destination: foyer.id };

  // Bar exits
  barTrait.exits[Direction.NORTH] = { destination: foyer.id };
```

## Step 7: Block the North Exit

The player can't leave—the opera has ended. We'll add a message:

```typescript
  // === BLOCKED EXIT (North from Foyer) ===
  // We handle this with an event handler later
  // For now, just don't add a north exit from foyer
```

## Step 8: Create the Cloak

The cloak is key—it blocks light while worn:

```typescript
  // === THE CLOAK ===
  const cloak = world.createEntity('cloak', EntityType.OBJECT);
  cloak.add(new IdentityTrait({
    name: 'velvet cloak',
    aliases: ['cloak', 'velvet', 'dark cloak', 'black cloak', 'satin cloak'],
    description: 'A handsome cloak, of velvet trimmed with satin, and slightly spattered with raindrops. Its blackness is so deep that it almost seems to suck light from the room.',
    shortDescription: 'a velvet cloak',
    properName: false,
    article: 'a'
  }));
  cloak.add(new WearableTrait({ isWorn: true }));  // Start wearing it

  // The cloak blocks light (special property)
  (cloak as any).blocksLight = true;

  // Place cloak on player (worn)
  const player = world.getPlayer();
  world.moveEntity(cloak.id, player.id);
```

## Step 9: Create the Hook

The hook in the cloakroom holds the cloak:

```typescript
  // === THE HOOK ===
  const hook = world.createEntity('hook', EntityType.SUPPORTER);
  hook.add(new IdentityTrait({
    name: 'small brass hook',
    aliases: ['hook', 'brass hook', 'peg'],
    description: 'It\'s just a small brass hook, screwed to the wall.',
    properName: false,
    article: 'a'
  }));
  hook.add(new SceneryTrait());  // Can't pick up the hook
  hook.add(new SupporterTrait({ capacity: 1 }));  // Can hold one item

  world.moveEntity(hook.id, cloakroom.id);
```

## Step 10: Create the Message

The message in the sawdust is the win condition:

```typescript
  // === THE MESSAGE ===
  const message = world.createEntity('message', EntityType.SCENERY);
  message.add(new IdentityTrait({
    name: 'message',
    aliases: ['message', 'sawdust', 'floor', 'scrawl', 'writing'],
    description: '',  // Dynamic - set by handler
    properName: false,
    article: 'the'
  }));
  message.add(new SceneryTrait());

  // Track disturbance count
  (message as any).disturbCount = 0;

  world.moveEntity(message.id, bar.id);
```

## Step 11: Set the Starting Location

Place the player in the foyer:

```typescript
  // === START LOCATION ===
  world.moveEntity(player.id, foyer.id);
```

## Step 12: Add Game Logic

Now we need custom logic for:
1. Blocking the north exit with a message
2. Disturbing the message when acting in the dark
3. Reading the message (win condition)

Add event handlers after creating the entities:

```typescript
  // === GAME LOGIC ===

  // Track if cloak is blocking light
  const isCloakBlockingLight = (): boolean => {
    const cloakEntity = world.getEntity(cloak.id);
    const wearable = cloakEntity?.get(WearableTrait);
    return wearable?.isWorn === true;
  };

  // The bar is only dark if cloak is worn
  // We check this dynamically by overriding the room's darkness
  (bar as any).isDynamicallyDark = isCloakBlockingLight;
```

## Step 13: Handle the Blocked Exit

Add a handler for trying to go north from the foyer:

```typescript
  // Handle "north" from foyer - opera has ended
  world.on('if.event.going', (event) => {
    if (event.data.from === foyer.id &&
        event.data.direction === Direction.NORTH) {
      return {
        blocked: true,
        message: 'You\'ve only just arrived, and besides, the weather outside seems to be getting worse.'
      };
    }
  });
```

## Step 14: Handle Dark Room Actions

When the player does anything in the dark bar, disturb the message:

```typescript
  // Handle actions in dark bar
  world.on('action.before', (event) => {
    const playerLocation = world.getLocation(player.id);
    if (playerLocation === bar.id && isCloakBlockingLight()) {
      // Any action in the dark disturbs the message
      const msg = world.getEntity(message.id);
      (msg as any).disturbCount = ((msg as any).disturbCount || 0) + 1;

      return {
        blocked: true,
        message: 'In the dark? You could easily disturb something!'
      };
    }
  });
```

## Step 15: Handle Reading the Message

The message changes based on whether it was disturbed:

```typescript
  // Handle examining/reading the message
  world.on('if.event.examining', (event) => {
    if (event.data.targetId === message.id) {
      const msg = world.getEntity(message.id);
      const disturbed = (msg as any).disturbCount || 0;

      if (disturbed === 0) {
        return {
          description: 'The message, neatly marked in the sawdust, reads: "You have won!"'
        };
      } else if (disturbed < 2) {
        return {
          description: 'The message has been carelessly trampled, making it difficult to read. You can just make out: "You have...!"'
        };
      } else {
        return {
          description: 'The message has been trampled beyond recognition. You have lost.'
        };
      }
    }
  });
```

## Complete Code

Here's the full `src/index.ts`:

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel,
  EntityType,
  RoomTrait,
  IdentityTrait,
  Direction,
  SceneryTrait,
  WearableTrait,
  SupporterTrait
} from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'cloak-of-darkness',
  title: 'Cloak of Darkness',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A basic IF demonstration'
};

export class CloakOfDarkness implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    // === ROOMS ===

    // Foyer
    const foyer = world.createEntity('foyer', EntityType.ROOM);
    foyer.add(new RoomTrait({ exits: {}, isDark: false }));
    foyer.add(new IdentityTrait({
      name: 'Foyer of the Opera House',
      description: 'You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead. The entrance from the street is to the north, and there are doorways south and west.',
      properName: true,
      article: 'the'
    }));

    // Cloakroom
    const cloakroom = world.createEntity('cloakroom', EntityType.ROOM);
    cloakroom.add(new RoomTrait({ exits: {}, isDark: false }));
    cloakroom.add(new IdentityTrait({
      name: 'Cloakroom',
      description: 'The walls of this small room were clearly once lined with hooks, though now only one remains. The exit is a door to the east.',
      properName: true,
      article: 'the'
    }));

    // Bar (dark)
    const bar = world.createEntity('bar', EntityType.ROOM);
    bar.add(new RoomTrait({ exits: {}, isDark: true }));
    bar.add(new IdentityTrait({
      name: 'Foyer Bar',
      description: 'The bar, much rougher than you would have guessed after the opulence of the foyer to the north, is completely empty. There seems to be some sort of message scrawled in the sawdust on the floor.',
      properName: true,
      article: 'the'
    }));

    // === CONNECT ROOMS ===
    const foyerTrait = foyer.get(RoomTrait)!;
    const cloakroomTrait = cloakroom.get(RoomTrait)!;
    const barTrait = bar.get(RoomTrait)!;

    foyerTrait.exits[Direction.SOUTH] = { destination: bar.id };
    foyerTrait.exits[Direction.WEST] = { destination: cloakroom.id };
    cloakroomTrait.exits[Direction.EAST] = { destination: foyer.id };
    barTrait.exits[Direction.NORTH] = { destination: foyer.id };

    // === OBJECTS ===

    // The velvet cloak
    const cloak = world.createEntity('cloak', EntityType.OBJECT);
    cloak.add(new IdentityTrait({
      name: 'velvet cloak',
      aliases: ['cloak', 'velvet', 'dark cloak'],
      description: 'A handsome cloak, of velvet trimmed with satin, and slightly spattered with raindrops. Its blackness is so deep that it almost seems to suck light from the room.',
      shortDescription: 'a velvet cloak',
      properName: false,
      article: 'a'
    }));
    cloak.add(new WearableTrait({ isWorn: true }));
    (cloak as any).blocksLight = true;

    // The brass hook
    const hook = world.createEntity('hook', EntityType.SUPPORTER);
    hook.add(new IdentityTrait({
      name: 'small brass hook',
      aliases: ['hook', 'brass hook', 'peg'],
      description: 'It\'s just a small brass hook, screwed to the wall.',
      properName: false,
      article: 'a'
    }));
    hook.add(new SceneryTrait());
    hook.add(new SupporterTrait({ capacity: 1 }));
    world.moveEntity(hook.id, cloakroom.id);

    // The message
    const message = world.createEntity('message', EntityType.SCENERY);
    message.add(new IdentityTrait({
      name: 'message',
      aliases: ['message', 'sawdust', 'scrawl'],
      description: '',
      properName: false,
      article: 'the'
    }));
    message.add(new SceneryTrait());
    (message as any).disturbCount = 0;
    world.moveEntity(message.id, bar.id);

    // === PLACE PLAYER ===
    const player = world.getPlayer();
    world.moveEntity(cloak.id, player.id);
    world.moveEntity(player.id, foyer.id);

    // === GAME LOGIC ===

    // Check if cloak blocks light
    const isCloakWorn = (): boolean => {
      const c = world.getEntity(cloak.id);
      return c?.get(WearableTrait)?.isWorn === true;
    };

    // Store references for handlers
    (world as any)._cloak = { bar, message, cloak, isCloakWorn };
  }

  // Language extensions for custom messages
  getLanguageExtensions() {
    return {
      'cloak.blocked_north': 'You\'ve only just arrived, and besides, the weather outside seems to be getting worse.',
      'cloak.dark_warning': 'In the dark? You could easily disturb something!',
      'cloak.message_win': 'The message, neatly marked in the sawdust, reads: "You have won!"',
      'cloak.message_partial': 'The message has been carelessly trampled, making it difficult to read. You can just make out: "You have...!"',
      'cloak.message_lost': 'The message has been trampled beyond recognition. You have lost.'
    };
  }
}

export default CloakOfDarkness;
```

## Step 16: Build and Play

```bash
pnpm build
pnpm play
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

> north
In the dark? You could easily disturb something!

> north
Foyer of the Opera House

> west
Cloakroom

> drop cloak
Dropped.

> east

> south
Foyer Bar

> read message
The message has been carelessly trampled...
```

## What You Learned

- **Rooms**: Creating locations with `RoomTrait` and `IdentityTrait`
- **Connections**: Linking rooms with directional exits
- **Objects**: Portable items with traits like `WearableTrait`
- **Scenery**: Fixed items with `SceneryTrait`
- **Supporters**: Items that hold other items (`SupporterTrait`)
- **Dark rooms**: Using `isDark: true` for rooms requiring light
- **Custom properties**: Adding game state with `(entity as any).property`
- **Event handlers**: Reacting to game events for custom logic
- **Language extensions**: Providing custom message text

## Next Steps

- Add a **transcript test** to verify both win and lose paths
- Implement proper **light blocking** with `LightSourceTrait`
- Add **scoring** for winning
- Create a **hint system** for stuck players

## Resources

- [Cloak of Darkness specification](https://www.firthworks.com/roger/cloak/)
- [Rooms and Regions Guide](/docs/author-guide/rooms)
- [Objects and Traits Guide](/docs/author-guide/objects)
