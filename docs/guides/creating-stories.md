# Creating Stories with Sharpee

This guide covers creating interactive fiction stories with Sharpee.

## Quick Start with npx

No installation required:

```bash
npx @sharpee/sharpee init my-adventure
cd my-adventure
npm install
npx @sharpee/sharpee build
```

## Minimal Story

A Sharpee story needs:
1. A story class implementing `Story` interface
2. At least one room
3. A player location

```typescript
// stories/my-story/src/index.ts
import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel, IFEntity, EntityType,
  IdentityTrait, RoomTrait, ActorTrait, ContainerTrait,
} from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'my-story',
  title: 'My Story',
  author: 'Your Name',
  version: '1.0.0',
};

export class MyStory implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    // Create starting room
    const room = world.createEntity('start', EntityType.ROOM);
    room.add(new IdentityTrait({
      name: 'Living Room',
      description: 'A cozy living room.',
    }));
    room.add(new RoomTrait());

    // Place player
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

## Project Structure

### Simple Story

```
stories/my-story/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts         # Everything in one file
└── tests/
    └── transcripts/     # Test transcripts
```

### Complex Story (Multi-Region)

```
stories/my-story/
├── src/
│   ├── index.ts                 # Main story class
│   ├── regions/
│   │   ├── forest.ts            # One file per region
│   │   └── village.ts
│   ├── npcs/
│   │   └── merchant/
│   │       ├── entity.ts
│   │       └── behavior.ts
│   ├── actions/                  # Story-specific actions
│   │   └── pray/
│   │       └── pray-action.ts
│   └── handlers/                 # Event handlers
│       └── index.ts
└── tests/
    └── transcripts/
```

## Creating Rooms

### Basic Room

```typescript
import {
  WorldModel, EntityType,
  IdentityTrait, RoomTrait,
} from '@sharpee/world-model';

const room = world.createEntity('clearing', EntityType.ROOM);
room.add(new IdentityTrait({
  name: 'Forest Clearing',
  description: 'Sunlight filters through the canopy above.',
}));
room.add(new RoomTrait());
```

### Connecting Rooms (Helper Method)

Use `world.connectRooms()` for bidirectional connections:

```typescript
import { Direction } from '@sharpee/world-model';

const kitchen = world.createEntity('kitchen', EntityType.ROOM);
const diningRoom = world.createEntity('dining', EntityType.ROOM);
// ... add traits ...

// Creates exits in BOTH directions automatically
world.connectRooms(kitchen.id, diningRoom.id, Direction.NORTH);
// Player can now GO NORTH from kitchen, GO SOUTH from dining room
```

### Dark Room

```typescript
const cave = world.createEntity('cave', EntityType.ROOM);
cave.add(new IdentityTrait({
  name: 'Dark Cave',
  description: 'A damp cave with dripping stalactites.',
}));
cave.add(new RoomTrait({ isDark: true })); // Requires light source
```

## Creating Doors

Use `world.createDoor()` to create door entities with full exit wiring:

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

## Creating Objects

**All objects are portable by default.** Use `SceneryTrait` to make something non-portable.

### Basic Object

```typescript
import { IdentityTrait } from '@sharpee/world-model';

const lamp = world.createEntity('lamp', EntityType.OBJECT);
lamp.add(new IdentityTrait({
  name: 'brass lamp',
  description: 'A well-worn brass lamp.',
}));
world.moveEntity(lamp.id, room.id);
// Player can take this - objects are portable by default
```

### Container

```typescript
import { ContainerTrait, OpenableTrait } from '@sharpee/world-model';

const chest = world.createEntity('chest', EntityType.OBJECT);
chest.add(new IdentityTrait({ name: 'wooden chest' }));
chest.add(new ContainerTrait({ capacity: 10 }));
chest.add(new OpenableTrait({ isOpen: false }));
world.moveEntity(chest.id, room.id);

// Put item in chest
const coin = world.createEntity('coin', EntityType.OBJECT);
coin.add(new IdentityTrait({ name: 'gold coin' }));
world.moveEntity(coin.id, chest.id);
```

### Lockable Container

```typescript
import { LockableTrait } from '@sharpee/world-model';

const safe = world.createEntity('safe', EntityType.OBJECT);
safe.add(new IdentityTrait({ name: 'wall safe' }));
safe.add(new ContainerTrait());
safe.add(new OpenableTrait({ isOpen: false }));
safe.add(new LockableTrait({
  isLocked: true,
  requiredKey: key.id,
}));
```

### Light Source

```typescript
import { SwitchableTrait, LightSourceTrait } from '@sharpee/world-model';

const lantern = world.createEntity('lantern', EntityType.OBJECT);
lantern.add(new IdentityTrait({ name: 'brass lantern' }));
lantern.add(new SwitchableTrait({ isOn: false }));
lantern.add(new LightSourceTrait({
  brightness: 5,
  requiresOn: true,  // Only provides light when switched on
}));
```

### Scenery (Non-Portable)

```typescript
import { SceneryTrait } from '@sharpee/world-model';

const fountain = world.createEntity('fountain', EntityType.OBJECT);
fountain.add(new IdentityTrait({
  name: 'marble fountain',
  description: 'An ornate fountain with dancing water.',
}));
fountain.add(new SceneryTrait()); // Can't be taken
world.moveEntity(fountain.id, room.id);
```

### Wearable

```typescript
import { WearableTrait } from '@sharpee/world-model';

const cloak = world.createEntity('cloak', EntityType.OBJECT);
cloak.add(new IdentityTrait({ name: 'velvet cloak' }));
cloak.add(new WearableTrait({ isWorn: false }));
```

### Edible/Drinkable

```typescript
import { EdibleTrait, DrinkableTrait } from '@sharpee/world-model';

const apple = world.createEntity('apple', EntityType.OBJECT);
apple.add(new IdentityTrait({ name: 'red apple' }));
apple.add(new EdibleTrait());

const potion = world.createEntity('potion', EntityType.OBJECT);
potion.add(new IdentityTrait({ name: 'healing potion' }));
potion.add(new DrinkableTrait());
```

## Common Traits Reference

| Trait Class | Purpose | Key Properties |
|-------------|---------|----------------|
| `RoomTrait` | Location | `isDark`, `exits` |
| `IdentityTrait` | Name/description | `name`, `description`, `aliases` |
| `ContainerTrait` | Holds items | `capacity`, `isTransparent` |
| `SupporterTrait` | Items placed on | `capacity` |
| `OpenableTrait` | Can open/close | `isOpen` |
| `LockableTrait` | Can lock/unlock | `isLocked`, `requiredKey` |
| `WearableTrait` | Can be worn | `isWorn` |
| `EdibleTrait` | Can be eaten | |
| `DrinkableTrait` | Can be drunk | |
| `SwitchableTrait` | On/off device | `isOn` |
| `LightSourceTrait` | Provides light | `brightness`, `requiresOn` |
| `SceneryTrait` | Fixed/non-portable | |
| `DoorTrait` | Connects rooms | `room1`, `room2` |
| `ActorTrait` | NPC or player | `isPlayer` |

## Event Handlers

React to game events with custom logic:

```typescript
// Story-level handler
world.registerEventHandler('if.event.taken', (event, world) => {
  if (event.data.itemId === treasureId) {
    // Update score, trigger event, etc.
  }
});
```

See [Event Handlers Guide](./event-handlers.md) for full details.

## Story-Specific Actions

When stdlib doesn't have the verb you need:

```typescript
// stories/my-story/src/actions/pray/pray-action.ts
import { Action, ActionContext } from '@sharpee/stdlib';

export const PRAY_ACTION_ID = 'mystory.action.pray';

export const prayAction: Action = {
  id: PRAY_ACTION_ID,
  group: 'special',

  validate(context: ActionContext) {
    // Check conditions
    return { valid: true };
  },

  execute(context: ActionContext) {
    // Perform the action
    context.sharedData.blessed = true;
  },

  report(context: ActionContext) {
    return [context.event('action.success', {
      actionId: PRAY_ACTION_ID,
      messageId: 'mystory.pray.success',
    })];
  },

  blocked(context: ActionContext, result) {
    return [context.event('action.blocked', {
      actionId: PRAY_ACTION_ID,
      messageId: result.error,
    })];
  },
};
```

### Grammar Pattern

```typescript
// In extendParser
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  grammar
    .define('pray')
    .mapsTo(PRAY_ACTION_ID)
    .withPriority(150)
    .build();
}
```

## Transcript Testing

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
* Kitchen
```

### Transcript Syntax

- `> command` - Player input
- `* pattern` - Output must contain pattern
- `! pattern` - Output must NOT contain pattern
- `# comment` - Ignored

### Running Tests

```bash
# Run single transcript
node dist/cli/sharpee.js --test stories/my-story/tests/transcripts/basic.transcript

# Run all transcripts
node dist/cli/sharpee.js --test stories/my-story/tests/transcripts/*.transcript
```

## Best Practices

### 1. Use Helper Methods

```typescript
// Use connectRooms for bidirectional connections
world.connectRooms(room1.id, room2.id, Direction.NORTH);

// Use createDoor for doors with full wiring
world.createDoor('door', { room1Id, room2Id, direction, ... });
```

### 2. Messages Through Language Layer

Never hardcode output text in actions:

```typescript
// GOOD
events.push(context.event('action.success', {
  messageId: 'mystory.pray.success'
}));

// BAD
events.push({ text: 'You feel blessed.' });
```

### 3. Keep Actions Simple

Actions coordinate behaviors, not implement complex logic.

### 4. Test Early and Often

Write transcripts as you build features.

## Troubleshooting

### "Entity not found"
- Check entity.id is correct
- Ensure entity was created before referencing

### "Action not recognized"
- Verify grammar pattern in `extendParser`
- Check action is exported and registered

### "Can't take that"
- Object may have `SceneryTrait`
- Check object is visible and reachable

### "It's too dark"
- Room has `isDark: true`
- Player needs a light source with `isOn: true`
