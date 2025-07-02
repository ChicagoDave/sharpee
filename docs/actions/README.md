# @sharpee/actions

Event-driven action system for the Sharpee IF Platform.

## Overview

The `@sharpee/actions` package provides a pure, event-driven action system where actions validate conditions and return semantic events, but never mutate state directly. This ensures a clean separation between action logic and state management.

## Key Concepts

### Actions as Pure Functions

Actions are pure functions that:
- Validate preconditions
- Check all requirements
- Return semantic events describing what should happen
- NEVER mutate world state directly

```typescript
const takingAction: ActionExecutor = {
  id: IFActions.TAKING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    // Validate conditions...
    if (!context.canReach(noun)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'not_reachable'
      })];
    }
    
    // Return success event
    return [createEvent(IFEvents.TAKEN, {}, {
      actor: actor.id,
      target: noun.id
    })];
  }
};
```

### Read-Only Context

Actions receive a read-only context that provides query methods:

```typescript
interface ActionContext {
  readonly world: IWorldModel;  // Read-only world access
  readonly player: IFEntity;
  readonly currentLocation: IFEntity;
  
  canSee(entity: IFEntity): boolean;
  canReach(entity: IFEntity): boolean;
  canTake(entity: IFEntity): boolean;
  isInScope(entity: IFEntity): boolean;
}
```

### Event Flow

```
User Input → Parser → Action → Events → Event Processor → State Changes
```

## Usage

```typescript
import { StandardActionRegistry, registerStandardActions, ReadOnlyActionContext } from '@sharpee/actions';
import { EventProcessor } from '@sharpee/event-processor';
import { WorldModel } from '@sharpee/world-model';

// Setup
const world = new WorldModel();
const actionRegistry = new StandardActionRegistry();
registerStandardActions(actionRegistry);
const eventProcessor = new EventProcessor(world);

// Execute an action
const context = new ReadOnlyActionContext(world, player, currentRoom);
const action = actionRegistry.get('if.action.taking');
const events = action.execute(command, context);

// Apply events to world
const results = eventProcessor.processEvents(events);
```

## Standard Actions

The package includes these standard IF actions:

- **taking** - Pick up objects
- **dropping** - Put down held objects  
- **examining** - Look at objects in detail
- **opening** - Open containers and doors
- **going** - Move through exits

## Creating Custom Actions

```typescript
import { ActionExecutor, createEvent } from '@sharpee/actions';

export const customAction: ActionExecutor = {
  id: 'custom.action.foo',
  aliases: ['foo', 'bar'],
  
  execute(command, context) {
    // Validate conditions
    if (!someCondition) {
      return [createEvent('custom.failed', { reason: 'why' })];
    }
    
    // Return events
    return [createEvent('custom.foo.happened', { data: 'here' })];
  }
};

// Register it
actionRegistry.register(customAction);
```

## Design Principles

1. **Actions are read-only** - They inspect world state but never modify it
2. **Events are immutable** - Once created, events cannot be changed
3. **Fail gracefully** - Invalid actions return failure events, not exceptions
4. **Extensible** - Easy to add new actions and event types
5. **Traceable** - All state changes can be traced through events

## Related Packages

- `@sharpee/event-processor` - Applies events to the world model
- `@sharpee/world-model` - The world state that actions query
- `@sharpee/core` - Core event system

## License

MIT
