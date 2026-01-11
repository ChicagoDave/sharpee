# Creating Stories with Sharpee

This guide is designed for developers (and Claude Code) creating new interactive fiction stories with Sharpee.

## Quick Start

A minimal Sharpee story needs:
1. A `package.json` with dependencies
2. A story class implementing `Story` interface
3. At least one room and a player location

```typescript
// stories/my-story/src/index.ts
import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, EntityType, TraitType } from '@sharpee/world-model';

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

// Put item in chest
const coin = world.createEntity('gold coin', EntityType.OBJECT);
coin.add({ type: TraitType.PORTABLE });
world.moveEntity(coin.id, chest.id);
```

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

### Wearable

```typescript
const cloak = world.createEntity('velvet cloak', EntityType.OBJECT);
cloak.add({ type: TraitType.PORTABLE });
cloak.add({
  type: TraitType.WEARABLE,
  isWorn: false,
  coverage: ['torso', 'arms']
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

### Edible/Drinkable

```typescript
const apple = world.createEntity('red apple', EntityType.OBJECT);
apple.add({ type: TraitType.PORTABLE });
apple.add({
  type: TraitType.EDIBLE,
  nutrition: 10,
  eatMessage: 'Delicious and crisp!'
});

const potion = world.createEntity('healing potion', EntityType.OBJECT);
potion.add({ type: TraitType.PORTABLE });
potion.add({
  type: TraitType.DRINKABLE,
  drinkMessage: 'You feel refreshed.'
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

### Supporter (Things Can Be Placed On)

```typescript
const table = world.createEntity('oak table', EntityType.SUPPORTER);
table.add({
  type: TraitType.SUPPORTER,
  capacity: 5
});
table.add({ type: TraitType.SCENERY, isFixed: true });
world.moveEntity(table.id, room.id);

// Put item on table
world.moveEntity(lamp.id, table.id);
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
| `LOCKABLE` | Can lock/unlock | `isLocked`, `keyId`, `keyIds` |
| `WEARABLE` | Can be worn | `isWorn`, `coverage` |
| `EDIBLE` | Can be eaten | `nutrition`, `eatMessage` |
| `DRINKABLE` | Can be drunk | `drinkMessage` |
| `SWITCHABLE` | On/off device | `isOn` |
| `LIGHT_SOURCE` | Provides light | `brightness`, `requiresOn` |
| `SCENERY` | Fixed in place | `isFixed` |
| `READABLE` | Has text | `text`, `isReadable` |
| `DOOR` | Connects rooms | `connectsTo`, `blocksDirection` |
| `ACTOR` | NPC or player | `health`, `inventory` |

## Event Handlers

Handle events to add custom logic when actions occur.

### Entity-Level Handler

```typescript
const lever = world.createEntity('rusty lever', EntityType.OBJECT);
lever.add({ type: TraitType.PULLABLE });

lever.on = {
  'if.event.pulled': (event, world) => {
    // Open secret door when lever is pulled
    const secretDoor = world.getEntity('secret_door_id');
    if (secretDoor) {
      const openable = secretDoor.get(TraitType.OPENABLE);
      if (openable) {
        openable.isOpen = true;
      }
    }
    return []; // Return additional events if needed
  }
};
```

### Story-Level Handler

```typescript
// In initializeWorld or separate handlers file
world.registerEventHandler('if.event.taken', (event, world) => {
  const itemId = event.data.itemId;

  // Check if player took a special item
  if (itemId === treasureId) {
    // Update score, trigger event, etc.
  }
});
```

### Common Events to Handle

| Event | When Fired | Data |
|-------|------------|------|
| `if.event.taken` | Item picked up | `itemId`, `actorId` |
| `if.event.dropped` | Item dropped | `itemId`, `actorId` |
| `if.event.opened` | Container/door opened | `targetId` |
| `if.event.closed` | Container/door closed | `targetId` |
| `if.event.locked` | Lock engaged | `targetId`, `keyId` |
| `if.event.unlocked` | Lock disengaged | `targetId`, `keyId` |
| `if.event.entered` | Player entered container | `targetId` |
| `if.event.exited` | Player exited container | `targetId` |
| `if.event.put_in` | Item put in container | `itemId`, `containerId` |
| `if.event.put_on` | Item put on supporter | `itemId`, `supporterId` |

## Story-Specific Actions

When stdlib doesn't have the verb you need, create a story action.

### Action Structure

```typescript
// stories/my-story/src/actions/pray/pray-action.ts
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';

export const PRAY_ACTION_ID = 'mystory.action.pray';

export const prayAction: Action = {
  id: PRAY_ACTION_ID,
  group: 'special',
  requiredMessages: ['pray_success', 'pray_no_effect'],

  validate(context: ActionContext): ValidationResult {
    // Check if player is in a holy place
    const location = context.currentLocation;
    const isHoly = location?.get('mystory.trait.holy');

    if (!isHoly) {
      return {
        valid: false,
        error: 'pray_no_effect'
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Store data for report phase
    const sharedData = context.sharedData as any;
    sharedData.blessed = true;
  },

  report(context: ActionContext): ISemanticEvent[] {
    return [
      context.event('mystory.event.prayed', {}),
      context.event('action.success', {
        actionId: PRAY_ACTION_ID,
        messageId: 'pray_success'
      })
    ];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: PRAY_ACTION_ID,
      messageId: result.error,
      params: result.params
    })];
  }
};
```

### Register Action

```typescript
// In story's initializeWorld or a separate setup
import { prayAction } from './actions/pray/pray-action';

// Register with engine (done automatically if exported from index.ts)
```

### Grammar Pattern

```typescript
// In extendParser
grammar
  .define('pray')
  .mapsTo(PRAY_ACTION_ID)
  .withPriority(150)
  .build();
```

## Capability Dispatch

For verbs with entity-specific meanings (like "lower" meaning different things for different objects), use capability dispatch.

### Define Trait with Capabilities

```typescript
// stories/my-story/src/traits/elevator-trait.ts
import { ITrait } from '@sharpee/world-model';

export class ElevatorTrait implements ITrait {
  static readonly type = 'mystory.trait.elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'];

  position: 'top' | 'bottom' = 'top';
  topRoomId: string = '';
  bottomRoomId: string = '';
}
```

### Implement Behavior

```typescript
import { CapabilityBehavior, createEffect } from '@sharpee/world-model';

export const ElevatorLoweringBehavior: CapabilityBehavior = {
  validate(entity, world, actorId) {
    const trait = entity.get(ElevatorTrait.type) as ElevatorTrait;
    if (trait.position === 'bottom') {
      return { valid: false, error: 'mystory.elevator.already_down' };
    }
    return { valid: true };
  },

  execute(entity, world, actorId) {
    const trait = entity.get(ElevatorTrait.type) as ElevatorTrait;
    trait.position = 'bottom';
  },

  report(entity, world, actorId) {
    return [
      createEffect('if.event.lowered', { targetId: entity.id }),
      createEffect('action.success', {
        actionId: 'if.action.lowering',
        messageId: 'mystory.elevator.lowered'
      })
    ];
  },

  blocked(entity, world, actorId, error) {
    return [
      createEffect('action.blocked', {
        actionId: 'if.action.lowering',
        messageId: error
      })
    ];
  }
};
```

### Register Behavior

```typescript
import { registerCapabilityBehavior } from '@sharpee/world-model';

// In initializeWorld
registerCapabilityBehavior(
  ElevatorTrait.type,
  'if.action.lowering',
  ElevatorLoweringBehavior
);
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

> south
* Living Room
```

### Transcript Syntax

- `> command` - Player input
- `* pattern` - Output must contain pattern
- `! pattern` - Output must NOT contain pattern
- `# comment` - Ignored
- Blank lines separate test sections

### Running Transcripts

```bash
# Run all transcripts
node packages/transcript-tester/dist/cli.js stories/my-story --all

# Run specific transcript
node packages/transcript-tester/dist/cli.js stories/my-story tests/transcripts/basic.transcript

# Verbose output
node packages/transcript-tester/dist/cli.js stories/my-story --all --verbose
```

## Best Practices

### 1. Separate Concerns

- Rooms in `regions/*/rooms/`
- Objects in `regions/*/objects/`
- NPCs in `npcs/*/`
- Custom actions in `actions/*/`

### 2. Use IDs Consistently

```typescript
// Store IDs for cross-referencing
const roomIds = {
  clearing: clearing.id,
  path: path.id
};
```

### 3. Messages Through Language Layer

Never hardcode output text in actions:

```typescript
// GOOD
events.push(context.event('action.success', {
  messageId: 'mystory.pray.success'
}));

// BAD
events.push({ text: 'You feel blessed.' });
```

### 4. Keep Actions Simple

Actions should coordinate behaviors, not contain complex logic:

```typescript
// GOOD - delegate to behavior
execute(context: ActionContext): void {
  const result = ElevatorBehavior.lower(entity, world);
  context.sharedData.result = result;
}

// BAD - complex logic in action
execute(context: ActionContext): void {
  // 50 lines of state manipulation...
}
```

### 5. Test Early and Often

Write transcripts as you build features:

```
# As you add the lever puzzle
> pull lever
* click
* secret door opens

> north
* Hidden Chamber
```

## Common Patterns

### Conditional Exit

```typescript
// Door blocks exit until opened
const door = world.createEntity('heavy door', EntityType.OBJECT);
door.add({
  type: TraitType.DOOR,
  connectsTo: nextRoom.id,
  blocksDirection: Direction.NORTH
});
door.add({
  type: TraitType.OPENABLE,
  isOpen: false
});
world.moveEntity(door.id, room.id);
```

### Score System

```typescript
// Track score in world state
world.setState({ score: 0, maxScore: 100 });

// Update on treasure pickup
world.registerEventHandler('if.event.taken', (event, world) => {
  const item = world.getEntity(event.data.itemId);
  if (item?.has('treasure')) {
    const state = world.getState();
    state.score += 10;
  }
});
```

### Darkness with Light Source

```typescript
// Room is dark
const cave = world.createEntity('cave', EntityType.ROOM);
cave.add({ type: TraitType.ROOM, isDark: true });

// Lantern provides light when on
const lantern = world.createEntity('lantern', EntityType.OBJECT);
lantern.add({ type: TraitType.PORTABLE });
lantern.add({ type: TraitType.SWITCHABLE, isOn: false });
lantern.add({
  type: TraitType.LIGHT_SOURCE,
  brightness: 5,
  requiresOn: true
});
```

### Multi-Room Connection (Region Pattern)

```typescript
// regions/forest/index.ts
export function createForestRegion(world: WorldModel) {
  const clearing = createClearing(world);
  const path = createPath(world);
  const stream = createStream(world);

  // Connect rooms
  connectRooms(world, clearing, Direction.NORTH, path);
  connectRooms(world, path, Direction.EAST, stream);

  return { clearing, path, stream };
}

function connectRooms(
  world: WorldModel,
  from: IFEntity,
  direction: Direction,
  to: IFEntity
) {
  from.add({
    type: TraitType.EXIT,
    direction,
    destination: to.id
  });

  // Add reverse exit
  const reverseDir = getOppositeDirection(direction);
  to.add({
    type: TraitType.EXIT,
    direction: reverseDir,
    destination: from.id
  });
}
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

### Tests failing silently
- Run with `--verbose` flag
- Check transcript syntax (no tabs, correct `>` prefix)
