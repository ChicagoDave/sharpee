---
title: "Creating Stories"
description: "A comprehensive guide to creating interactive fiction stories with Sharpee"
section: "author-guide"
order: 1
---

# Creating Stories with Sharpee

This guide is designed for developers creating new interactive fiction stories with Sharpee.

## Quick Start

A minimal Sharpee story needs:
1. A `package.json` with dependencies
2. A story class implementing `Story` interface
3. At least one room and a player location

```typescript
// stories/my-story/src/index.ts
import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, AuthorModel, EntityType, TraitType } from '@sharpee/world-model';

export const config: StoryConfig = {
  id: "my-story",
  title: "My Story",
  author: "Your Name",
  version: "1.0.0",
  description: "A short description"
};

export class MyStory implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    // Create starting room
    const room = world.createEntity('Living Room', EntityType.ROOM);
    room.add({
      type: TraitType.ROOM,
      isDark: false,
      description: 'A cozy living room with worn furniture.'
    });

    // Place player
    const player = world.getPlayer();
    world.moveEntity(player.id, room.id);
  }
}

export default MyStory;
```

## Project Structure

### Simple Story (Single File)

```
stories/my-story/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts         # Everything in one file
├── tests/
│   └── transcripts/     # Test transcripts
└── README.md
```

### Complex Story (Multi-Region)

```
stories/my-story/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Main story class
│   ├── regions/
│   │   ├── forest/
│   │   │   ├── index.ts         # Region setup & connections
│   │   │   ├── rooms/
│   │   │   │   ├── clearing.ts
│   │   │   │   └── dense-woods.ts
│   │   │   └── objects/
│   │   │       └── index.ts
│   │   └── village/
│   │       ├── index.ts
│   │       ├── rooms/
│   │       └── objects/
│   ├── npcs/
│   │   └── merchant/
│   │       ├── entity.ts
│   │       ├── behavior.ts
│   │       └── messages.ts
│   ├── actions/                  # Story-specific actions
│   │   └── pray/
│   │       ├── pray-action.ts
│   │       └── pray-messages.ts
│   ├── traits/                   # Story-specific traits
│   │   └── magical-trait.ts
│   └── handlers/                 # Event handlers
│       └── index.ts
├── tests/
│   └── transcripts/
└── README.md
```

## Story Interface

The `Story` interface requires:

```typescript
interface Story {
  config: StoryConfig;
  initializeWorld(world: WorldModel): void;
  extendParser?(parser: Parser): void;      // Optional
  getLanguageExtensions?(): object;          // Optional
}
```

### initializeWorld(world: WorldModel)

Called once when the game starts. Create all rooms, objects, NPCs here.

### extendParser(parser: Parser)

Optional. Add story-specific grammar patterns:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  // Add new verb
  grammar
    .define('pray')
    .mapsTo('mystory.action.pray')
    .withPriority(150)
    .build();

  // Add verb with target
  grammar
    .define('worship :target')
    .where('target', scope => scope.visible())
    .mapsTo('mystory.action.worship')
    .withPriority(150)
    .build();
}
```

### getLanguageExtensions()

Optional. Provide story-specific messages:

```typescript
getLanguageExtensions(): object {
  return {
    'mystory.pray.success': 'You feel a sense of peace.',
    'mystory.pray.no_effect': 'Nothing happens.'
  };
}
```

## Creating Rooms

### Basic Room

```typescript
const room = world.createEntity('Forest Clearing', EntityType.ROOM);
room.add({
  type: TraitType.ROOM,
  isDark: false,
  description: 'Sunlight filters through the canopy above.'
});
```

### Room with Exits

```typescript
// Create rooms first
const clearing = world.createEntity('Clearing', EntityType.ROOM);
const path = world.createEntity('Forest Path', EntityType.ROOM);

// Add room traits
clearing.add({ type: TraitType.ROOM, isDark: false });
path.add({ type: TraitType.ROOM, isDark: false });

// Connect rooms (use Direction enum)
import { Direction } from '@sharpee/world-model';

clearing.add({
  type: TraitType.EXIT,
  direction: Direction.NORTH,
  destination: path.id
});

path.add({
  type: TraitType.EXIT,
  direction: Direction.SOUTH,
  destination: clearing.id
});
```

### Dark Room

```typescript
const cave = world.createEntity('Dark Cave', EntityType.ROOM);
cave.add({
  type: TraitType.ROOM,
  isDark: true,  // Requires light source to see
  description: 'A damp cave with dripping stalactites.'
});
```

## Creating Objects

### Portable Object

```typescript
const lamp = world.createEntity('brass lamp', EntityType.OBJECT);
lamp.add({ type: TraitType.PORTABLE });
lamp.add({
  type: TraitType.IDENTITY,
  description: 'A well-worn brass lamp.',
  shortDescription: 'a brass lamp'
});
world.moveEntity(lamp.id, room.id);
```

### Container

```typescript
const chest = world.createEntity('wooden chest', EntityType.CONTAINER);
chest.add({
  type: TraitType.CONTAINER,
  capacity: 10,
  isTransparent: false
});
chest.add({
  type: TraitType.OPENABLE,
  isOpen: false,
  canClose: true
});
chest.add({ type: TraitType.PORTABLE });
world.moveEntity(chest.id, room.id);

// Put item in chest (chest must be open, or use AuthorModel)
const coin = world.createEntity('gold coin', EntityType.OBJECT);
coin.add({ type: TraitType.PORTABLE });
world.moveEntity(coin.id, chest.id);  // Works if chest.isOpen = true
```

### Using AuthorModel for Setup

During world initialization, you often need to place items in closed containers. Use `AuthorModel` to bypass game validation rules:

```typescript
// Create a closed safe with treasure inside
const safe = world.createEntity('wall safe', EntityType.CONTAINER);
safe.add({ type: TraitType.CONTAINER });
safe.add({ type: TraitType.OPENABLE, isOpen: false });
safe.add({ type: TraitType.LOCKABLE, isLocked: true });

const jewels = world.createEntity('jewels', EntityType.OBJECT);
jewels.add({ type: TraitType.PORTABLE });

// AuthorModel bypasses "container is closed" validation
const author = new AuthorModel(world.getDataStore(), world);
author.moveEntity(jewels.id, safe.id);
```

Use `AuthorModel` when:
- Placing items in closed containers during setup
- Implementing special mechanics (magic, teleportation)
- Writing tests that need to bypass game rules

### Lockable Container

```typescript
const safe = world.createEntity('wall safe', EntityType.CONTAINER);
safe.add({ type: TraitType.CONTAINER });
safe.add({
  type: TraitType.OPENABLE,
  isOpen: false
});

// Create key first to get its ID
const key = world.createEntity('brass key', EntityType.OBJECT);
key.add({ type: TraitType.PORTABLE });

safe.add({
  type: TraitType.LOCKABLE,
  isLocked: true,
  keyId: key.id  // Reference key by ID
});
```

### Light Source

```typescript
const lantern = world.createEntity('lantern', EntityType.OBJECT);
lantern.add({ type: TraitType.PORTABLE });
lantern.add({
  type: TraitType.SWITCHABLE,
  isOn: false
});
lantern.add({
  type: TraitType.LIGHT_SOURCE,
  brightness: 5,
  requiresOn: true  // Only provides light when switched on
});
```

### Scenery (Non-Portable)

```typescript
const fountain = world.createEntity('marble fountain', EntityType.SCENERY);
fountain.add({
  type: TraitType.SCENERY,
  isFixed: true
});
fountain.add({
  type: TraitType.IDENTITY,
  description: 'An ornate fountain with dancing water.'
});
world.moveEntity(fountain.id, room.id);
```

## Common Traits Reference

| Trait | Purpose | Key Properties |
|-------|---------|----------------|
| `ROOM` | Location | `isDark`, `description` |
| `EXIT` | Room connection | `direction`, `destination` |
| `PORTABLE` | Can be picked up | (none) |
| `CONTAINER` | Holds items | `capacity`, `isTransparent` |
| `SUPPORTER` | Items placed on | `capacity` |
| `OPENABLE` | Can open/close | `isOpen`, `canClose` |
| `LOCKABLE` | Can lock/unlock | `isLocked`, `keyId` |
| `WEARABLE` | Can be worn | `isWorn`, `coverage` |
| `EDIBLE` | Can be eaten | `nutrition`, `eatMessage` |
| `DRINKABLE` | Can be drunk | `drinkMessage` |
| `SWITCHABLE` | On/off device | `isOn` |
| `LIGHT_SOURCE` | Provides light | `brightness`, `requiresOn` |
| `SCENERY` | Fixed in place | `isFixed` |
| `READABLE` | Has text | `text`, `isReadable` |
| `DOOR` | Connects rooms | `connectsTo`, `blocksDirection` |

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

- `> command` - Player input
- `* pattern` - Output must contain pattern
- `! pattern` - Output must NOT contain pattern
- `# comment` - Ignored

### Running Transcripts

```bash
# Run all transcripts
node dist/sharpee.js --test stories/my-story/tests/transcripts/*.transcript

# Interactive play
node dist/sharpee.js --play
```

## Troubleshooting

### "Entity not found"
- Check that you're using the correct ID (entity.id, not a string)
- Ensure entity was created before referencing

### "Action not recognized"
- Verify grammar pattern is registered in `extendParser`
- Check action is exported and registered

### "Can't take that"
- Add `TraitType.PORTABLE` to the object
- Check object is in scope (visible, reachable)

### "It's too dark"
- Room has `isDark: true`
- Player needs a light source with `isOn: true`
