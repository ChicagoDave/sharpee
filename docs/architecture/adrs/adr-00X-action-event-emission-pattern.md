# ADR-00X: Action Event Emission Pattern

Status: **Research** (Under Discussion)

## Context

Currently, actions in the stdlib return an array of `SemanticEvent[]` that are later pushed to the event source. The `EnhancedActionContext` provides several methods for creating these events:

- `emit(type, data)` - Creates a single event
- `emitSuccess(messageId, params)` - Creates a success event with message
- `emitError(messageId, params)` - Creates an error event with message
- `createEvent(type, data)` - Direct event creation

### Issues Identified

1. **Misleading naming**: The `emit()` method suggests immediate emission/side effects, but it only creates an event object that must be returned in an array.

2. **Inconsistent event structures**: Different event types have different payload structures:
   - Success/Error events: `{ actionId, messageId, params, ... }`
   - Game events: `{ actionId, data: {...} }`
   - Complex errors: Need both message params AND additional data

3. **Redundant event types**: Questioning whether we need separate `action.success` and `action.error` event types when the messageId already indicates the outcome.

4. **Manual array building**: Actions must manually build and return arrays of events.

5. **Language in events**: Current pattern mixes behavioral data with display concerns (messageId, params)

## Current Usage Pattern

```typescript
// In closing action
execute(context: EnhancedActionContext): SemanticEvent[] {
  // ... validation logic ...
  
  // For simple errors
  if (!openable.isOpen) {
    return context.emitError('already_closed', { item: noun.name });
  }
  
  // For complex errors with additional data
  if (hasObstacle) {
    return [
      context.emit('action.error', {
        actionId: IFActions.CLOSING,
        reason: 'prevents_closing',
        messageId: 'prevents_closing',
        params: { item: noun.name, obstacle: 'sword handle' },
        data: { obstacleId: 'sword_001' }  // Additional structured data
      })
    ];
  }
  
  // For success with game state change
  return [
    context.emit('if.event.closed', closedEventData),
    context.emit('text', { messageId: 'closed', params: { item: noun.name } })
  ];
}
```

## Event System Design Principles (from R&D)

### Core Architecture Insights

1. **Event Source as Central Store**: All events go to an event source (in-memory) during the turn
2. **Text Service Reads Later**: Text service reads the event source AFTER turn completion
3. **No Direct Text Generation**: Actions should not directly generate or reference text
4. **Behavioral Data Only**: Events should contain only computational/mechanical facts

### Event Categories Identified

1. **Turn Lifecycle Events**
   - `core.command.received` - Raw input received
   - `core.command.parsed` - Successfully parsed into action
   - `core.command.failed` - Parse or execution failure

2. **PC Command Events** 
   - Action attempts, successes, and failures
   - Validation failures (scope, preconditions)

3. **Game State Events**
   - World model changes (taken, dropped, opened, closed, etc.)
   - State transitions
   - Relationship changes

4. **Daemon Events**
   - NPC actions
   - Environmental changes
   - Timed events

### Event Data Structure Requirements

Every event data type should be:
- **Formally defined** in TypeScript interfaces
- **Co-located** with the code that creates them (not in a single file)
- **Language-agnostic** containing no display text, messages, or human-readable labels
- **Purely behavioral** capturing only facts about what happened

Example of proper behavioral event data:
```typescript
// GOOD: Pure behavioral data
export interface ActorMovedEventData {
  actorId: EntityId;
  fromLocation: EntityId;
  toLocation: EntityId;
  via?: EntityId;  // connection used
}

// BAD: Contains display concerns
export interface BadEventData {
  targetName: string;  // NO: This is display text
  messageId: string;   // NO: This is for text service
  params: any;         // NO: These are template parameters
}
```

### File Organization Pattern

Actions and modules that emit events should follow this structure:
```
/actions/standard/closing/
├── closing.ts                        // Action logic
├── closing-event-data.ts            // Success event data type
├── closing-error-obstructed.ts      // Error event data type
├── closing-events.ts                // Event factory functions
└── index.ts                         // Exports
```

## Revised Options

### Option 5: Pure Behavioral Events (Recommended)

Based on R&D findings, events should:

1. **Remove all text concerns** from event payloads
2. **Use event factories** for consistent event creation
3. **Define formal types** for all event data
4. **Let text service** determine what text to generate based on events

```typescript
// Event factory pattern
export class ClosingEvents {
  static closed(
    actorId: EntityId,
    data: ClosedEventData
  ): SemanticEvent {
    return {
      id: generateEventId(),
      type: 'if.event.closed',
      timestamp: Date.now(),
      entities: {
        actor: actorId,
        target: data.targetId,
        location: data.locationId
      },
      payload: {
        actionId: 'if.closing',
        data
      },
      tags: ['action', 'state_change']
    };
  }
  
  static obstructed(
    actorId: EntityId,
    data: ClosingObstructedData
  ): SemanticEvent {
    return {
      id: generateEventId(),
      type: 'action.error',
      timestamp: Date.now(),
      entities: {
        actor: actorId,
        target: data.targetId,
        instrument: data.obstacleId
      },
      payload: {
        actionId: 'if.closing',
        errorCode: 'CLOSING_OBSTRUCTED',
        data
      },
      tags: ['action', 'error', 'validation_failed']
    };
  }
}

// Usage in action
execute(context: EnhancedActionContext): SemanticEvent[] {
  if (hasObstacle) {
    return [
      ClosingEvents.obstructed(context.actor.id, {
        targetId: door.id,
        obstacleId: obstacle.id,
        obstaclePosition: 'partially_through'
      })
    ];
  }
  
  // ... perform closing ...
  
  return [
    ClosingEvents.closed(context.actor.id, {
      targetId: door.id,
      locationId: context.location.id,
      wasLocked: door.isLocked
    })
  ];
}
```

### Key Decisions Made

1. **No message IDs in events** - Text service determines messages from event types and data
2. **No display text in payloads** - Only IDs, states, and behavioral facts
3. **Event factories over context methods** - More explicit and type-safe
4. **Distributed type definitions** - Each module owns its event contracts

## Migration Path

1. Create event factories for existing actions
2. Remove messageId/params from event payloads  
3. Update text service to read behavioral data instead of message params
4. Deprecate context.emitSuccess/emitError methods

## Related Decisions

- Core event system design (SemanticEvent structure)
- Text service design (how events map to messages)
- World model event handling (state changes from events)
- Event data type organization (co-location with actions)

## Next Steps

1. Prototype event factories for core actions
2. Design text service event-to-message mapping
3. Document behavioral event data patterns
4. Create type registration mechanism for IDE support
