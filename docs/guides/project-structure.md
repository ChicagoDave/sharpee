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
│   ├── stdlib/               # Standard actions (43 actions)
│   ├── parser-en-us/         # English parser and grammar
│   ├── lang-en-us/           # English language messages
│   ├── if-domain/            # Grammar builder interfaces
│   ├── if-services/          # Service interfaces
│   ├── event-processor/      # Event handling pipeline
│   ├── text-blocks/          # Text block types
│   ├── text-service/         # Output rendering
│   ├── plugins/              # Plugin system
│   ├── plugin-npc/           # NPC system plugin
│   ├── plugin-scheduler/     # Daemon/fuse plugin
│   ├── plugin-state-machine/ # State machine plugin
│   ├── transcript-tester/    # Test runner
│   ├── sharpee/              # Bundled distribution + CLI
│   └── zifmia/               # Desktop runner (React)
├── stories/                  # Story implementations
│   └── dungeo/               # Example: Mainframe Zork port
├── docs/                     # Documentation
│   ├── architecture/         # ADRs and diagrams
│   ├── guides/               # Author guides (you are here)
│   ├── reference/            # Core concepts
│   └── work/                 # Work-in-progress tracking
├── dist/                     # Build outputs
│   ├── cli/sharpee.js        # Platform bundle
│   ├── web/{story}/          # Browser builds
│   ├── runner/               # Zifmia runner
│   └── stories/              # Story bundles (.sharpee)
└── build.sh                  # Build script
```

## Story Structure

Each story lives in `stories/{story-name}/`:

```
stories/{story}/
├── package.json              # Story package config
├── tsconfig.json             # TypeScript config
├── src/
│   ├── index.ts              # Story class and entry point
│   ├── browser-entry.ts      # Browser client entry (optional)
│   ├── regions/              # Room definitions (one file per region)
│   │   ├── white-house.ts
│   │   ├── forest.ts
│   │   └── underground.ts
│   ├── npcs/                 # NPC entities and behaviors
│   │   └── troll/
│   │       ├── entity.ts
│   │       ├── behavior.ts
│   │       └── messages.ts
│   ├── actions/              # Story-specific actions
│   │   └── pray/
│   │       └── pray-action.ts
│   ├── traits/               # Custom traits
│   ├── handlers/             # Event handlers
│   └── version.ts            # Auto-generated version info
├── tests/
│   └── transcripts/          # Integration test transcripts
└── walkthroughs/             # Walkthrough transcripts
```

**Key principle:** Flat file organization. Regions are single files containing all rooms and objects for that area.

## Story Entry Point (`src/index.ts`)

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import type { Parser } from '@sharpee/parser-en-us';

export const config: StoryConfig = {
  id: 'my-story',
  title: 'My Story',
  author: 'Your Name',
  version: '1.0.0',
};

export class MyStory implements Story {
  config = config;

  // Create the world - rooms, objects, connections
  initializeWorld(world: WorldModel): void {
    // Create regions
    const houseIds = createHouseRegion(world);
    const forestIds = createForestRegion(world);

    // Connect regions
    world.connectRooms(houseIds.backyard, forestIds.clearing, Direction.WEST);

    // Place player
    const player = world.getPlayer();
    world.moveEntity(player.id, houseIds.livingRoom);
  }

  // Create the player character
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: 100 }));
    return player;
  }

  // Add story-specific grammar patterns
  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();

    grammar
      .define('pray')
      .mapsTo('mystory.action.pray')
      .withPriority(150)
      .build();
  }

  // Return story-specific actions
  getCustomActions(): Action[] {
    return [prayAction];
  }
}

export const story = new MyStory();
export default story;
```

## Region Files (`src/regions/*.ts`)

Each region contains all rooms and objects for that area:

```typescript
// src/regions/house.ts
import {
  WorldModel, IFEntity, EntityType, Direction,
  IdentityTrait, RoomTrait, ContainerTrait, OpenableTrait,
} from '@sharpee/world-model';

// === Type Exports ===

export interface HouseRoomIds {
  livingRoom: string;
  kitchen: string;
  attic: string;
}

// === Region Creation ===

export function createHouseRegion(world: WorldModel): HouseRoomIds {
  // Create rooms
  const livingRoom = world.createEntity('living-room', EntityType.ROOM);
  livingRoom.add(new IdentityTrait({
    name: 'Living Room',
    description: 'A comfortable living room.',
  }));
  livingRoom.add(new RoomTrait());

  const kitchen = world.createEntity('kitchen', EntityType.ROOM);
  kitchen.add(new IdentityTrait({
    name: 'Kitchen',
    description: 'A well-appointed kitchen.',
  }));
  kitchen.add(new RoomTrait());

  const attic = world.createEntity('attic', EntityType.ROOM);
  attic.add(new IdentityTrait({
    name: 'Attic',
    description: 'A dusty attic.',
  }));
  attic.add(new RoomTrait({ isDark: true })); // Dark room

  // Connect rooms within region
  world.connectRooms(livingRoom.id, kitchen.id, Direction.NORTH);
  world.connectRooms(kitchen.id, attic.id, Direction.UP);

  // Create objects
  createHouseObjects(world, {
    livingRoom: livingRoom.id,
    kitchen: kitchen.id,
    attic: attic.id,
  });

  return {
    livingRoom: livingRoom.id,
    kitchen: kitchen.id,
    attic: attic.id,
  };
}

function createHouseObjects(world: WorldModel, ids: HouseRoomIds): void {
  // Trophy case in living room
  const trophyCase = world.createEntity('trophy-case', EntityType.OBJECT);
  trophyCase.add(new IdentityTrait({
    name: 'trophy case',
    description: 'A glass-fronted trophy case.',
  }));
  trophyCase.add(new ContainerTrait({ capacity: 100 }));
  trophyCase.add(new OpenableTrait({ isOpen: false }));
  trophyCase.add(new SceneryTrait()); // Can't be taken
  world.moveEntity(trophyCase.id, ids.livingRoom);
}
```

**Pattern:**
1. Export `XxxRoomIds` interface for type-safe room references
2. `createXxxRegion()` creates all rooms and returns ID map
3. Internal function creates and places objects
4. Use `world.connectRooms()` for bidirectional connections

## NPC Files (`src/npcs/{name}/`)

Each NPC gets its own folder:

```
src/npcs/troll/
├── index.ts              # Exports
├── troll-entity.ts       # Entity creation
├── troll-behavior.ts     # NpcBehavior implementation
└── troll-messages.ts     # Message IDs
```

```typescript
// troll-behavior.ts
import { NpcBehavior, NpcContext } from '@sharpee/plugin-npc';

export const trollBehavior: NpcBehavior = {
  id: 'dungeo.npc.troll',

  onTurn(context: NpcContext) {
    if (context.playerVisible) {
      // React to player presence
    }
    return [];
  },

  onPlayerEnters(context: NpcContext) {
    return [{
      type: 'emote',
      messageId: 'dungeo.troll.growls',
    }];
  },
};
```

## Action Files (`src/actions/{verb}/`)

```
src/actions/pray/
├── pray-action.ts    # Action implementation
└── pray-messages.ts  # Message IDs
```

Actions follow the four-phase pattern:
- `validate()` - Check if action can proceed
- `execute()` - Perform state changes
- `report()` - Return events for successful execution
- `blocked()` - Return events when validation fails

## Building and Testing

```bash
# Build platform + story
./build.sh -s dungeo

# Build with browser client
./build.sh -s dungeo -c browser

# Interactive play
node dist/cli/sharpee.js --play

# Run transcript tests
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript

# Run walkthrough chain
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

## Quick Start Checklist

1. [ ] Create `stories/mystory/` folder
2. [ ] Set up `package.json` with dependencies
3. [ ] Set up `tsconfig.json`
4. [ ] Create `src/index.ts` with Story implementation
5. [ ] Create at least one region with rooms
6. [ ] Add `extendParser()` for any custom verbs
7. [ ] Write a basic transcript test
8. [ ] Build and test: `./build.sh -s mystory && node dist/cli/sharpee.js --play`

## Further Reading

- **[Core Concepts](../reference/core-concepts.md)** - Entities, traits, actions, events
- **[Creating Stories](./creating-stories.md)** - Detailed story authoring guide
- **[Event Handlers](./event-handlers.md)** - Custom logic and puzzles
- **[Build System](./build-system.md)** - Build options and workflows
- **ADR-051** - Four-phase action pattern
- **ADR-070** - NPC system architecture
- **ADR-087** - Grammar patterns
- **ADR-090** - Capability dispatch
