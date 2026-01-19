# Event Management Architecture

## Overview

This document clarifies the intended architecture for event management and text rendering in Sharpee. The current implementation has unnecessary complexity that should be simplified.

## Architecture

### Data Flow

```
Action executes
    ↓
Emits domain events to EventSource (data store)
    ↓
Turn completes
    ↓
Engine pops turn events, sends to TextService
    ↓
TextService iterates events, looks up messages, creates TextBlocks
    ↓
Client renders TextBlocks (stdio for CLI, HTML for browser)
```

### Key Principles

1. **Events are data blocks** - The event source is a data store, not a pub/sub system. Events are not "subscribed to" - they are read as a batch after each turn.

2. **Domain events carry messageIds** - Events like `if.event.looked` contain a `messageId` and `params` for text rendering. This enables multi-lingual games (language can be switched at render time).

3. **Text-service is a simple transformer** - It loops through events, looks up messages from languageProvider, and outputs TextBlocks. No complex routing or handler dispatch needed.

4. **One domain event per action outcome** - Actions emit domain events (`if.event.looked`, `if.event.switched_on`, etc.), not separate "rendering instruction" events.

## Event Structure

Domain events should include:

```typescript
interface ISemanticEvent {
  id: string;
  type: string;                    // e.g., 'if.event.looked'
  timestamp: number;
  data: {
    messageId: string;             // e.g., 'room_description'
    params: Record<string, any>;   // e.g., { name: "Cellar", description: "..." }
    // ... other domain-specific data for event sourcing
  };
}
```

## Text Service Implementation

The text-service should be simple:

```typescript
processTurn(events: ISemanticEvent[]): ITextBlock[] {
  const blocks: ITextBlock[] = [];

  for (const event of events) {
    if (event.data?.messageId) {
      const text = this.languageProvider.getMessage(
        event.data.messageId,
        event.data.params
      );
      if (text) {
        blocks.push(createBlock(BLOCK_KEYS.ACTION_RESULT, text));
      }
    }
  }

  return blocks;
}
```

That's it. No routing, no handlers, no skip lists.

## What's Wrong with Current Implementation

### Problem 1: Dual Event Pattern

Currently, actions emit both:
- Domain event (`if.event.looked`) - for "event sourcing"
- Action status event (`action.success`) - for "text rendering"

This is redundant. The domain event should carry everything needed for both purposes.

### Problem 2: Complex Text-Service Routing

Current text-service has:
- `STATE_CHANGE_EVENTS` set to skip certain events
- `routeToHandler()` method with switch statement
- Separate handlers: `handleRoomDescription`, `handleActionSuccess`, `handleActionFailure`, etc.
- Message lookup that tries `{actionId}.{messageId}` then falls back

This complexity exists to support the dual event pattern and causes bugs when actionIds don't match message registration.

### Problem 3: Message Registration Mismatch

Messages are registered under specific action IDs:
- `if.action.looking.room_description`
- `if.action.going.room_description`

But events from `switching_on` try to look up `if.action.switching_on.room_description` which doesn't exist. The current workaround (specifying a different actionId) is fragile.

## Required Changes

### 1. Simplify Event Emission

Actions should emit ONE domain event with messageId and params:

```typescript
// Looking action
report(context): ISemanticEvent[] {
  return [
    context.event('if.event.looked', {
      messageId: 'room_description',
      params: {
        name: room.name,
        description: room.description,
        items: visibleItems.map(i => i.name).join(', ')
      },
      // Domain data for event sourcing
      roomId: room.id,
      actorId: player.id
    })
  ];
}
```

### 2. Simplify Message Registration

Register messages without action prefix:

```typescript
// Instead of:
'if.action.looking.room_description': "{name}\n{description}"

// Just:
'room_description': "{name}\n{description}"
```

Or use a flat namespace for shared messages.

### 3. Simplify Text-Service

Replace the complex routing with a simple loop:

```typescript
processTurn(events: ISemanticEvent[]): ITextBlock[] {
  const blocks: ITextBlock[] = [];

  for (const event of events) {
    if (event.data?.messageId) {
      const text = this.languageProvider.getMessage(
        event.data.messageId,
        event.data.params
      );
      if (text && text !== event.data.messageId) {
        blocks.push(createBlock(BLOCK_KEYS.ACTION_RESULT, text));
      }
    }
  }

  return blocks;
}
```

### 4. Remove Unnecessary Code

- Remove `action.success`, `action.failure`, `action.blocked` event emissions from actions
- Remove `STATE_CHANGE_EVENTS` set from text-service
- Remove `routeToHandler()` and all handler methods
- Remove `handleActionSuccess`, `handleActionFailure`, `handleRoomDescription`, etc.

## Events to Define

Each action should emit ONE domain event. Standard events:

| Event | Description | Key Params |
|-------|-------------|------------|
| `if.event.looked` | Player looked at room/object | messageId, name, description, items |
| `if.event.examined` | Player examined specific object | messageId, name, description |
| `if.event.taken` | Player took something | messageId, itemName |
| `if.event.dropped` | Player dropped something | messageId, itemName |
| `if.event.opened` | Something was opened | messageId, targetName |
| `if.event.closed` | Something was closed | messageId, targetName |
| `if.event.switched_on` | Device turned on | messageId, targetName |
| `if.event.switched_off` | Device turned off | messageId, targetName |
| `if.event.went` | Player moved to new room | messageId (for blocked), direction |
| `if.event.attacked` | Combat occurred | messageId, outcome |
| ... | ... | ... |

## Migration Path

1. Update text-service to handle both old and new patterns during transition
2. Update actions one at a time to emit simplified events
3. Update message registration to flat namespace
4. Remove old code paths once all actions migrated
5. Clean up text-service to final simple form

## Related Issues

- ISSUE-018: SWITCH ON LAMP not showing room description (symptom of this architectural problem)
- ISSUE-014: Previously "fixed" but actually just worked around the root cause

## Benefits

1. **Simpler code** - Less indirection, easier to understand
2. **Fewer bugs** - No actionId/messageId mismatch issues
3. **Easier to extend** - Adding new actions doesn't require updating text-service routing
4. **Multi-lingual support** - Messages looked up at render time, not event creation time
5. **Clean event sourcing** - Domain events are the single source of truth
