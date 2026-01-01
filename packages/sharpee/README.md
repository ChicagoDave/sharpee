# @sharpee/sharpee

A modern TypeScript interactive fiction engine for creating text adventures and parser-based games.

[![npm version](https://img.shields.io/npm/v/@sharpee/sharpee/beta.svg)](https://www.npmjs.com/package/@sharpee/sharpee)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @sharpee/sharpee
```

## Features

- **Event-Driven Architecture** - Immutable events for all state changes
- **Rich World Model** - Entities with traits, behaviors, and relationships
- **Natural Language Parser** - Understands complex player commands
- **Extensible** - Add custom actions, behaviors, and game mechanics
- **Type-Safe** - Full TypeScript with strict typing

## Quick Start

```typescript
import {
  GameEngine,
  WorldModel,
  EnglishParser,
  EnglishLanguageProvider,
  TextService
} from '@sharpee/sharpee';

// Define your story
const story = {
  metadata: {
    title: 'My Adventure',
    author: 'Your Name',
    version: '1.0.0'
  },

  setup(world: WorldModel) {
    // Create a room
    const room = world.createEntity('room', {
      id: 'start-room',
      name: 'Starting Room',
      description: 'You are in a small room with stone walls.'
    });

    // Set as starting location
    world.setStartingLocation(room);
  }
};

// Initialize the engine
const engine = new GameEngine({
  story,
  parser: new EnglishParser(),
  languageProvider: new EnglishLanguageProvider(),
  textService: new TextService()
});

// Start the game
const startEvents = engine.start();

// Process player commands
const events = engine.processCommand('look');
```

## What's Included

This package re-exports the core Sharpee packages:

| Export | Description |
|--------|-------------|
| `GameEngine` | Main game runtime |
| `WorldModel`, `IFEntity` | Entity and world management |
| `EnglishParser` | Natural language command parser |
| `EnglishLanguageProvider` | English text generation |
| `TextService` | Text formatting and output |
| `QueryManager` | Player input queries (yes/no, menus) |

## Standard Actions

The engine includes 40+ standard IF actions out of the box:

- **Movement**: go, enter, exit
- **Manipulation**: take, drop, put, insert, remove
- **Interaction**: open, close, lock, unlock, push, pull
- **Observation**: look, examine, search, read
- **Communication**: talk, give, show
- **Meta**: save, restore, quit, inventory, score

## Documentation

- [GitHub Repository](https://github.com/ChicagoDave/sharpee)
- [Author's Guide](https://github.com/ChicagoDave/sharpee/blob/main/docs/getting-started/authors/README.md)
- [API Reference](https://github.com/ChicagoDave/sharpee/blob/main/docs/api/README.md)
- [Architecture Decisions](https://github.com/ChicagoDave/sharpee/blob/main/docs/architecture/adrs/)

## Example Stories

See the [stories directory](https://github.com/ChicagoDave/sharpee/tree/main/stories) for complete examples:

- **Cloak of Darkness** - The classic IF benchmark
- **Dungeo** - Full implementation of Mainframe Zork (~190 rooms)

## Requirements

- Node.js 18+
- TypeScript 5.2+ (for development)

## License

MIT
