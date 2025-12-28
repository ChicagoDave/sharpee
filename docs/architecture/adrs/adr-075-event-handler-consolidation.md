# ADR-075: Event Handler Consolidation

## Status

Proposed

## Context

The entity event handler system currently has two competing dispatch mechanisms with different semantics, inconsistent typing, and undocumented behavior. This was exposed during the troll combat/scoring implementation (see `docs/work/dungeo/events-assessment.md`).

### Current State

**Two Dispatch Mechanisms:**

| Location | Method | Semantics | Used For |
|----------|--------|-----------|----------|
| `EventProcessor.invokeEntityHandlers()` | Target-only | Calls handler only on `event.entities.target` | Action events |
| `GameEngine.dispatchEntityHandlers()` | Broadcast | Iterates ALL entities, calls any matching handler | NPC/scheduler events |

**Problems:**

1. **Undocumented semantics** - No documentation explains when each is used or why
2. **Inconsistent behavior** - Action events notify only target; scheduler events notify everyone
3. **Type safety erosion** - GameEngine uses `(entity as any).on` to access handlers
4. **Two handler signatures** - `EntityEventHandler(event, world)` vs `SimpleEventHandler(event)`

### Event Flow (Current, Undocumented)

```
Player Command
    │
    ▼
┌─────────────────┐
│ CommandExecutor │
│                 │
│ action.execute()│
│       │         │
│       ▼         │
│ EventProcessor  │──────► invokeEntityHandlers(target only)
│ .processEvents()│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   GameEngine    │
│   .executeTurn()│
│       │         │
│       ├─────────┼──────► [Action events - NO dispatch, already done]
│       │         │
│       ▼         │
│   NPC Phase     │──────► dispatchEntityHandlers(broadcast)
│       │         │
│       ▼         │
│ Scheduler Phase │──────► dispatchEntityHandlers(broadcast)
└─────────────────┘
```

## Decision

### 1. Consolidate to Single Dispatch Location

**EventProcessor owns all entity handler dispatch.**

Rationale:
- EventProcessor already has the correct target-only semantics
- EventProcessor is purpose-built for event processing
- GameEngine should orchestrate, not implement event dispatch

Changes:
- Remove `GameEngine.dispatchEntityHandlers()` method entirely
- Route NPC and scheduler events through EventProcessor
- Update GameEngine to call `eventProcessor.processEvents()` for all event sources

### 2. Define Event Dispatch Semantics

**Target-only dispatch with explicit subscription for broadcast.**

An entity's `on` handlers are called when:
1. The entity is the `event.entities.target`, OR
2. The entity explicitly subscribes to that event type globally

```typescript
// Target handler - only called when this entity is the target
troll.on = {
  'if.event.death': (event, world) => { /* I died */ }
};

// Global subscription - called for any death event (future enhancement)
world.subscribe('if.event.death', (event, world) => { /* anyone died */ });
```

For now, implement target-only. Global subscriptions are a future enhancement.

### 3. Add Handler Typing to IFEntity

Make `on` a first-class typed property instead of any-cast addon.

```typescript
// packages/world-model/src/entities/if-entity.ts

import { IEventHandlers } from '../events/types';

export interface IFEntity {
  id: EntityId;
  name: string;
  // ... existing properties

  /**
   * Event handlers for this entity.
   * Called when this entity is the target of an event.
   */
  on?: IEventHandlers;
}
```

Update `IEventHandlers` to use the correct signature:

```typescript
// packages/world-model/src/events/types.ts

export interface IEventHandlers {
  [eventType: string]: EntityEventHandler;
}

export type EntityEventHandler = (
  event: IGameEvent,
  world: WorldModel
) => void | ISemanticEvent[];
```

### 4. Unify Handler Signatures

**Remove `SimpleEventHandler`. All handlers receive `(event, world)`.**

Story-level handlers (via EventEmitter) should also receive world access:

```typescript
// packages/engine/src/events/event-emitter.ts

export class EventEmitter {
  private world: WorldModel;

  constructor(world: WorldModel) {
    this.world = world;
  }

  emit(event: IGameEvent): ISemanticEvent[] {
    for (const handler of handlers) {
      const result = handler(event, this.world);  // Pass world
      // ...
    }
  }
}
```

Update `StoryWithEvents` to pass world to EventEmitter:

```typescript
// packages/engine/src/story.ts

export class StoryWithEvents {
  private eventEmitter: EventEmitter;
  private world?: WorldModel;

  initializeWorld(world: WorldModel): void {
    this.world = world;
    this.eventEmitter = new EventEmitter(world);
  }
}
```

### 5. Document Event Types

Create `docs/architecture/event-catalog.md` listing:

| Event Type | Emitted By | Target | Data |
|------------|------------|--------|------|
| `if.event.death` | attacking action | Killed entity | `{ killedBy }` |
| `if.event.taken` | taking action | Taken item | `{ taker }` |
| `if.event.actor_moved` | going action | Moving actor | `{ from, to, direction }` |
| ... | ... | ... | ... |

## Implementation Plan

### Phase 1: Consolidate Dispatch (Required)

1. Update `GameEngine` to route NPC/scheduler events through `EventProcessor`
2. Remove `GameEngine.dispatchEntityHandlers()` method
3. Update EventProcessor to handle events without targets gracefully

### Phase 2: Add Typing (Required)

4. Add `on?: IEventHandlers` to `IFEntity` interface
5. Remove all `(entity as any).on` casts
6. Fix any type errors in story code

### Phase 3: Unify Signatures (Required)

7. Remove `SimpleEventHandler` type
8. Update `EventEmitter` to accept and pass `WorldModel`
9. Update `StoryWithEvents` to initialize EventEmitter with world

### Phase 4: Document (Required)

10. Create event catalog documentation
11. Add event flow diagram to architecture docs

## Consequences

### Positive

- Single, documented dispatch mechanism
- Type-safe handler registration
- Consistent handler signatures
- Story handlers can access world state
- Easier to reason about event flow

### Negative

- Breaking change for any code using `SimpleEventHandler`
- EventEmitter now requires WorldModel at construction
- Story initialization order matters (world before event registration)

### Migration

Existing entity handlers work unchanged. Story handlers using `SimpleEventHandler` need signature update:

```typescript
// Before
story.on('if.event.death', (event) => { ... });

// After
story.on('if.event.death', (event, world) => { ... });
```

## Alternatives Considered

### Keep Both Dispatch Mechanisms

Document when each is used and live with the inconsistency.

**Rejected**: Confusing for contributors, error-prone, will lead to bugs.

### Broadcast All Events

Call handlers on all entities for every event.

**Rejected**: Performance concern with many entities. Also semantically wrong - most handlers only care about events targeting them.

### Create Separate EventBus

New abstraction layer between events and handlers.

**Rejected**: Over-engineering for current needs. Can revisit if subscription patterns become complex.

## References

- `docs/work/dungeo/events-assessment.md` - Critical assessment that prompted this ADR
- `packages/event-processor/src/processor.ts` - Current EventProcessor implementation
- `packages/engine/src/game-engine.ts` - Current GameEngine dispatch (to be removed)
