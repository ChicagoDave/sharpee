# Event Handlers Guide

## Overview

Event handlers allow you to add custom game logic that **reacts** to domain events. When a player performs an action, the system records domain events that describe what happened. Your handlers can react to these events to implement puzzles, trigger sequences, and add custom behavior.

## Understanding Domain Events vs Handlers

**Domain events** (`if.event.*`) are **records** of what happened in the game world. They are written to event sources for:
1. **Event sourcing** - Recording game history
2. **Text rendering** - The text service reads them to generate player output

**Event handlers** are a **separate mechanism** that lets your story **react** to domain events as they're recorded. Handlers don't "receive" events in a pub/sub sense - they intercept domain events during processing.

## Core Concepts

### Domain Events
Domain events describe what happened in the game (past tense):
- `if.event.pushed` - Something was pushed
- `if.event.pulled` - Something was pulled
- `if.event.taken` - Something was taken
- `if.event.dropped` - Something was dropped
- `if.event.opened` - Something was opened
- `if.event.closed` - Something was closed

These events carry both **domain data** (what happened) and **rendering data** (messageId + params for the text service).

### Handlers
Handlers are functions that **react** to domain events. They can:
- Modify game state (open doors, update puzzles)
- Generate additional domain events
- Trigger puzzles or sequences

Handlers run during event processing, before the text service renders output.

## Entity-Level Handlers

Entity handlers define how specific objects respond to events affecting them.

### Basic Example: Push Book Opens Bookshelf

```typescript
const book = world.createEntity('red-book', 'item');
const bookshelf = world.createEntity('bookshelf', 'container');

// When the book is pushed, open the bookshelf
book.on = {
  'if.event.pushed': (event) => {
    // Open the bookshelf
    const openable = bookshelf.get('OPENABLE');
    if (openable) {
      openable.isOpen = true;
    }
    
    // Return a message event
    return [{
      id: `${Date.now()}-bookshelf-opens`,
      type: 'action.message',
      timestamp: Date.now(),
      data: {
        message: 'As you push the book, the bookshelf swings open revealing a secret passage!'
      },
      entities: {}
    }];
  }
};
```

### Multiple Handlers on One Entity

```typescript
button.on = {
  'if.event.pushed': (event) => {
    // Handle push
    return [/* events */];
  },
  
  'if.event.examined': (event) => {
    // Handle examine  
    return [/* events */];
  }
};
```

## Story-Level Handlers (Daemons)

Story handlers watch for events across the entire game and can implement complex puzzles or game-wide logic.

### Example: Three Statues Puzzle

```typescript
class MyStory extends StoryWithEvents {
  private pushedStatues = new Set<string>();
  
  initializeWorld(world: WorldModel): void {
    const statue1 = world.createEntity('statue-1', 'item');
    const statue2 = world.createEntity('statue-2', 'item');
    const statue3 = world.createEntity('statue-3', 'item');
    const door = world.createEntity('secret-door', 'door');
    
    // Register story-level handler
    this.on('if.event.pushed', (event) => {
      const targetId = event.data?.target;
      
      // Check if a statue was pushed
      if (targetId && [statue1.id, statue2.id, statue3.id].includes(targetId)) {
        this.pushedStatues.add(targetId);
        
        // Check if all three have been pushed
        if (this.pushedStatues.size === 3) {
          // Open the secret door
          const openable = door.get('OPENABLE');
          if (openable) {
            openable.isOpen = true;
          }
          
          return [{
            type: 'action.message',
            data: {
              message: 'With all three statues in position, the secret door grinds open!'
            },
            // ... other event properties
          }];
        } else {
          return [{
            type: 'action.message',
            data: {
              message: `You've pushed ${this.pushedStatues.size} of 3 statues.`
            },
            // ... other event properties
          }];
        }
      }
    });
  }
}
```

## Helper Utilities

The stdlib provides helper functions to create common handler patterns:

### Toggle Handler
```typescript
import { createToggleHandler } from '@sharpee/stdlib/events/helpers';

// Automatically toggle a switch when pushed
lightSwitch.on = {
  'if.event.pushed': createToggleHandler(lightSwitch)
};
```

### Open Handler
```typescript
import { createOpenHandler } from '@sharpee/stdlib/events/helpers';

// Open a door when button is pushed
button.on = {
  'if.event.pushed': createOpenHandler(button, doorId)
};
```

### Message Handler
```typescript
import { createMessageHandler } from '@sharpee/stdlib/events/helpers';

// Display a message when examined
painting.on = {
  'if.event.examined': createMessageHandler(
    'The painting depicts a serene landscape with hidden details.'
  )
};
```

### Compose Multiple Handlers
```typescript
import { composeHandlers, createToggleHandler, createMessageHandler } from '@sharpee/stdlib/events/helpers';

// Do multiple things when pushed
lever.on = {
  'if.event.pulled': composeHandlers(
    createToggleHandler(lever),
    createMessageHandler('The lever clicks into position.'),
    (event) => {
      // Custom logic
      return [/* additional events */];
    }
  )
};
```

### One-Time Handler
```typescript
import { createOnceHandler, createMessageHandler } from '@sharpee/stdlib/events/helpers';

// Show message only the first time
crystal.on = {
  'if.event.examined': createOnceHandler(
    createMessageHandler('The crystal glows briefly at your touch.')
  )
};
```

### Conditional Handler
```typescript
import { createConditionalHandler } from '@sharpee/stdlib/events/helpers';

// Only trigger if condition is met
door.on = {
  'if.event.opened': createConditionalHandler(
    (event) => !hasKey,  // Condition
    (event) => [{        // Handler if condition is true
      type: 'action.message',
      data: { message: 'The door is locked!' },
      // ...
    }]
  )
};
```

## Event Data Structure

Events passed to handlers have this structure:

```typescript
interface GameEvent {
  type: string;           // Event type (e.g., 'if.event.pushed')
  data: {
    target?: string;      // Entity ID that was affected
    targetName?: string;  // Entity name
    actor?: string;       // Who performed the action
    // ... action-specific data
  };
}
```

## Handler Return Values

Handlers can return:
- `undefined` or `void` - No response needed
- `SemanticEvent[]` - Array of new events to process

Example return event:
```typescript
return [{
  id: `${Date.now()}-custom-event`,
  type: 'action.message',  // or 'if.event.custom', etc.
  timestamp: Date.now(),
  data: {
    message: 'Something happens!',
    // ... other data
  },
  entities: {}
}];
```

## Best Practices

### 1. Keep Handlers Focused
Each handler should do one thing well. Use `composeHandlers` to combine multiple behaviors.

### 2. Check Trait Existence
Always verify traits exist before using them:
```typescript
const openable = entity.get('OPENABLE');
if (openable) {
  openable.isOpen = true;
}
```

### 3. Use Helper Functions
Leverage the provided helpers for common patterns instead of writing everything from scratch.

### 4. Return Meaningful Messages
Always provide feedback to the player about what happened:
```typescript
return [{
  type: 'action.message',
  data: { message: 'The mechanism clicks and whirs to life.' },
  // ...
}];
```

### 5. Test Handler Interactions
When multiple handlers might fire for the same event, test that they work together correctly.

## Common Patterns

### Button Opens Door
```typescript
button.on = {
  'if.event.pushed': (event) => {
    const door = world.getEntity('door-1');
    const openable = door?.get('OPENABLE');
    if (openable) {
      openable.isOpen = true;
      return [{
        type: 'action.message',
        data: { message: 'The door slides open.' },
        // ...
      }];
    }
  }
};
```

### Breakable Object
```typescript
vase.on = {
  'if.event.dropped': (event) => {
    // Remove the vase
    world.removeEntity(vase.id);
    
    // Create fragments
    const fragments = world.createEntity('vase-fragments', 'item');
    world.setLocation(fragments.id, event.data.location);
    
    return [{
      type: 'action.message',
      data: { message: 'The vase shatters into pieces!' },
      // ...
    }];
  }
};
```

### Progressive Puzzle
```typescript
class PuzzleStory extends StoryWithEvents {
  private puzzleState = 0;
  
  constructor(config: StoryConfig) {
    super(config);
    
    this.on('if.event.pulled', (event) => {
      if (event.data?.target === 'lever-1') {
        this.puzzleState++;
        
        if (this.puzzleState === 3) {
          return [{
            type: 'action.message',
            data: { message: 'The puzzle is complete!' },
            // ...
          }];
        }
      }
    });
  }
}
```

## Debugging Tips

1. **Log handler execution**: Add console.log statements to see when handlers fire
2. **Check event data**: Log the event object to see what data is available
3. **Verify entity IDs**: Make sure you're using the correct entity IDs
4. **Test incrementally**: Add one handler at a time and test

## Advanced Topics

### Custom Event Types
You can emit and handle custom events:
```typescript
// Emit custom event
return [{
  type: 'game.puzzle.solved',
  data: { puzzle: 'statue-puzzle' },
  // ...
}];

// Handle custom event
story.on('game.puzzle.solved', (event) => {
  // Handle puzzle completion
});
```

### Domain Event Processing Order
When a domain event is recorded, handlers are invoked in this order:
1. Entity-level handlers (on the affected entity)
2. Story-level handlers
3. Event is written to event source
4. At turn end, text service renders all domain events

### Performance Considerations
- Handlers run synchronously, so avoid heavy computation
- Cache entity lookups when possible
- Use conditional handlers to avoid unnecessary processing

## Migration from ActionBehaviors

If you were using the previous ActionBehavior system, migrate by:
1. Remove ActionBehavior class usage
2. Move logic into event handlers
3. Use helper functions for common patterns

Before (ActionBehavior):
```typescript
class ButtonPushBehavior extends ActionBehavior {
  execute(context) {
    // Complex class-based logic
  }
}
```

After (Event Handler):
```typescript
button.on = {
  'if.event.pushed': (event) => {
    // Simple, direct logic
  }
};
```

## Summary

Event handlers provide a simple, powerful way to add custom game logic:
- **Entity handlers** for object-specific behavior
- **Story handlers** for game-wide logic and puzzles
- **Helper functions** for common patterns
- **Flexible returns** for chaining events

Start simple with entity handlers, then add story-level handlers as your game grows in complexity.