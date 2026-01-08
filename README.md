# Sharpee Interactive Fiction Platform

[![npm](https://img.shields.io/npm/v/@sharpee/sharpee/beta?label=npm%40beta&color=orange)](https://www.npmjs.com/package/@sharpee/sharpee)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

A modern, TypeScript-based platform for creating parser-based interactive fiction.

## Installation

```bash
npm install @sharpee/sharpee@beta
```

> **Beta Release**: The platform is feature-complete for story development. Documentation is being expanded.

## What's Included

The `@sharpee/sharpee` meta-package installs all core packages:

| Package | Description |
|---------|-------------|
| `@sharpee/core` | Event system, types, utilities |
| `@sharpee/world-model` | Entity system with traits and behaviors |
| `@sharpee/stdlib` | 43 standard IF actions |
| `@sharpee/engine` | Game runtime and command processor |
| `@sharpee/parser-en-us` | English natural language parser |
| `@sharpee/lang-en-us` | English language messages |
| `@sharpee/if-domain` | Grammar builder interfaces |
| `@sharpee/if-services` | Service interfaces |
| `@sharpee/event-processor` | Event processing |
| `@sharpee/text-services` | Text formatting |

### Additional Packages

| Package | Description |
|---------|-------------|
| `@sharpee/transcript-tester` | Test stories via transcript files |
| `@sharpee/client-core` | Shared client infrastructure |
| `@sharpee/forge` | Story scaffolding and build tools |

## Features

- **Event-Driven Architecture** - Immutable semantic events for all state changes
- **Natural Language Parser** - Understands complex player commands with slot constraints
- **Rich World Model** - Entities with traits, behaviors, and relationships
- **43 Standard Actions** - take, drop, open, close, lock, unlock, wear, eat, drink, attack, and more
- **Four-Phase Action Pattern** - Consistent validate/execute/report/blocked flow
- **Capability Dispatch** - Entity-specific handling for generic verbs
- **NPC System** - Autonomous characters with behaviors and schedules
- **Daemons & Fuses** - Timed events and background processes
- **Perception System** - Handles darkness, blindness, and sensory restrictions
- **Type-Safe** - Full TypeScript with strict typing
- **Language Layer Separation** - All text output goes through localizable message IDs

## Example Stories

The repository includes several example stories:

| Story | Description |
|-------|-------------|
| `cloak-of-darkness` | Classic IF demo game - simple introduction |
| `secretletter2025` | Mystery adventure with NPCs |
| `reflections` | Atmospheric puzzle game |
| `dungeo` | Mainframe Zork implementation (~191 rooms, in progress) |

## Architecture

```
+-----------------------------------------------+
|              Your Story                       |
+-----------------------------------------------+
|   stdlib (actions) | lang-en-us (messages)    |
+-----------------------------------------------+
|   world-model | parser-en-us | engine         |
+-----------------------------------------------+
|              core (events)                    |
+-----------------------------------------------+
```

### Key Principles

1. **Actions emit semantic events, not text** - The language layer converts message IDs to prose
2. **Behaviors own mutations** - Actions coordinate, behaviors perform state changes
3. **Traits compose entity capabilities** - Add container, lockable, wearable, etc.
4. **Parser scope is permissive** - Actions decide if visibility is truly required

## Development

```bash
# Clone and setup
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee
pnpm install
pnpm build

# Run all tests
pnpm test

# Run specific package tests
pnpm --filter '@sharpee/stdlib' test

# Run story transcripts
node packages/transcript-tester/dist/cli.js stories/dungeo --all
```

## Standard Actions

The stdlib includes 43 actions across these categories:

**Movement**: going, entering, exiting
**Manipulation**: taking, dropping, putting, inserting, removing, giving, throwing
**Containers/Doors**: opening, closing, locking, unlocking
**Examination**: looking, examining, searching, reading
**Interaction**: talking, showing, attacking
**Devices**: switching on/off, pushing, pulling, raising, lowering
**Wearables**: wearing, taking off
**Consumables**: eating, drinking
**Senses**: touching, smelling, listening
**Meta**: inventory, score, help, save, restore, restart, quit, undo, wait, about, sleep

## Documentation

- [Core Concepts](docs/reference/core-concepts.md) - Entity system, traits, actions, events
- [Creating Stories](docs/guides/creating-stories.md) - Developer guide for new stories
- [Architecture Decisions](docs/architecture/adrs/) - Design rationale (ADRs)

## Creating a Story

See [Creating Stories](docs/guides/creating-stories.md) for a complete guide. Quick overview:

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, EntityType, TraitType } from '@sharpee/world-model';

export const config: StoryConfig = {
  id: "my-story",
  title: "My Story",
  author: "Your Name",
  version: "1.0.0"
};

export class MyStory implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    // Create rooms
    const room = world.createEntity('Starting Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM, isDark: false });

    // Create objects
    const lamp = world.createEntity('brass lamp', EntityType.OBJECT);
    lamp.add({ type: TraitType.PORTABLE });
    world.moveEntity(lamp.id, room.id);

    // Set player location
    const player = world.getPlayer();
    world.moveEntity(player.id, room.id);
  }
}
```

## License

MIT License - see [LICENSE](./LICENSE)

## Links

- [GitHub Repository](https://github.com/ChicagoDave/sharpee)
- [npm Package](https://www.npmjs.com/package/@sharpee/sharpee)
- [Issue Tracker](https://github.com/ChicagoDave/sharpee/issues)

---

Built for the interactive fiction community.
