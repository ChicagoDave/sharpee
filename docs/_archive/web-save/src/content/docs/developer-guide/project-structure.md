---
title: "Project Structure"
description: "Guide to Sharpee's repository layout and story organization"
---

# Sharpee Project Structure Guide

A guide for developers working with the Sharpee platform.

## Overview

Sharpee is organized as a monorepo with platform packages and story implementations. Stories are self-contained projects that use the platform to create interactive fiction games.

## Repository Layout

```
sharpee/
├── packages/                     # Platform packages
│   ├── core/                     # Core types and events
│   ├── engine/                   # Game engine runtime
│   ├── world-model/              # Entity system, traits, behaviors
│   ├── stdlib/                   # Standard actions and patterns
│   ├── parser-en-us/             # English parser and grammar
│   ├── lang-en-us/               # English language messages
│   ├── event-processor/          # Event handling pipeline
│   ├── text-service/             # Output rendering
│   ├── text-blocks/              # Text block processing
│   ├── if-domain/                # IF domain types
│   ├── if-services/              # IF service interfaces
│   ├── plugin-npc/               # NPC turn plugin
│   ├── plugin-scheduler/         # Daemon/fuse scheduler plugin
│   ├── plugin-state-machine/     # State machine plugin
│   ├── plugins/                  # Plugin registry and interfaces
│   ├── platform-browser/         # Browser platform adapter
│   ├── extensions/
│   │   └── testing/              # Test utilities
│   ├── transcript-tester/        # Transcript test runner
│   └── sharpee/                  # Umbrella package (CLI + re-exports)
├── stories/                      # Story implementations
│   └── dungeo/                   # Mainframe Zork port (~191 rooms)
├── website/                      # Documentation site (Astro/Starlight)
├── docs/                         # Internal documentation
│   ├── architecture/adrs/        # Architecture Decision Records
│   ├── reference/                # API reference
│   └── work/                     # Work-in-progress tracking
├── build.sh                      # Main build script
└── scripts/                      # Utility scripts
```

## Story Structure

Each story lives in `stories/{story-name}/` and follows a canonical structure:

```
stories/{story}/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Story class and entry point
│   ├── regions/              # Room definitions (one file per region)
│   ├── npcs/                 # NPC entities and behaviors (one folder per NPC)
│   ├── actions/              # Story-specific actions (one folder per action)
│   ├── handlers/             # Event handlers and puzzles
│   ├── grammar/              # Parser extensions
│   ├── messages/             # Language extensions
│   ├── orchestration/        # Engine registrations
│   ├── scheduler/            # Daemons and fuses
│   ├── traits/               # Custom traits
│   └── scoring/              # Scoring system (if needed)
└── tests/
    └── transcripts/          # Integration test transcripts
```

**Key principle:** Flat file organization within each folder. Regions are single files containing all rooms and objects for that area, not nested directories.

## Core Files

### `src/index.ts` — Story Entry Point

The main story file implements the `Story` interface:

```typescript
import { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import { WorldModel, IFEntity, EntityType, IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';

export const config: StoryConfig = {
  id: 'my-story',
  title: 'My Story Title',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A brief description of your story',
};

export class MyStory implements Story {
  config = config;
  private world!: WorldModel;

  // Required: set up all rooms, objects, connections
  initializeWorld(world: WorldModel): void {
    this.world = world;
    // Create regions, objects, event handlers...
  }

  // Required: create the player entity
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me'],
      description: 'As good-looking as ever.',
      properName: false,
    }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: 100 }));
    return player;
  }

  // Optional: extend parser with story-specific grammar
  extendParser?(parser: Parser): void {
    // Add custom commands...
  }

  // Optional: add story-specific messages
  extendLanguage?(language: LanguageProvider): void {
    // Add custom messages...
  }

  // Optional: provide story-specific actions
  getCustomActions?(): any[] {
    return [];
  }

  // Optional: post-engine initialization (register NPCs, daemons, etc.)
  onEngineReady?(engine: GameEngine): void {
    // Access plugin registry, register NPC behaviors, etc.
  }
}

export const story = new MyStory();
export default story;
```

### `src/regions/` — Room Definitions

Each region is a **single file** containing all rooms and objects for that area:

```
src/regions/
├── white-house.ts        # Starting area
├── house-interior.ts     # Inside the house
├── forest.ts             # Forest paths and clearings
├── underground.ts        # Cellar, passages, troll room
└── temple.ts             # Temple area
```

**Pattern:**
1. **Type export** — `XxxRoomIds` interface for type-safe room references
2. **`createXxxRegion()`** — Creates all rooms, returns ID map
3. **`createXxxObjects()`** — Creates and places objects in rooms
4. **`connectXxxTo...()`** — Cross-region connections

### `src/npcs/` — Non-Player Characters

Each NPC gets its own folder:

```
src/npcs/
├── guard/
│   ├── index.ts            # Registration function
│   ├── guard-entity.ts     # Entity creation
│   ├── guard-behavior.ts   # Turn logic
│   └── guard-messages.ts   # Message IDs
└── merchant/
    └── ...
```

### `src/actions/` — Story-Specific Actions

Each action gets its own folder:

```
src/actions/
├── index.ts              # Exports customActions array
├── ring/
│   ├── ring-action.ts
│   └── ring-messages.ts
└── pray/
    └── ...
```

### `src/grammar/` — Parser Extensions

Organize grammar patterns by feature:

```
src/grammar/
├── index.ts              # Exports registerAllGrammar()
├── puzzle-grammar.ts     # Puzzle-specific commands
└── speech-grammar.ts     # SAY, TALK TO patterns
```

### `src/messages/` — Language Extensions

Organize messages by feature:

```
src/messages/
├── index.ts              # Exports registerAllMessages()
├── npc-messages.ts       # NPC dialogue and actions
└── puzzle-messages.ts    # Puzzle feedback
```

## Best Practices

### Message ID Naming

Use a consistent convention:

```typescript
export const MyMessages = {
  // Pattern: {story}.{feature}.{event}
  DOOR_OPENS: 'mystory.door.opens',
  DOOR_LOCKED: 'mystory.door.locked',
  GUARD_GREETS: 'mystory.guard.greets',
} as const;
```

### Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| `grammar/` | How commands are parsed |
| `messages/` | What text is shown |
| `actions/` | What mutations occur |
| `handlers/` | How events are processed |
| `orchestration/` | How systems are wired |

### Testing

Write transcript tests for integration testing:

```
# tests/transcripts/door-puzzle.transcript
> examine door
* locked

> unlock door with key
* unlocked

> open door
* opens
```

Run tests:

```bash
node dist/sharpee.js --test stories/mystory/tests/transcripts/puzzle.transcript
```
