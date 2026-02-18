# Sharpee Interactive Fiction Platform

[![npm](https://img.shields.io/npm/v/@sharpee/sharpee/latest?label=npm&color=orange)](https://www.npmjs.com/package/@sharpee/sharpee)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

**Version 0.9.91** — A modern, TypeScript-based platform for creating parser-based interactive fiction.

**Status**: Available for author/story development. The included Dungeon story (Mainframe Zork port) was completed on February 18, 2026.

**Website**: [sharpee.net](https://sharpee.net)

## Quick Start

No installation required — use `npx` to scaffold and build:

```bash
# Create a new story project
npx @sharpee/sharpee init my-adventure
cd my-adventure
npm install

# Build your story
npx @sharpee/sharpee build
```

This produces:

- **`dist/my-adventure.sharpee`** — Story bundle for the [Zifmia](https://sharpee.net/downloads/) desktop runner
- **`dist/web/`** — Browser client (open `index.html` directly)

### npx Commands

All CLI commands work via `npx @sharpee/sharpee <command>`:

| Command | Description |
|---------|-------------|
| `npx @sharpee/sharpee init <name>` | Create a new story project |
| `npx @sharpee/sharpee init-browser` | Add browser client to existing project |
| `npx @sharpee/sharpee build` | Build `.sharpee` bundle + browser client |
| `npx @sharpee/sharpee build-browser` | Build browser client only |
| `npx @sharpee/sharpee ifid` | Generate or validate an IFID |

## What's Included

`@sharpee/sharpee` is the umbrella package. One install gives you:

| Package | Description |
|---------|-------------|
| `@sharpee/engine` | Game runtime, turn cycle, command processor |
| `@sharpee/world-model` | Entity system with traits and behaviors |
| `@sharpee/stdlib` | 43 standard IF actions |
| `@sharpee/parser-en-us` | English natural language parser |
| `@sharpee/lang-en-us` | English language messages |
| `@sharpee/core` | Event system, types, utilities |
| `@sharpee/plugins` | Plugin system (NPC, scheduler, state machine) |
| `@sharpee/text-service` | Text formatting and status line |
| `@sharpee/platform-browser` | Browser client infrastructure |

## Features

- **Event-Driven Architecture** — Immutable semantic events for all state changes
- **Natural Language Parser** — Complex player commands with slot constraints
- **Rich World Model** — Entities with traits, behaviors, and relationships
- **43 Standard Actions** — take, drop, open, close, lock, unlock, wear, eat, drink, attack, and more
- **Four-Phase Action Pattern** — Consistent validate/execute/report/blocked flow
- **Capability Dispatch** — Entity-specific handling for generic verbs
- **NPC System** — Autonomous characters with behaviors and schedules
- **Daemons & Fuses** — Timed events and background processes
- **Perception System** — Darkness, blindness, and sensory restrictions
- **Language Layer Separation** — All text output goes through localizable message IDs
- **Full TypeScript** — Strict typing throughout

## Convenience Helpers

WorldModel provides helper methods to simplify common story setup tasks:

### connectRooms

Create bidirectional connections between rooms:

```typescript
// Connect kitchen to dining room (north/south)
world.connectRooms(kitchen.id, diningRoom.id, Direction.NORTH);
// Player can now GO NORTH from kitchen, GO SOUTH from dining room
```

### createDoor

Create a door entity with full exit wiring:

```typescript
const frontDoor = world.createDoor('front door', {
  room1Id: foyer.id,
  room2Id: porch.id,
  direction: Direction.SOUTH,
  description: 'A sturdy oak door.',
  isOpen: false,
  isLocked: true,
  keyId: brassKey.id,  // optional
});
```

The door is automatically:
- Placed in room1 for scope resolution
- Wired into both rooms' exits
- Given OpenableTrait and optionally LockableTrait
- Marked as scenery (not takeable)

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

1. **Actions emit semantic events, not text** — The language layer converts message IDs to prose
2. **Behaviors own mutations** — Actions coordinate, behaviors perform state changes
3. **Traits compose entity capabilities** — Add container, lockable, wearable, etc.
4. **Parser scope is permissive** — Actions decide if visibility is truly required

## Creating a Story

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel, IFEntity, EntityType,
  IdentityTrait, RoomTrait, ActorTrait, ContainerTrait,
  Direction,
} from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'my-adventure',
  title: 'My Adventure',
  author: 'Your Name',
  version: '1.0.0',
};

export class MyStory implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    const room = world.createEntity('start', EntityType.ROOM);
    room.add(new IdentityTrait({
      name: 'Starting Room',
      description: 'A simple room.',
    }));
    room.add(new RoomTrait());

    const lamp = world.createEntity('lamp', EntityType.OBJECT);
    lamp.add(new IdentityTrait({ name: 'brass lamp' }));
    world.moveEntity(lamp.id, room.id);

    const player = world.getPlayer();
    world.moveEntity(player.id, room.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: 100 }));
    return player;
  }
}

export const story = new MyStory();
export default story;
```

See the [Getting Started](https://sharpee.net/docs/getting-started/installation/) guide for a complete walkthrough.

## Zifmia Desktop Runner

[Zifmia](https://sharpee.net/downloads/) is the Tauri-based desktop app for playing `.sharpee` story bundles. Features include save/restore with modal dialogs, font preferences, auto-save/restore, theme support, and story illustrations.

## Standard Actions

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

## Repository Development

```bash
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee
pnpm install

# Build everything
./build.sh -s dungeo

# Run tests
pnpm test

# Run specific package tests
pnpm --filter '@sharpee/stdlib' test

# Run story transcript tests
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript
```

## Example Stories

| Story | Status | Description |
|-------|--------|-------------|
| `dungeo` | Complete | Mainframe Zork implementation (~191 rooms, 750 points) |
| `cloak-of-darkness` | Complete | Classic IF demo game |

## License

MIT License — Copyright 2025-2026 David Cornelson

## Links

- [Website](https://sharpee.net)
- [npm Package](https://www.npmjs.com/package/@sharpee/sharpee)
- [Documentation](https://sharpee.net/docs/)
- [Downloads (Zifmia)](https://sharpee.net/downloads/)
- [Issue Tracker](https://github.com/ChicagoDave/sharpee/issues)
