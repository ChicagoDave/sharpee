# Sharpee Project Structure Guide

A guide for authors creating Interactive Fiction with Sharpee.

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
│   ├── guides/               # Author guides (you are here)
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
│   ├── grammar/              # Parser extensions
│   ├── messages/             # Language extensions
│   ├── orchestration/        # Engine registrations
│   ├── regions/              # Room definitions
│   ├── npcs/                 # NPC entities and behaviors
│   ├── actions/              # Story-specific actions
│   ├── handlers/             # Event handlers and puzzles
│   ├── scheduler/            # Daemons and fuses
│   ├── traits/               # Custom traits
│   └── scoring/              # Scoring system (if needed)
└── tests/
    └── transcripts/          # Integration test transcripts
```

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

  // Called first - create the world
  initializeWorld(world: WorldModel): void {
    this.world = world;
    // Create rooms, objects, connections
  }

  // Create the player character
  createPlayer(world: WorldModel): IFEntity {
    // Return player entity
  }

  // Add story-specific grammar patterns
  extendParser(parser: Parser): void {
    registerAllGrammar(parser);
  }

  // Add story-specific messages
  extendLanguage(language: LanguageProvider): void {
    registerAllMessages(language);
  }

  // Return story-specific actions
  getCustomActions(): Action[] {
    return customActions;
  }

  // Called when engine is ready - register handlers
  onEngineReady(engine: GameEngine): void {
    initializeOrchestration(engine, this.world, { ... });
  }

  // Called each turn (optional)
  initialize(): void { }

  // Check if story is complete
  isComplete(): boolean {
    return false;
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
├── object-grammar.ts     # Object manipulation
└── debug-grammar.ts      # Debug commands (optional)
```

**Example pattern registration:**

```typescript
// src/grammar/puzzle-grammar.ts
import type { StoryGrammar } from '@sharpee/parser-en-us';

export function registerPuzzleGrammar(grammar: StoryGrammar): void {
  grammar
    .define('push :panel panel')
    .mapsTo('mystory.action.push_panel')
    .withPriority(150)
    .build();

  grammar
    .define('turn dial to :number')
    .mapsTo('mystory.action.set_dial')
    .withPriority(150)
    .build();
}

// src/grammar/index.ts
import type { Parser } from '@sharpee/parser-en-us';
import { registerPuzzleGrammar } from './puzzle-grammar';
import { registerSpeechGrammar } from './speech-grammar';

export function registerAllGrammar(parser: Parser): void {
  const grammar = parser.getStoryGrammar();
  registerPuzzleGrammar(grammar);
  registerSpeechGrammar(grammar);
}
```

### `src/messages/` - Language Extensions

Organize messages by feature:

```
src/messages/
├── index.ts              # Exports registerAllMessages()
├── npc-messages.ts       # NPC dialogue and actions
├── puzzle-messages.ts    # Puzzle feedback
├── action-messages.ts    # Custom action messages
└── scheduler-messages.ts # Timed event messages
```

**Example message registration:**

```typescript
// src/messages/puzzle-messages.ts
import type { LanguageProvider } from '@sharpee/lang-en-us';

export const PuzzleMessages = {
  DIAL_SET: 'mystory.dial.set',
  DIAL_WRONG: 'mystory.dial.wrong',
  SAFE_OPENS: 'mystory.safe.opens',
} as const;

export function registerPuzzleMessages(language: LanguageProvider): void {
  language.addMessage(PuzzleMessages.DIAL_SET,
    'You turn the dial to {number}.');

  language.addMessage(PuzzleMessages.DIAL_WRONG,
    'Nothing happens. The combination must be wrong.');

  language.addMessage(PuzzleMessages.SAFE_OPENS,
    'Click! The safe door swings open, revealing its contents.');
}

// src/messages/index.ts
import type { LanguageProvider } from '@sharpee/lang-en-us';
import { registerPuzzleMessages } from './puzzle-messages';
import { registerNpcMessages } from './npc-messages';

export function registerAllMessages(language: LanguageProvider): void {
  registerPuzzleMessages(language);
  registerNpcMessages(language);
}
```

### `src/orchestration/` - Engine Registrations

Organize engine setup by subsystem:

```
src/orchestration/
├── index.ts                  # Exports initializeOrchestration()
├── command-transformers.ts   # Pre-parse command modification
├── scheduler-setup.ts        # Daemon and fuse registration
├── puzzle-handlers.ts        # Complex puzzle setup
├── npc-setup.ts              # NPC behavior registration
└── event-handlers.ts         # Event processor handlers
```

**Example orchestration:**

```typescript
// src/orchestration/index.ts
import type { GameEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';

import { registerCommandTransformers } from './command-transformers';
import { registerSchedulerEvents } from './scheduler-setup';
import { registerNpcs } from './npc-setup';
import { registerEventHandlers } from './event-handlers';

export interface OrchestrationConfig {
  roomIds: Record<string, string>;
  // ... other config
}

export function initializeOrchestration(
  engine: GameEngine,
  world: WorldModel,
  config: OrchestrationConfig
): void {
  registerCommandTransformers(engine, world, config);

  const scheduler = engine.getScheduler();
  if (scheduler) {
    registerSchedulerEvents(scheduler, world, config);
  }

  const npcService = engine.getNpcService();
  if (npcService) {
    registerNpcs(engine, npcService, world, config);
  }

  registerEventHandlers(engine, world, config);
}
```

### `src/regions/` - Room Definitions

Organize rooms by geographic area:

```
src/regions/
├── house/
│   ├── index.ts          # Exports, connections, region setup
│   ├── rooms/
│   │   ├── living-room.ts
│   │   ├── kitchen.ts
│   │   └── bedroom.ts
│   └── objects/
│       └── index.ts      # Objects in this region
├── forest/
│   ├── index.ts
│   ├── rooms/
│   └── objects/
└── underground/
    ├── index.ts
    ├── rooms/
    └── objects/
```

**Example room definition:**

```typescript
// src/regions/house/rooms/living-room.ts
import { WorldModel, IFEntity, RoomTrait, ContainerTrait } from '@sharpee/world-model';

export function createLivingRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('living-room', 'room');

  room.add(new RoomTrait({
    name: 'Living Room',
    description: 'A cozy living room with a fireplace.',
    exits: {
      north: null,  // Set during connection phase
      east: null,
    }
  }));

  return room;
}

// src/regions/house/index.ts
import { WorldModel, Direction } from '@sharpee/world-model';
import { createLivingRoom } from './rooms/living-room';
import { createKitchen } from './rooms/kitchen';
import { createHouseObjects } from './objects';

export interface HouseRoomIds {
  livingRoom: string;
  kitchen: string;
}

export function createHouseRegion(world: WorldModel): HouseRoomIds {
  const livingRoom = createLivingRoom(world);
  const kitchen = createKitchen(world);

  return {
    livingRoom: livingRoom.id,
    kitchen: kitchen.id,
  };
}

export function connectHouseRooms(world: WorldModel, ids: HouseRoomIds): void {
  world.connect(ids.livingRoom, Direction.NORTH, ids.kitchen);
}
```

### `src/npcs/` - Non-Player Characters

Each NPC gets its own folder:

```
src/npcs/
├── guard/
│   ├── index.ts              # Exports
│   ├── guard-entity.ts       # Entity creation
│   ├── guard-behavior.ts     # NpcBehavior implementation
│   └── guard-messages.ts     # Message IDs
└── merchant/
    ├── index.ts
    ├── merchant-entity.ts
    ├── merchant-behavior.ts
    └── merchant-messages.ts
```

**Example NPC:**

```typescript
// src/npcs/guard/guard-behavior.ts
import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import { GuardMessages } from './guard-messages';

export const guardBehavior: NpcBehavior = {
  id: 'mystory.guard',

  onTurn(context: NpcContext): NpcAction[] {
    // Called each turn when player is in same room
    if (context.playerVisible && !context.npcState.greeted) {
      context.npcState.greeted = true;
      return [{
        type: 'emote',
        messageId: GuardMessages.GREETS_PLAYER,
      }];
    }
    return [];
  },

  onPlayerEnters(context: NpcContext): NpcAction[] {
    return [{
      type: 'emote',
      messageId: GuardMessages.NOTICES_PLAYER,
    }];
  },
};
```

### `src/actions/` - Story-Specific Actions

Each action gets its own folder:

```
src/actions/
├── index.ts              # Exports customActions array
├── ring/
│   ├── ring-action.ts    # Action implementation
│   ├── ring-events.ts    # Event definitions
│   └── ring-messages.ts  # Message IDs
└── pray/
    ├── pray-action.ts
    └── pray-messages.ts
```

**Example action:**

```typescript
// src/actions/ring/ring-action.ts
import { Action, ActionContext } from '@sharpee/stdlib';
import { RingMessages } from './ring-messages';

export const RING_ACTION_ID = 'mystory.action.ring';

export const ringAction: Action = {
  id: RING_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext) {
    const target = context.getDirectObject();
    if (!target?.has('RingableTrait')) {
      return { valid: false, error: 'not_ringable' };
    }
    return { valid: true };
  },

  execute(context: ActionContext) {
    const target = context.getDirectObject();
    // Perform the action
    return { success: true };
  },

  report(context: ActionContext) {
    return [{
      type: 'message',
      messageId: RingMessages.RINGS,
      data: { item: context.getDirectObject()?.name }
    }];
  },

  blocked(context: ActionContext, error: string) {
    return [{
      type: 'message',
      messageId: RingMessages.CANT_RING,
    }];
  },
};
```

### `src/handlers/` - Event Handlers and Puzzles

```
src/handlers/
├── index.ts              # Exports all handlers
├── puzzle-handler.ts     # Specific puzzle logic
├── death-handler.ts      # Death/resurrection
└── scoring-handler.ts    # Score events
```

### `src/scheduler/` - Timed Events

```
src/scheduler/
├── index.ts              # Exports registerScheduledEvents()
├── lantern-daemon.ts     # Light source decay
├── flooding-fuse.ts      # Timed flooding
└── scheduler-messages.ts # Message IDs
```

## Best Practices

### 1. Message IDs

Use a consistent naming convention:
```typescript
export const MyMessages = {
  // Pattern: {story}.{feature}.{event}
  DOOR_OPENS: 'mystory.door.opens',
  DOOR_LOCKED: 'mystory.door.locked',
  GUARD_GREETS: 'mystory.guard.greets',
} as const;
```

### 2. Type Safety

Export and use region-specific ID types:
```typescript
// Export type from region
export interface HouseRoomIds {
  livingRoom: string;
  kitchen: string;
}

// Use in orchestration config
export interface OrchestrationConfig {
  houseIds: HouseRoomIds;
  forestIds: ForestRoomIds;
}
```

### 3. Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| `grammar/` | How commands are parsed |
| `messages/` | What text is shown |
| `actions/` | What mutations occur |
| `handlers/` | How events are processed |
| `orchestration/` | How systems are wired |

### 4. Testing

Write transcript tests for integration testing:
```
# tests/transcripts/door-puzzle.transcript
@title Door Puzzle Test
@story mystory

> examine door
[contains "locked"]

> unlock door with key
[contains "unlocked"]

> open door
[contains "opens"]

> north
[contains "Kitchen"]
```

Run tests:
```bash
node packages/transcript-tester/dist/cli.js stories/mystory --all
```

## Building Your Story

```bash
# Build platform + story
./scripts/build-dungeo.sh

# Build just your story (after platform is built)
./scripts/build-dungeo.sh --skip mystory

# Play interactively
node dist/sharpee.js --play

# Run tests
node dist/sharpee.js --test stories/mystory/tests/transcripts/puzzle.transcript
```

## Quick Start Checklist

1. [ ] Create `stories/mystory/` folder structure
2. [ ] Set up `package.json` and `tsconfig.json`
3. [ ] Create `src/index.ts` with Story implementation
4. [ ] Create at least one region with rooms
5. [ ] Set up `grammar/index.ts` (even if empty initially)
6. [ ] Set up `messages/index.ts` (even if empty initially)
7. [ ] Set up `orchestration/index.ts` (even if empty initially)
8. [ ] Write a basic transcript test
9. [ ] Build and test

## Further Reading

- **ADR-051**: Four-phase action pattern (validate/execute/report/blocked)
- **ADR-070**: NPC system architecture
- **ADR-071**: Daemons and fuses (timed events)
- **ADR-087**: Grammar patterns
- **ADR-090**: Capability dispatch for entity-specific behaviors
- **Core Concepts**: `docs/reference/core-concepts.md`
