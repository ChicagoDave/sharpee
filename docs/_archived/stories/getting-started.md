# Story Development Guide

This guide is for authors who want to create interactive fiction games with Sharpee.

## Prerequisites

- Node.js 18+
- Basic JavaScript or TypeScript knowledge (optional)

## Quick Start

### 1. Install Sharpee CLI (Coming Soon)

```bash
npm install -g @sharpee/cli
```

### 2. Create a New Story

```bash
sharpee new my-adventure
cd my-adventure
```

### 3. Run Your Story

```bash
npm start
```

## For Now: Manual Setup

Until the CLI is ready, you can create stories manually:

### 1. Clone the Cloak of Darkness Example

```bash
git clone https://github.com/sharpee/sharpee.git
cd sharpee/stories/cloak-of-darkness
```

### 2. Install Dependencies

```bash
npm install  # or pnpm install
```

### 3. Build and Run

```bash
npm run build:deps  # Build all dependencies
npm run play        # Run the story
```

## Writing Your Story

### Basic Structure

```typescript
// src/index.ts
import { Story, StoryConfig } from '@sharpee/engine';
import { 
  createWorld,
  createRoom,
  createThing,
  createActor 
} from '@sharpee/world-model';

export const story: Story = {
  config: {
    title: "My Adventure",
    author: "Your Name",
    version: "1.0.0",
    language: "en-us"
  },
  
  build: async (world, config) => {
    // Create your game world here
    const kitchen = createRoom(world, {
      id: 'kitchen',
      name: 'Kitchen',
      description: 'A cozy kitchen.'
    });
    
    const player = createActor(world, {
      id: 'player',
      name: 'you'
    });
    
    // Set starting location
    world.setLocation(player.id, kitchen.id);
    
    return { player };
  }
};
```

### Adding Objects

```typescript
const sword = createThing(world, {
  id: 'sword',
  name: 'rusty sword',
  description: 'An old, rusty sword.',
  portable: true,
  weight: 5
});

// Place it in a room
world.setLocation(sword.id, kitchen.id);
```

### Creating Connections

```typescript
const hallway = createRoom(world, {
  id: 'hallway',
  name: 'Hallway'
});

// Connect rooms
kitchen.exits.north = 'hallway';
hallway.exits.south = 'kitchen';
```

## Testing Your Story

Run the built-in test commands:

```bash
npm test
```

Or test interactively:

```bash
npm run play
```

## Common Patterns

### Locked Doors

```typescript
const door = createThing(world, {
  id: 'door',
  name: 'wooden door',
  openable: true,
  open: false,
  lockable: true,
  locked: true,
  key: 'brass-key'
});
```

### Light and Darkness

```typescript
const torch = createThing(world, {
  id: 'torch',
  name: 'torch',
  portable: true,
  lightSource: true,
  lit: false
});
```

### Custom Messages

```typescript
// In your build function
world.on('take:sword', () => {
  return {
    message: 'The sword feels heavier than it looks.'
  };
});
```

## Distribution

### Web Build (Coming Soon)

```bash
sharpee build --target web
```

### Desktop Build (Coming Soon)

```bash
sharpee build --target electron
```

## Next Steps

- Read the [Story Cookbook](./cookbook.md) for more examples
- Learn about [Advanced Features](./advanced.md)
- Join our [Discord community](https://discord.gg/sharpee)
