# Getting Started with Sharpee for Authors

> ⚠️ **ALPHA SOFTWARE**: Sharpee is currently in alpha. Features may change, and this documentation may contain outdated information or examples that need updating.

Welcome to Sharpee! This guide will help you create your first interactive fiction story.

## What is Sharpee?

Sharpee is a modern TypeScript-based platform for creating interactive fiction (IF). It provides:

- A powerful world model for rooms, objects, and characters
- A natural language parser for player commands
- An extensible action system
- Support for complex game mechanics
- Save/restore functionality
- Multi-language support

## Prerequisites

- Node.js 18 or higher
- Basic familiarity with TypeScript/JavaScript
- A text editor (VS Code recommended)

## Installation

```bash
# Create a new story project
npx create-sharpee-story my-story
cd my-story

# Install dependencies
npm install

# Run your story
npm start
```

## Your First Story

### 1. Basic Structure

Every Sharpee story starts with a world definition:

```typescript
// src/my-story.ts
import { 
  Story, 
  Room, 
  Thing, 
  Player,
  createWorld 
} from '@sharpee/world-model';

export const MyStory: Story = {
  metadata: {
    title: "My First Story",
    author: "Your Name",
    version: "1.0.0",
    description: "A simple adventure"
  },
  
  world: createWorld({
    // Your world definition goes here
  }),
  
  startRoom: 'entrance'
};
```

### 2. Creating Rooms

Rooms are the locations in your story:

```typescript
const entrance = new Room('entrance', {
  name: 'Entrance Hall',
  description: 'A grand entrance hall with marble floors and tall columns.',
  exits: {
    north: 'hallway',
    east: 'library'
  }
});

const hallway = new Room('hallway', {
  name: 'Long Hallway',
  description: 'A dimly lit hallway stretches before you.',
  exits: {
    south: 'entrance',
    north: 'bedroom'
  }
});

const library = new Room('library', {
  name: 'Ancient Library',
  description: 'Dusty bookshelves tower above you, filled with ancient tomes.',
  exits: {
    west: 'entrance'
  }
});
```

### 3. Adding Objects

Objects can be interacted with by the player:

```typescript
const book = new Thing('book', {
  name: 'leather-bound book',
  description: 'An old book with mysterious symbols on the cover.',
  aliases: ['tome', 'volume'],
  location: 'library',
  traits: ['readable', 'takeable'],
  readText: 'The book contains ancient spells and incantations.'
});

const table = new Thing('table', {
  name: 'wooden table',
  description: 'A sturdy oak table.',
  location: 'entrance',
  traits: ['supporter'],
  cannotTake: 'The table is too heavy to carry.'
});

const key = new Thing('key', {
  name: 'brass key',
  description: 'A small brass key with intricate engravings.',
  location: 'table',  // On the table
  traits: ['takeable']
});
```

### 4. Creating the Player

```typescript
const player = new Player('player', {
  name: 'you',
  description: 'As good-looking as ever.',
  location: 'entrance'
});
```

### 5. Putting It All Together

```typescript
export const MyStory: Story = {
  metadata: {
    title: "My First Story",
    author: "Your Name",
    version: "1.0.0"
  },
  
  world: createWorld({
    rooms: [entrance, hallway, library],
    things: [book, table, key],
    player: player
  }),
  
  startRoom: 'entrance',
  
  // Optional: Custom initialization
  initialize: (world) => {
    console.log('Welcome to My First Story!');
  }
};
```

## Common Actions

Players can interact with your world using natural language commands:

### Movement
- `go north` or just `north`, `n`
- `enter library`
- `exit` or `leave`

### Examining
- `look` or `l` - describe current room
- `examine table` or `x table`
- `look at book`

### Manipulation
- `take key` or `get key`
- `drop book`
- `put key on table`
- `open door`
- `close box`

### Inventory
- `inventory` or `i` - list carried items
- `wear hat`
- `remove coat`

### Other
- `save` - save game state
- `restore` - load saved game
- `quit` - end the game
- `help` - show available commands

## Traits System

Traits define how objects behave:

### Basic Traits
- `takeable` - Can be picked up
- `container` - Can hold other objects
- `supporter` - Objects can be placed on it
- `scenery` - Part of room description, can't be taken
- `wearable` - Can be worn
- `edible` - Can be eaten
- `readable` - Can be read

### Door Traits
- `door` - Connects two rooms
- `openable` - Can be opened/closed
- `lockable` - Can be locked/unlocked

### Example: Creating a Container

```typescript
const chest = new Thing('chest', {
  name: 'wooden chest',
  description: 'An old treasure chest.',
  location: 'library',
  traits: ['container', 'openable', 'lockable'],
  isOpen: false,
  isLocked: true,
  keyId: 'key',  // Unlocked with the brass key
  contents: ['gold', 'jewel']
});

const gold = new Thing('gold', {
  name: 'gold coins',
  description: 'A pile of shiny gold coins.',
  traits: ['takeable']
});
```

## Event Handlers

Customize responses to player actions:

```typescript
// In your story definition
eventHandlers: {
  onTake: (event, world) => {
    if (event.item === 'cursed-amulet') {
      return [{
        type: 'MESSAGE',
        text: 'As you touch the amulet, you feel a chill run down your spine.'
      }];
    }
  },
  
  onEnterRoom: (event, world) => {
    if (event.room === 'secret-chamber' && !world.hasVisited('secret-chamber')) {
      return [{
        type: 'MESSAGE',
        text: 'You have discovered the secret chamber! Your score increases.'
      }, {
        type: 'SCORE_CHANGED',
        points: 10
      }];
    }
  }
}
```

## Testing Your Story

### Running Locally

```bash
# Start in development mode with hot reload
npm run dev

# Run in production mode
npm start

# Run tests
npm test
```

### Debug Commands

When developing, these commands help debug:

- `debug on` - Enable debug mode
- `debug inventory` - Show detailed inventory
- `debug location` - Show current position
- `debug scope` - Show visible objects

## Next Steps

### Learn More
- [Advanced World Building](../guides/world-building.md)
- [Creating NPCs](../guides/npcs.md)
- [Puzzle Design](../guides/puzzles.md)
- [Using Extensions](../guides/extensions.md)

### Examples
- [Tutorial Story](../../examples/stories/tutorial/)
- [Classic Adventure](../../examples/stories/classic/)
- [Modern Mystery](../../examples/stories/mystery/)

### Community
- [Discord Server](#) (coming soon)
- [GitHub Discussions](https://github.com/your-org/sharpee/discussions)
- [Extension Marketplace](#) (coming soon)

## Tips for Success

1. **Start Simple**: Begin with a few rooms and basic interactions
2. **Test Often**: Play through your story frequently
3. **Clear Descriptions**: Help players visualize the world
4. **Logical Puzzles**: Make solutions discoverable
5. **Helpful Hints**: Guide stuck players
6. **Save States**: Test save/restore functionality
7. **Beta Test**: Have others play your story

## Common Patterns

### Locked Door Puzzle

```typescript
const door = new Thing('door', {
  name: 'heavy door',
  description: 'A massive wooden door with iron hinges.',
  traits: ['door', 'openable', 'lockable'],
  isLocked: true,
  keyId: 'iron-key',
  connectsRooms: ['hallway', 'treasury']
});
```

### Hidden Object

```typescript
const painting = new Thing('painting', {
  name: 'oil painting',
  description: 'A portrait of a stern-looking nobleman.',
  traits: ['scenery'],
  onExamine: (world) => {
    if (!world.isRevealed('safe')) {
      world.reveal('safe');
      return 'Moving the painting reveals a hidden safe!';
    }
    return 'The painting hangs askew, revealing the safe behind it.';
  }
});

const safe = new Thing('safe', {
  name: 'wall safe',
  description: 'A sturdy metal safe built into the wall.',
  traits: ['container', 'openable', 'lockable'],
  isHidden: true,  // Not visible until revealed
  isLocked: true
});
```

### Scoring System

```typescript
export const MyStory: Story = {
  // ... other configuration
  
  scoring: {
    maxScore: 100,
    ranks: [
      { score: 0, rank: 'Beginner' },
      { score: 25, rank: 'Explorer' },
      { score: 50, rank: 'Adventurer' },
      { score: 75, rank: 'Expert' },
      { score: 100, rank: 'Master' }
    ]
  },
  
  eventHandlers: {
    onTake: (event, world) => {
      if (event.item === 'treasure' && !world.hasScored('found-treasure')) {
        world.addScore('found-treasure', 25);
        return [{ 
          type: 'MESSAGE', 
          text: 'You found the treasure! (25 points)' 
        }];
      }
    }
  }
};
```

---

Ready to create your story? Start with the [Tutorial](../../examples/stories/tutorial/) or dive into the [Complete Reference](../../reference/)!