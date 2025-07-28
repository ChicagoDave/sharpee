# ADR-039: Action Event Emission Pattern

Status: **Replaced** by ADR-041

## Context

Currently, actions in the stdlib return an array of `SemanticEvent[]` that are later pushed to the event source. The `EnhancedActionContext` provides several confusing and redundant methods for creating these events that violate our core principles of simplicity and separation of concerns.

### Issues with Current Implementation

1. **Misleading naming**: Methods like `emit()` suggest immediate emission but only create events
2. **Redundant methods**: Both `emit()` and `createEvent()` do the same thing
3. **Mixed concerns**: Event creation is coupled with message formatting
4. **Poor abstraction**: Actions must manually manage event arrays
5. **No type safety**: Event data is untyped despite known patterns

## Decision

We will adopt a simple event store pattern with the following design:

### 1. Simple Event Store Interface

```typescript
interface ActionEventStore {
  append(type: string, data: any): void;
}

interface EnhancedActionContext extends ActionContext {
  readonly events: ActionEventStore;
}
```

The `ActionEventStore` is intentionally minimal - actions should only append events, never read or manipulate the event history. This maintains clean separation of concerns and prevents actions from depending on event state.

### 2. Mandatory Event Data Types

Every action MUST define TypeScript interfaces for all events it emits:

```typescript
// packages/stdlib/src/actions/closing/closing-events.ts
export interface ClosedEventData {
  targetId: EntityId;
  locationId: EntityId;
  wasLocked: boolean;
}

export interface ClosingObstructedData {
  targetId: EntityId;
  obstacleId: EntityId;
  obstaclePosition: 'partially_through' | 'blocking_latch';
}
```

### 3. Pure Behavioral Events

Events must contain only behavioral data - no display text, message IDs, or template parameters:

```typescript
// Action implementation
execute(context: EnhancedActionContext): void {
  if (hasObstacle) {
    const errorData: ClosingObstructedData = {
      targetId: door.id,
      obstacleId: obstacle.id,
      obstaclePosition: 'partially_through'
    };
    context.events.append('closing.obstructed', errorData);
    return;
  }

  // Perform closing...
  
  const eventData: ClosedEventData = {
    targetId: door.id,
    locationId: context.location.id,
    wasLocked: door.isLocked
  };
  context.events.append('door.closed', eventData);
}
```

### 4. Turn Number Tracking

All events must include a turn number to enable proper event grouping and causality tracking. Multiple events can occur within a single turn:

```typescript
// The event store automatically adds turnNumber
interface SemanticEvent {
  id: string;
  type: string;
  timestamp: number;
  turnNumber: number;  // Required for all events
  entities: Record<string, string>;
  payload: any;
}

// Example: Multiple events in a single turn
// Turn 3: "go south" to a dark room
context.events.append('actor.moved', moveData);        // turnNumber: 3
context.events.append('location.light_changed', lightData); // turnNumber: 3
```

This enables:
- Grouping all events from a single command
- Understanding cause and effect relationships
- Proper save/restore functionality
- Debugging and analytics

### 5. Event Type Naming Convention

Event types should follow a consistent pattern:
- State changes: `entity.state` (e.g., `door.closed`, `item.taken`)
- Errors: `action.error_type` (e.g., `closing.obstructed`, `taking.too_heavy`)
- System events: `system.event` (e.g., `turn.started`, `game.saved`)

### 6. File Organization

Each action module must organize event-related code:

```
/actions/standard/closing/
├── closing.ts              // Action implementation
├── closing-events.ts       // Event data type definitions
└── index.ts               // Public exports
```

## Consequences

### Positive

- **Simplicity**: Single `append` method is clear and unambiguous
- **Type safety**: Enforced at action level where it matters
- **Extensibility**: Open system allows custom events from extensions
- **Separation**: Event creation separated from text generation
- **Testability**: Event types make testing predictable

### Negative

- **Migration effort**: Existing actions need refactoring
- **No runtime validation**: System trusts actions to use correct types
- **Learning curve**: Developers must understand event/text separation

## Implementation

1. Create `ActionEventStore` as a thin wrapper around `SemanticEventSource` that only exposes `append`
2. Update `EnhancedActionContext` to include the event store and remove emit/createEvent methods
3. Update `SemanticEvent` interface to include required `turnNumber` field
4. Modify action executor to pass event store to context and handle the appended events
5. Change action signatures from returning `SemanticEvent[]` to `void`
6. Create event type definitions for all existing actions
7. Remove message-related data from event payloads
8. Update text service to map behavioral events to messages

## Related ADRs

- ADR-029: Text Service Architecture
- ADR-035: Platform Event Architecture
- ADR-038: Language Agnostic Actions
