---
title: "Project Structure"
description: "Guide to Sharpee's repository layout and story organization"
section: "developer-guide"
order: 1
---

# Sharpee Project Structure Guide

A guide for developers working with the Sharpee platform.

## Overview

Sharpee is organized as a monorepo with platform packages and story implementations. Stories are self-contained projects that use the platform to create interactive fiction games.

## Repository Layout

```
sharpee/
├── packages/                 # Platform packages
│   ├── core/                 # Core types and events
│   ├── engine/               # Game engine runtime
│   ├── world-model/          # Entity system, traits, behaviors
│   ├── stdlib/               # Standard actions and patterns
│   ├── parser-en-us/         # English parser and grammar
│   ├── lang-en-us/           # English language messages
│   ├── event-processor/      # Event handling pipeline
│   ├── text-service/         # Output rendering
│   └── sharpee/              # Bundled distribution
├── stories/                  # Story implementations
│   └── dungeo/               # Example: Mainframe Zork port
├── docs/                     # Documentation
│   ├── architecture/         # ADRs and design docs
│   ├── guides/               # Author guides
│   ├── reference/            # API reference
│   └── work/                 # Work-in-progress tracking
└── scripts/                  # Build and utility scripts
```

## Story Structure

Each story lives in `stories/{story-name}/` and follows a canonical structure:

```
stories/{story}/
├── package.json              # Story package config
├── tsconfig.json             # TypeScript config
├── src/
│   ├── index.ts              # Story class and entry point
│   ├── grammar/              # Parser extensions (one file per feature)
│   ├── messages/             # Language extensions (one file per feature)
│   ├── orchestration/        # Engine registrations (one file per subsystem)
│   ├── regions/              # Room definitions (one file per region)
│   ├── npcs/                 # NPC entities and behaviors (one folder per NPC)
│   ├── actions/              # Story-specific actions (one folder per action)
│   ├── handlers/             # Event handlers and puzzles
│   ├── scheduler/            # Daemons and fuses
│   ├── traits/               # Custom traits
│   └── scoring/              # Scoring system (if needed)
└── tests/
    └── transcripts/          # Integration test transcripts
```

**Key principle:** Flat file organization within each folder. Regions are single files, not nested directories.

## Core Files

### `src/index.ts` - Story Entry Point

The main story file implements the `Story` interface:

```typescript
import { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';

import { registerAllGrammar } from './grammar';
import { registerAllMessages } from './messages';
import { initializeOrchestration } from './orchestration';

export const config: StoryConfig = {
  id: "my-story",
  title: "My Story Title",
  author: "Your Name",
  version: "1.0.0",
  description: "A brief description of your story"
};

export class MyStory implements Story {
  config = config;
  private world!: WorldModel;

  initializeWorld(world: WorldModel): void {
    this.world = world;
    // Create rooms, objects, connections
  }

  extendParser(parser: Parser): void {
    registerAllGrammar(parser);
  }

  extendLanguage(language: LanguageProvider): void {
    registerAllMessages(language);
  }

  getCustomActions(): Action[] {
    return customActions;
  }

  onEngineReady(engine: GameEngine): void {
    initializeOrchestration(engine, this.world, { ... });
  }
}

export const story = new MyStory();
export default story;
```

### `src/grammar/` - Parser Extensions

Organize grammar patterns by feature:

```
src/grammar/
├── index.ts              # Exports registerAllGrammar()
├── puzzle-grammar.ts     # Puzzle-specific commands
├── speech-grammar.ts     # SAY, TALK TO patterns
└── debug-grammar.ts      # Debug commands (optional)
```

### `src/messages/` - Language Extensions

Organize messages by feature:

```
src/messages/
├── index.ts              # Exports registerAllMessages()
├── npc-messages.ts       # NPC dialogue and actions
├── puzzle-messages.ts    # Puzzle feedback
└── action-messages.ts    # Custom action messages
```

### `src/regions/` - Room Definitions

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
1. **Type export** - `XxxRoomIds` interface for type-safe room references
2. **`createXxxRegion()`** - Creates all rooms, returns ID map
3. **`createXxxObjects()`** - Creates and places objects in rooms
4. **`connectXxxTo...()`** - Cross-region connections

### `src/npcs/` - Non-Player Characters

Each NPC gets its own folder:

```
src/npcs/
├── guard/
│   ├── index.ts
│   ├── guard-entity.ts
│   ├── guard-behavior.ts
│   └── guard-messages.ts
└── merchant/
    └── ...
```

### `src/actions/` - Story-Specific Actions

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
