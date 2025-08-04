# Story Development Primer for Sharpee

This guide explains how to create interactive fiction stories using the Sharpee platform, with a focus on using the stdlib actions and event system.

## Table of Contents
1. [Story Structure](#story-structure)
2. [Creating Entities](#creating-entities)
3. [Using Traits](#using-traits)
4. [Event System Architecture](#event-system-architecture)
5. [Using stdlib Actions](#using-stdlib-actions)
6. [Custom Actions](#custom-actions)
7. [Text Service](#text-service)
8. [Complete Example](#complete-example)

## Story Structure

Every Sharpee story implements the `Story` interface from `@sharpee/engine`:

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity } from '@sharpee/world-model';

export class MyStory implements Story {
  config: StoryConfig = {
    id: "my-story",
    title: "My Interactive Story",
    author: "Your Name",
    version: "1.0.0",
    language: "en-us",  // This loads @sharpee/lang-en-us
    description: "A thrilling adventure"
  };

  initializeWorld(world: WorldModel): void {
    // Create rooms, objects, and set initial state
  }

  createPlayer(world: WorldModel): IFEntity {
    // Create and return the player entity
  }

  initialize(): void {
    // Optional: Set up story-specific initialization
  }

  getCustomActions(): any[] {
    // Optional: Return custom actions specific to your story
    return [];
  }

  isComplete(): boolean {
    // Optional: Return true when the story is complete
    return false;
  }
}
```

## Creating Entities

Entities are created using the WorldModel's `createEntity` method:

```typescript
// Create a room
const kitchen = world.createEntity('kitchen', 'Kitchen');

// Create an object
const knife = world.createEntity('knife', 'sharp knife');

// Create the player (in createPlayer method)
const player = world.createEntity('player', 'yourself');
```

## Using Traits

Traits define entity capabilities and properties. Always add traits immediately after creating an entity:

```typescript
import { 
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  WearableTrait,
  ActorTrait
} from '@sharpee/world-model';

// Room with exits
kitchen.add(new RoomTrait({
  exits: {
    north: { destination: 'hallway' },
    east: { destination: 'dining_room' }
  },
  isDark: false  // Well-lit room
}));

kitchen.add(new IdentityTrait({
  name: 'Kitchen',
  description: 'A well-equipped kitchen with modern appliances.',
  aliases: ['kitchen', 'room'],
  properName: false,
  article: 'the'
}));

// Wearable item
const cloak = world.createEntity('cloak', 'velvet cloak');
cloak.add(new WearableTrait({
  isWorn: false,
  slot: 'outer',
  wearMessage: 'You put on the velvet cloak.',
  removeMessage: 'You take off the velvet cloak.'
}));

// Container
const box = world.createEntity('box', 'wooden box');
box.add(new ContainerTrait({
  capacity: {
    maxItems: 5,
    maxWeight: 10
  },
  isOpen: true
}));

// Player with actor trait
player.add(new ActorTrait({
  isPlayer: true
}));
```

## Event System Architecture

The Sharpee platform uses an event-sourced architecture:

1. **Actions create events** - Actions use ActionContext to create semantic events
2. **Events are stored** - The engine stores events in the event store
3. **World state changes** - Some events trigger world model changes (like moving entities)
4. **Text service reads events** - After each turn, the text service queries events and formats output

### How Events Work

Events are **records of what happened**, not triggers for handlers. The system works like this:

```
User Input → Parser → Action → Events → Event Store
                                   ↓
                            World State Changes
                                   ↓
                            Text Service → Output
```

### Event Creation in Actions

Actions create events using the ActionContext:

```typescript
// In an action's execute method:
execute(command: ValidatedCommand, context: ActionContext) {
  const events = [];
  
  // Create an event recording what happened
  events.push(context.event('object_taken', {
    actor: command.entities.actor.id,
    object: command.entities.direct.id,
    from: context.world.getLocation(command.entities.direct.id)
  }));
  
  // The world model will handle the actual movement
  context.world.moveEntity(
    command.entities.direct.id,
    command.entities.actor.id
  );
  
  return events;
}
```

### Event Structure

```typescript
interface SemanticEvent {
  id: string;           // Unique event ID
  timestamp: number;    // When event occurred
  type: string;         // Event type (e.g., 'object_taken', 'door_opened')
  entities: {           // Entity IDs involved
    actor?: string;
    target?: string;
    [key: string]: string | undefined;
  };
  data?: any;          // Additional event data
}
```

### Common Event Types

The stdlib actions create these standard events:

- `object_taken` - Actor picks up an object
- `object_dropped` - Actor drops an object
- `actor_moved` - Actor moves between rooms
- `container_opened` - Container is opened
- `container_closed` - Container is closed
- `object_examined` - Actor examines something
- `object_worn` - Actor wears something
- `object_removed` - Actor removes worn item
- `game_message` - General message to player

## Using stdlib Actions

The stdlib provides standard IF actions. They automatically work with entities that have the appropriate traits:

### Movement Actions
- **GO**: Requires rooms with RoomTrait and exits
- **ENTER/EXIT**: Works with EntryTrait and ExitTrait

### Object Manipulation
- **TAKE/DROP**: Requires ContainerTrait on actor, objects are automatically moveable
- **PUT X IN/ON Y**: Requires ContainerTrait or SupporterTrait on target
- **GIVE X TO Y**: Requires ActorTrait on recipient

### State Changes
- **OPEN/CLOSE**: Requires OpenableTrait
- **LOCK/UNLOCK**: Requires LockableTrait
- **TURN ON/OFF**: Requires SwitchableTrait
- **WEAR/REMOVE**: Requires WearableTrait

### Information
- **LOOK**: Shows room description and contents
- **EXAMINE**: Shows detailed object description
- **INVENTORY**: Lists carried items
- **READ**: Requires ReadableTrait

Each action validates scope (what's reachable/visible) automatically through the CommandValidator.

## Custom Actions

Add story-specific actions by implementing them in `getCustomActions()`:

```typescript
getCustomActions(): any[] {
  return [{
    id: 'RING_BELL',
    verbs: ['ring'],
    entities: ['direct'],  // Expects one entity
    
    validate: (command: any, validator: any) => {
      // Optional: Custom validation
      const target = command.entities.direct;
      if (!target?.has('BELL')) {
        return { 
          valid: false, 
          error: "That's not something you can ring." 
        };
      }
      return { valid: true };
    },
    
    execute: (command: any, context: any) => {
      const bell = command.entities.direct;
      
      // Create event recording the bell ring
      const events = [];
      events.push(context.event('bell_rung', {
        actor: context.actor.id,
        bell: bell.id
      }));
      
      // If this changes world state, do it here
      // For example, if ringing opens a door:
      if (bell.id === 'magic_bell') {
        const door = context.world.getEntity('secret_door');
        door.get('OPENABLE').isOpen = true;
        
        events.push(context.event('door_opened', {
          door: 'secret_door',
          cause: 'bell_rung'
        }));
      }
      
      return events;
    }
  }];
}
```

## Text Service

The text service reads events from the event store and formats them for display. In production, it would create narrative text. For testing, we can create a simple service that just lists events:

```typescript
export class SimpleTextService implements TextService {
  processTurn(turnNumber: number, events: SemanticEvent[]): string {
    const lines = [];
    
    for (const event of events) {
      switch (event.type) {
        case 'object_taken':
          lines.push(`Taken: ${event.entities.object}`);
          break;
        case 'actor_moved':
          lines.push(`Moved to: ${event.entities.to}`);
          break;
        case 'object_examined':
          lines.push(`Examined: ${event.entities.target}`);
          break;
        case 'game_message':
          lines.push(event.data.message);
          break;
        default:
          // For debugging, show raw events
          lines.push(`[${event.type}] ${JSON.stringify(event.entities)}`);
      }
    }
    
    return lines.join('\n');
  }
}
```

## Complete Example

Here's a minimal complete story that uses the event system correctly:

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import { 
  WorldModel, 
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  ReadableTrait,
  SupporterTrait
} from '@sharpee/world-model';

export class TreasureHuntStory implements Story {
  config: StoryConfig = {
    id: "treasure-hunt",
    title: "The Treasure Hunt",
    author: "Example Author",
    version: "1.0.0",
    language: "en-us",
    description: "Find the hidden treasure!"
  };

  private world!: WorldModel;

  initializeWorld(world: WorldModel): void {
    this.world = world;
    
    // Create rooms
    const garden = world.createEntity('garden', 'Garden');
    garden.add(new RoomTrait({
      exits: { north: { destination: 'shed' } },
      isDark: false
    }));
    garden.add(new IdentityTrait({
      name: 'Garden',
      description: 'A beautiful garden with colorful flowers.',
      aliases: ['garden', 'outside']
    }));

    const shed = world.createEntity('shed', 'Garden Shed');
    shed.add(new RoomTrait({
      exits: { south: { destination: 'garden' } },
      isDark: true  // Needs light!
    }));
    shed.add(new IdentityTrait({
      name: 'Garden Shed',
      description: 'A dusty shed filled with gardening tools.',
      aliases: ['shed']
    }));

    // Create objects
    const map = world.createEntity('map', 'treasure map');
    map.add(new ReadableTrait({
      text: 'X marks the spot! Look under the flower pot.'
    }));
    map.add(new IdentityTrait({
      name: 'treasure map',
      description: 'An old map with cryptic markings.',
      aliases: ['map']
    }));

    // Create flower pot with treasure
    const pot = world.createEntity('flower_pot', 'flower pot');
    pot.add(new IdentityTrait({
      name: 'flower pot',
      description: 'A large terracotta pot with beautiful flowers.',
      aliases: ['pot', 'flowerpot']
    }));
    pot.add(new SupporterTrait({
      capacity: { maxItems: 1 }
    }));

    // Create hidden treasure
    const treasure = world.createEntity('treasure', 'golden treasure');
    treasure.add(new IdentityTrait({
      name: 'golden treasure',
      description: 'A chest full of gold coins!',
      aliases: ['treasure', 'gold', 'chest'],
      hidden: true  // Not visible until found
    }));

    // Place objects
    world.moveEntity(map.id, garden.id);
    world.moveEntity(pot.id, garden.id);
    world.moveEntity(treasure.id, pot.id);

    // Set player starting location
    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, garden.id);
    }
  }

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('player', 'yourself');
    
    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'Ready for adventure!',
      aliases: ['me', 'myself']
    }));
    
    player.add(new ActorTrait({
      isPlayer: true
    }));
    
    player.add(new ContainerTrait({
      capacity: { maxItems: 10 }
    }));
    
    return player;
  }

  getCustomActions(): any[] {
    return [{
      id: 'LOOK_UNDER',
      verbs: ['look'],
      prepositions: ['under'],
      entities: ['direct'],
      
      execute: (command: any, context: any) => {
        const events = [];
        const target = command.entities.direct;
        
        // Record the looking action
        events.push(context.event('looked_under', {
          actor: context.actor.id,
          target: target.id
        }));
        
        // If looking under the flower pot, reveal treasure
        if (target.id === 'flower_pot') {
          const treasure = this.world.getEntity('treasure');
          if (treasure) {
            // Make treasure visible
            const identity = treasure.get(IdentityTrait);
            if (identity) {
              identity.hidden = false;
            }
            
            // Record treasure discovery
            events.push(context.event('treasure_found', {
              actor: context.actor.id,
              treasure: treasure.id,
              location: target.id
            }));
            
            // Add a game message
            events.push(context.event('game_message', {
              message: 'You found the hidden treasure! You win!'
            }));
          }
        }
        
        return events;
      }
    }];
  }

  isComplete(): boolean {
    // Check if treasure is visible (found)
    const treasure = this.world.getEntity('treasure');
    if (treasure) {
      const identity = treasure.get(IdentityTrait);
      return identity && !identity.hidden;
    }
    return false;
  }
}

// Export the story
export const story = new TreasureHuntStory();
export default story;
```

## Best Practices

1. **Events are records, not triggers** - Events record what happened, they don't cause things to happen
2. **World state changes** - Make world changes directly in actions, then record events about what changed
3. **Event types** - Use descriptive event types that describe what happened (past tense)
4. **Entity IDs** - Use lowercase with underscores (e.g., `kitchen_knife`, `front_door`)
5. **Text service** - The text service reads events and creates output, it doesn't modify game state

## Running Your Story

```typescript
import { createEngineWithStory } from '@sharpee/engine';
import { story } from './my-story';

async function run() {
  const engine = await createEngineWithStory(story);
  engine.start();
  
  // Execute commands
  await engine.executeTurn('look');
  await engine.executeTurn('take map');
  await engine.executeTurn('read map');
  await engine.executeTurn('look under pot');
}
```

## Event Flow Example

Here's what happens when a player types "take map":

1. **Parser** parses "take map" into a ParsedCommand
2. **CommandValidator** checks if map is in scope
3. **TAKE action** executes:
   - Calls `world.moveEntity('map', 'player')`
   - Creates event: `{ type: 'object_taken', entities: { actor: 'player', object: 'map' } }`
4. **Engine** stores the event with turn number and sequence
5. **Text Service** reads the event and outputs: "You take the treasure map."

## Debugging Tips

1. Create a debug text service that outputs raw events
2. Check the event store to see what events were created each turn
3. Verify world state changes are happening before creating events
4. Use descriptive event types and include all relevant entity IDs
5. Remember: events describe what happened, they don't make it happen