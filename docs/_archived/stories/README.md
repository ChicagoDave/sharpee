# Story Development Guide

Create interactive fiction games using the Sharpee platform with TypeScript.

> **Note:** The Forge fluent authoring API is planned but not yet implemented. Story development currently uses the AuthorModel directly.

## Overview

Sharpee stories are TypeScript applications that:
- Define the game world (rooms, items, NPCs)
- Configure game mechanics (scoring, combat, puzzles)
- Handle special events and story logic
- Use a fluent API for authoring (Forge - coming soon)

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm 8+
- TypeScript knowledge
- Understanding of IF concepts (rooms, objects, commands)
- Text editor (VS Code recommended)

### Quick Start

```bash
# Create a new story project
mkdir my-story
cd my-story
pnpm init

# Install Sharpee dependencies
pnpm add @sharpee/engine @sharpee/stdlib @sharpee/lang-en

# Install dev dependencies
pnpm add -D typescript @types/node
```

## Story Structure

```
my-story/
├── src/
│   ├── index.ts         # Entry point
│   ├── world.ts         # World definition
│   ├── rooms/           # Room definitions
│   ├── items/           # Item definitions
│   ├── npcs/            # NPC definitions
│   └── events/          # Custom event handlers
├── assets/              # Images, sounds (future)
├── package.json
├── tsconfig.json
└── README.md
```

## Creating Your First Story

### 1. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 2. Create the Entry Point

```typescript
// src/index.ts
import { Engine } from '@sharpee/engine';
import { StandardLibrary } from '@sharpee/stdlib';
import { EnglishLanguage } from '@sharpee/lang-en';
import { createWorld } from './world';

async function main() {
  // Create engine
  const engine = new Engine({
    language: new EnglishLanguage(),
    library: new StandardLibrary()
  });

  // Create and initialize world
  const world = createWorld();
  engine.setWorld(world);

  // Start the game
  await engine.start();
  
  console.log("Welcome to My Story!");
  console.log("Type 'help' for commands.\n");
  
  // Game loop
  await engine.run();
}

main().catch(console.error);
```

## Current Authoring (AuthorModel)

Until Forge is implemented, use the AuthorModel for unrestricted world building:

```typescript
// src/world.ts
import { WorldModel, AuthorModel } from '@sharpee/world-model';
import { registerStandardCapabilities } from '@sharpee/stdlib';

export function createWorld(): WorldModel {
  const world = new WorldModel();
  const author = new AuthorModel(world.getDataStore());

  // Register capabilities
  registerStandardCapabilities(world, ['scoring', 'gameMeta']);

  // Create rooms
  const entrance = author.createEntity('Entrance Hall', 'room');
  entrance.add(new RoomTrait({
    description: 'A grand entrance hall with marble floors.'
  }));

  const library = author.createEntity('Library', 'room');
  library.add(new RoomTrait({
    description: 'Shelves of ancient books surround you.'
  }));

  // Connect rooms
  author.connect(entrance.id, library.id, 'north');

  // Create items
  const lamp = author.createEntity('brass lamp', 'item');
  lamp.attributes.description = 'An old brass lamp.';
  
  // Place items (even in closed containers!)
  author.moveEntity(lamp.id, entrance.id);

  // Create player
  const player = author.createEntity('You', 'actor');
  author.setPlayer(player.id);
  author.moveEntity(player.id, entrance.id);

  return world;
}
```

## Future: Forge Fluent API (Planned)

Forge will provide a more intuitive, fluent TypeScript API for authoring:

```typescript
// What Forge will look like (NOT YET IMPLEMENTED)
import { Forge } from '@sharpee/forge';

const story = new Forge.Story('My Adventure');

// Fluent room creation
const entrance = story.room('Entrance Hall')
  .description('A grand entrance hall with marble floors.')
  .exits({ north: 'library' });

const library = story.room('Library')
  .description('Shelves of ancient books surround you.')
  .exits({ south: 'entrance' });

// Fluent item creation  
const lamp = story.item('brass lamp')
  .description('An old brass lamp.')
  .in(entrance)
  .onRub(() => {
    story.say("A genie appears in a puff of smoke!");
    story.score(25);
  });

// Fluent NPC creation
const wizard = story.npc('Wizard')
  .description('A wise old wizard.')
  .in(library)
  .topics({
    'magic': "Magic is all around us.",
    'lamp': "Try rubbing it three times."
  });

// Start the story
story.start(entrance);
```

### 3. Create Rooms with AuthorModel

```typescript
// src/rooms/index.ts
import { AuthorModel } from '@sharpee/world-model';
import { RoomTrait, ExitTrait } from '@sharpee/world-model';

export function createRooms(author: AuthorModel) {
  // Entrance
  const entrance = author.createEntity('Entrance Hall', 'room');
  entrance.add(new RoomTrait({
    description: 'A grand entrance hall with marble floors and towering columns.'
  }));

  // Library
  const library = author.createEntity('Library', 'room');
  library.add(new RoomTrait({
    description: 'Floor-to-ceiling bookshelves filled with ancient tomes.'
  }));

  // Tower
  const tower = author.createEntity('Tower', 'room');
  tower.add(new RoomTrait({
    description: 'A circular room at the top of a spiral staircase.'
  }));

  // Connect rooms
  author.connect(entrance.id, library.id, 'north');
  author.connect(library.id, tower.id, 'up');

  return { entrance, library, tower };
}
```

### 4. Create Items with AuthorModel

```typescript
// src/items/index.ts
import { AuthorModel } from '@sharpee/world-model';
import { ContainerTrait, OpenableTrait, LockableTrait } from '@sharpee/world-model';

export function createItems(author: AuthorModel) {
  // Lamp
  const lamp = author.createEntity('brass lamp', 'item');
  lamp.attributes.description = 'An old brass lamp, slightly tarnished.';
  lamp.attributes.adjectives = ['brass', 'old'];
  
  // Treasure chest
  const chest = author.createEntity('treasure chest', 'container');
  chest.add(new ContainerTrait({ capacity: 50 }));
  chest.add(new OpenableTrait({ isOpen: false }));
  chest.add(new LockableTrait({ 
    isLocked: true,
    requiredKey: 'golden-key'
  }));
  
  // Golden key
  const key = author.createEntity('golden key', 'item');
  key.attributes.id = 'golden-key';
  key.attributes.description = 'A small golden key with intricate engravings.';
  
  // Treasure
  const treasure = author.createEntity('pile of gold coins', 'item');
  treasure.attributes.value = 1000;
  treasure.attributes.points = 50;
  
  // Place treasure in chest
  author.moveEntity(treasure.id, chest.id);
  
  return { lamp, chest, key, treasure };
}
```

### 5. Create NPCs with AuthorModel

```typescript
// src/npcs/index.ts
import { AuthorModel } from '@sharpee/world-model';
import { ActorTrait, ConversationTrait } from '@sharpee/world-model';

export function createNPCs(author: AuthorModel) {
  const wizard = author.createEntity('Wizard', 'actor');
  wizard.add(new ActorTrait({
    isPlayer: false,
    description: 'A wise old wizard with a long white beard.'
  }));
  
  // Add conversation topics
  wizard.attributes.topics = {
    'magic': "Magic is all around us, you just need to know how to see it.",
    'quest': "Find the golden key and the treasure shall be yours!",
    'lamp': "Ah, that old lamp? Rub it three times and see what happens..."
  };
  
  return { wizard };
}
```

### 6. Add Custom Events

```typescript
// src/events/lamp-events.ts
import { SemanticEvent, createEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';

export function registerLampEvents(world: WorldModel) {
  // Handle rubbing the lamp
  world.registerEventHandler('RUBBED', (event: SemanticEvent, world: WorldModel) => {
    if (event.entities.target === 'lamp') {
      // First time rubbing?
      const lampState = world.getStateValue('lampRubbed') || 0;
      
      if (lampState === 2) {
        // Third rub - create genie!
        const author = new AuthorModel(world.getDataStore());
        const genie = author.createEntity('Genie', 'actor');
        author.moveEntity(genie.id, world.getPlayer()!.id);
        
        // Award points
        world.updateCapability('scoring', {
          scoreValue: (world.getCapability('scoring')?.scoreValue || 0) + 25
        });
        
        // Emit message
        world.applyEvent(createEvent('MESSAGE', {
          messageKey: 'lamp.genie_appears'
        }));
      }
      
      world.setStateValue('lampRubbed', lampState + 1);
    }
  });
}
```

## Game Mechanics

### Scoring

```typescript
// Award points for achievements
world.registerEventHandler('TAKEN', (event: SemanticEvent, world: WorldModel) => {
  if (event.entities.target === 'treasure') {
    const scoring = world.getCapability('scoring');
    if (scoring) {
      world.updateCapability('scoring', {
        scoreValue: scoring.scoreValue + 50,
        achievements: [...(scoring.achievements || []), 'Found Treasure']
      });
    }
  }
});
```

### Puzzle Logic

```typescript
// Custom puzzle action
class SolvePuzzleAction implements ActionExecutor {
  id = 'SOLVE';
  aliases = ['solve'];

  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const puzzleState = context.world.getStateValue('puzzleState');
    
    if (puzzleState === 'solved') {
      return [createEvent('MESSAGE', {
        messageKey: 'puzzle.already_solved'
      })];
    }
    
    // Check solution
    const solution = command.parsed.extras?.text;
    if (solution === 'magic word') {
      return [createEvent('PUZZLE_SOLVED', {
        puzzle: 'door_puzzle',
        messageKey: 'puzzle.correct'
      })];
    }
    
    return [createEvent('MESSAGE', {
      messageKey: 'puzzle.incorrect'
    })];
  }
}
```

### Dynamic Descriptions

```typescript
// Change descriptions based on game state
room.attributes.getDescription = function() {
  const world = this.world; // Assuming world reference
  const lampLit = world.getStateValue('lampLit');
  
  if (lampLit) {
    return "The room is brightly illuminated by your lamp.";
  } else {
    return "The room is shrouded in darkness.";
  }
};
```

## Using Extensions

```typescript
// Install extension
// pnpm add @someone/sharpee-ext-combat

import { CombatExtension } from '@someone/sharpee-ext-combat';

// In world creation
const combat = new CombatExtension({
  difficulty: 'normal'
});

combat.initialize({
  world,
  actions: engine.actions,
  language: engine.language
});

// Now combat commands are available!
```

## Testing Your Story

```typescript
// src/test/story.test.ts
import { createWorld } from '../world';
import { Engine } from '@sharpee/engine';

describe('My Story', () => {
  let engine: Engine;
  let world: WorldModel;

  beforeEach(() => {
    world = createWorld();
    engine = new Engine({ world });
  });

  test('player starts in entrance', () => {
    const player = world.getPlayer();
    const location = world.getLocation(player.id);
    const room = world.getEntity(location);
    
    expect(room.name).toBe('Entrance Hall');
  });

  test('taking treasure awards points', async () => {
    // Simulate taking treasure
    await engine.processCommand('take treasure');
    
    const scoring = world.getCapability('scoring');
    expect(scoring.scoreValue).toBe(50);
  });
});
```

## Building and Running

### Development

```json
// package.json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  }
}
```

### Running Your Story

```bash
# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

## Best Practices

1. **Start Small** - Begin with a few rooms and expand
2. **Test Often** - Play through regularly
3. **Be Consistent** - Use consistent naming and descriptions
4. **Provide Hints** - Help players when stuck
5. **Polish Text** - Good writing makes great IF

## Examples

Check out these example stories:

- [Tutorial Game](../../stories/tutorial) - Learn the basics
- [Mystery Mansion](../../stories/mystery) - Classic mystery
- [Space Station](../../stories/scifi) - Sci-fi adventure

## Why Forge?

The planned Forge API will make authoring more intuitive:

1. **Fluent Interface** - Chain methods naturally
2. **Type Safety** - Full IntelliSense support
3. **Less Boilerplate** - Hide complexity
4. **Better Errors** - Friendly error messages
5. **Consistent Patterns** - Learn once, use everywhere

## Current Limitations

Without Forge, you need to:
- Manually manage entity IDs
- Use lower-level APIs
- Handle trait creation directly
- Wire up events manually

But AuthorModel is powerful and gives you complete control!

## Resources

- [Writing Better IF](./writing-guide.md)
- [Common Patterns](./patterns.md)
- [Debugging Tips](./debugging.md)
- [Performance Guide](./performance.md)

## Getting Help

- Start with the [Tutorial Game](../../stories/tutorial)
- Check [Common Issues](./troubleshooting.md)
- Ask in Discord (coming soon)
- Browse [Example Code](../../stories)

---

Happy storytelling! 📖✨
