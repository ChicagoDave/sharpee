# ADR-106: Domain Events and Event Sourcing

## Status
Accepted (January 2026)

## Context

There has been persistent confusion about the nature of `if.event.*` events in Sharpee. The terminology "event" led to assumptions that these were traditional pub/sub events meant to be "fired and handled" - a pattern common in UI frameworks and message queues.

This misunderstanding caused architectural confusion:
- Treating domain events as a subscription mechanism
- Expecting events to trigger handlers in a pub/sub pattern
- Conflating the event sourcing system with the separate event handler mechanism

This ADR clarifies the architecture and establishes correct terminology.

## Decision

### Domain Events Are "Things That Have Already Happened"

**Domain events** record facts about the game world. They describe actions that have **already completed** - past tense, immutable records of what occurred.

```typescript
// Domain events describe completed actions
'if.event.taken'    // The item WAS taken (past tense)
'if.event.opened'   // The container WAS opened
'if.event.pushed'   // The object WAS pushed
'if.event.entered'  // The player HAS entered
```

Domain events are NOT:
- Requests to perform actions
- Messages to be handled
- Notifications to subscribers
- Commands to execute

They ARE:
- Immutable records of completed state changes
- Facts about what happened in the game world
- The source of truth for game history

### Event Sourcing Pattern

Sharpee uses **event sourcing** - a pattern where application state is determined by a sequence of events rather than storing current state directly.

**Traditional state storage:**
```
Database: { player_location: "kitchen", lamp_location: "inventory" }
```

**Event sourcing:**
```
Event Log:
1. if.event.game_started { playerId: "p1", location: "foyer" }
2. if.event.went { direction: "north", destination: "kitchen" }
3. if.event.taken { itemId: "lamp", actorId: "p1" }
```

Benefits of event sourcing:
- **Complete history**: Can replay any point in game
- **Debugging**: See exactly what happened and when
- **Undo/redo**: Replay events to restore previous states
- **Persistence**: Save game by storing event log
- **Analysis**: Examine player behavior patterns

### Three Event Sources

The Engine maintains three separate event sources (logs):

| Event Source | Purpose | Example Events |
|--------------|---------|----------------|
| **game** | Domain events from player actions and world changes | `if.event.taken`, `if.event.opened`, `if.event.went` |
| **debug** | Diagnostic events for development and testing | Parser traces, scope resolution, validation details |
| **platform** | System-level operations | `platform.save_completed`, `platform.quit_confirmed` |

Each source is an append-only log. Events are written during action execution and read at turn end.

### Domain Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        TURN CYCLE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Player Command                                               │
│        ↓                                                         │
│  2. Action Executes (validate → execute → report)                │
│        ↓                                                         │
│  3. report() returns domain events                               │
│        ↓                                                         │
│  4. Events written to EVENT SOURCE (game log)                    │
│        ↓                                                         │
│  5. Event handlers react (optional - separate mechanism)         │
│        ↓                                                         │
│  6. Turn ends                                                    │
│        ↓                                                         │
│  7. Events popped from event source                              │
│        ↓                                                         │
│  8. TEXT SERVICE renders events to player output                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Key points:
- Domain events are **written** to the event source, not "emitted" to handlers
- The text service **reads** events from the source to render output
- Event handlers are a **separate, optional mechanism** (see below)

### Domain Event Structure

Each domain event carries both domain data and rendering data:

```typescript
context.event('if.event.taken', {
  // Rendering data (text service uses these)
  messageId: 'if.action.taken.success',
  params: { item: 'brass lamp' },

  // Domain data (event sourcing record)
  itemId: 'lamp_01',
  actorId: 'player_01',
  previousLocation: 'room_kitchen',
  timestamp: 1706123456789
});
```

The `messageId` and `params` tell the text service how to render the event. The domain data (`itemId`, `actorId`, etc.) is the factual record for event sourcing.

### Event Handlers: A Separate Mechanism

**Event handlers** (ADR-052) are a separate system that lets stories **react** to domain events. They intercept events during processing, before they're written to the event source.

```typescript
// Entity-level: React when THIS entity's event is recorded
lever.on = {
  'if.event.pulled': (event) => {
    // The lever WAS pulled - react to that fact
    secretDoor.open();
  }
};

// Story-level: React to ANY event of this type
world.registerEventHandler('if.event.taken', (event, world) => {
  // Something WAS taken - check if it was a treasure
  if (isTreasure(event.data.itemId)) {
    updateScore(10);
  }
});
```

**Critical distinction:**
- Domain events are **records** of what happened
- Event handlers **react** to those records
- Handlers are optional - domain events work without them
- Handlers run synchronously during event processing

### Terminology Guide

| Term | Meaning | NOT This |
|------|---------|----------|
| Domain Event | Immutable record of a completed action | A message to be handled |
| Event Source | Append-only log of domain events | A pub/sub message queue |
| Event Handler | Code that reacts to domain events | An event subscriber |
| "Emit event" | Write a record to the event source | Fire a notification |

### Why This Matters

Understanding domain events correctly prevents architectural mistakes:

**Wrong mental model (pub/sub):**
```
Action fires event → Handlers receive and process → Something happens
```

**Correct mental model (event sourcing):**
```
Action completes → Fact recorded as domain event → Text service renders
                                                 ↳ Handlers may react
```

The domain event records what **already happened**. It's not asking handlers to make something happen - it's declaring that something **has** happened.

## Consequences

### Positive
- Clear separation between recording facts and reacting to them
- Event sourcing enables save/restore, undo, replay
- Text service has single source of truth for rendering
- Handlers are optional, compositional additions
- Debugging is straightforward - inspect the event log

### Negative
- Terminology shift from common "event-driven" patterns
- Developers must unlearn pub/sub assumptions
- Two concepts (domain events + handlers) instead of one

### Neutral
- Existing handler code continues to work
- No runtime changes required - this is a conceptual clarification

## Related ADRs

- ADR-052: Event Handlers for Custom Logic (the handler mechanism)
- ADR-064: World Events and Action Events (two-layer event system)
- ADR-082: Typed Event System (type-safe event registry)
- ADR-094: Event Chaining (cascading domain events)

## References

- Martin Fowler: [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- Domain-Driven Design: Domain events as "something that happened that domain experts care about"
- CQRS pattern: Separating reads (text service) from writes (action execution)
