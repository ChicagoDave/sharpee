---
title: "Creating Stories"
description: "A comprehensive guide to creating interactive fiction stories with Sharpee"
---

## Quick Start

A minimal Sharpee story needs:
1. A `package.json` with `@sharpee/sharpee` as a dependency
2. A story class implementing the `Story` interface
3. At least one room and a player

```typescript
// src/index.ts
import {
  Story, StoryConfig, GameEngine,
  WorldModel, IFEntity, Parser, LanguageProvider
} from '@sharpee/sharpee';
import { EntityType, RoomTrait, IdentityTrait, ActorTrait } from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'my-story',
  title: 'My Story',
  author: 'Your Name',
  version: '1.0.0',
  description: 'A short description',
};

export class MyStory implements Story {
  config = config;

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new IdentityTrait({ name: 'yourself', description: 'As good-looking as ever.' }));
    return player;
  }

  initializeWorld(world: WorldModel): void {
    const room = world.createEntity('living-room', EntityType.ROOM);
    room.add(new RoomTrait({ exits: {}, isDark: false }));
    room.add(new IdentityTrait({
      name: 'Living Room',
      description: 'A cozy living room with worn furniture.',
      properName: true,
      article: 'the',
    }));

    const player = world.getPlayer();
    world.moveEntity(player.id, room.id);
  }
}

export const story = new MyStory();
export default story;
```

## Project Structure

### Small Story (Single File)

```
my-story/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts         # Everything in one file
└── tests/
    └── transcripts/     # Test transcripts
```

### Medium Story (Multiple Regions)

```
my-story/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Story class and entry point
│   ├── regions/
│   │   ├── village.ts        # All rooms + objects for the village
│   │   ├── forest.ts         # All rooms + objects for the forest
│   │   └── dungeon.ts        # Underground area
│   └── npcs/
│       └── merchant.ts       # NPC entity + behavior
└── tests/
    └── transcripts/
```

### Large Story (Full Structure)

```
my-story/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Story class and entry point
│   ├── regions/              # One file per region (rooms + objects + connections)
│   │   ├── village.ts
│   │   ├── forest.ts
│   │   └── dungeon.ts
│   ├── npcs/                 # One folder per NPC
│   │   ├── guard/
│   │   │   ├── guard-entity.ts
│   │   │   ├── guard-behavior.ts
│   │   │   └── guard-messages.ts
│   │   └── merchant/
│   ├── actions/              # Story-specific actions
│   │   └── pray/
│   │       ├── pray-action.ts
│   │       └── pray-messages.ts
│   ├── grammar/              # Parser extensions
│   │   └── index.ts
│   ├── messages/             # Language extensions
│   │   └── index.ts
│   ├── handlers/             # Event handlers and puzzles
│   │   └── index.ts
│   └── traits/               # Story-specific traits
│       └── magical-trait.ts
└── tests/
    └── transcripts/
```

**Key principle:** Regions are single files, not nested directories. A region contains all rooms, objects, and internal connections for that area.

## The Story Interface

```typescript
interface Story {
  config: StoryConfig;

  // Required
  initializeWorld(world: WorldModel): void;
  createPlayer(world: WorldModel): IFEntity;

  // Optional
  extendParser?(parser: Parser): void;
  extendLanguage?(language: LanguageProvider): void;
  getCustomActions?(): any[];
  onEngineReady?(engine: GameEngine): void;
}
```

### `createPlayer(world)`

Creates the player entity. Called before `initializeWorld`:

```typescript
createPlayer(world: WorldModel): IFEntity {
  const player = world.createEntity('player', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new IdentityTrait({
    name: 'yourself',
    description: 'As good-looking as ever.',
  }));
  return player;
}
```

### `initializeWorld(world)`

Called once when the game starts. Create all rooms, objects, and NPCs here. Returns `void` — player placement is done with `world.moveEntity()`.

### `extendParser(parser)`

Optional. Add story-specific grammar patterns:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  grammar
    .define('pray')
    .mapsTo('mystory.action.pray')
    .withPriority(150)
    .build();

  grammar
    .define('worship :target')
    .where('target', scope => scope.visible())
    .mapsTo('mystory.action.worship')
    .withPriority(150)
    .build();
}
```

### `extendLanguage(language)`

Optional. Provide story-specific messages:

```typescript
extendLanguage(language: LanguageProvider): void {
  language.addMessages({
    'mystory.pray.success': 'You feel a sense of peace.',
    'mystory.pray.no_effect': 'Nothing happens.',
  });
}
```

### `onEngineReady(engine)`

Optional. Called after the engine is fully initialized. Use for registering plugins, NPC behaviors, daemons, and fuses:

```typescript
onEngineReady(engine: GameEngine): void {
  const npcService = engine.getNpcService();
  npcService.registerBehavior(guardBehavior);

  const scheduler = engine.getScheduler();
  scheduler.addDaemon('lantern-timer', lanternDaemon);
}
```

## Region Pattern

Each region file creates all rooms and objects for that area and returns references for cross-region connections:

```typescript
// src/regions/forest.ts
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { EntityType, RoomTrait, IdentityTrait, Direction } from '@sharpee/world-model';

export interface ForestRooms {
  clearing: IFEntity;
  path: IFEntity;
  grove: IFEntity;
}

export function createForest(world: WorldModel): ForestRooms {
  const clearing = world.createEntity('clearing', EntityType.ROOM);
  clearing.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  clearing.add(new IdentityTrait({
    name: 'Forest Clearing',
    description: 'Sunlight filters through the canopy above.',
    properName: true,
    article: 'the',
  }));

  const path = world.createEntity('forest-path', EntityType.ROOM);
  path.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  path.add(new IdentityTrait({
    name: 'Forest Path',
    description: 'A winding path through dense trees.',
    properName: true,
    article: 'the',
  }));

  // Internal connections
  clearing.get(RoomTrait)!.exits[Direction.EAST] = { destination: path.id };
  path.get(RoomTrait)!.exits[Direction.WEST] = { destination: clearing.id };

  // Objects
  const mushroom = world.createEntity('mushroom', EntityType.ITEM);
  mushroom.add(new IdentityTrait({
    name: 'red mushroom',
    description: 'A bright red mushroom with white spots.',
  }));
  world.moveEntity(mushroom.id, clearing.id);

  return { clearing, path, grove };
}
```

Wire regions together in `initializeWorld`:

```typescript
initializeWorld(world: WorldModel): void {
  const forest = createForest(world);
  const castle = createCastle(world);

  // Cross-region connection
  forest.path.get(RoomTrait)!.exits[Direction.NORTH] = { destination: castle.gate.id };
  castle.gate.get(RoomTrait)!.exits[Direction.SOUTH] = { destination: forest.path.id };

  const player = world.getPlayer();
  world.moveEntity(player.id, forest.clearing.id);
}
```

## Testing with Transcripts

Create `.transcript` files to test your story:

```
# tests/transcripts/basic.transcript
# Test basic navigation

> look
* Living Room
* cozy

> take lamp
* Taken

> inventory
* brass lamp

> north
* Forest Path
```

### Transcript Syntax

- `> command` — Player input
- `* pattern` — Output must contain pattern
- `! pattern` — Output must NOT contain pattern
- `# comment` — Ignored

### Running Transcripts

```bash
# Run a transcript test
npx sharpee --test tests/transcripts/basic.transcript

# Interactive play
npx sharpee --play
```

## Troubleshooting

### "Entity not found"
- Check that you're using the entity's `id` property, not a string literal
- Ensure the entity was created before referencing it

### "Action not recognized"
- Verify grammar pattern is registered in `extendParser`
- Check action is returned from `getCustomActions()`

### "Can't take that"
- Object may have `SceneryTrait` (non-portable by design)
- A trait behavior may be blocking the take action

### "It's too dark"
- Room has `isDark: true` in its `RoomTrait`
- Player needs a light source with `isOn: true`
