# ADR-075: Event Handler Consolidation

## Status

Accepted

## Context

The entity event handler system has diverged from its original design (ADR-052), resulting in two competing dispatch mechanisms, inconsistent typing, and undocumented behavior. This was exposed during troll combat/scoring implementation (see `docs/work/dungeo/events-assessment.md`).

### Original Design (ADR-052)

ADR-052 established the event handler pattern with clear intent:

1. **Entity handlers** defined on `entity.on` for direct reactions
2. **Story handlers** via `Story.on()` for multi-entity logic (daemons)
3. **Actions invoke handlers** directly after emitting events
4. **Handler signature**: `(event) => EventResult | void`

```typescript
// ADR-052's design - actions invoke handlers
function execute(context: ActionContext): SemanticEvent[] {
  // Do the push
  pushable.pushCount++;

  // Entity might have a handler - ACTION calls it
  if (target.on?.pushed) {
    const result = target.on.pushed(event);
  }

  // Emit for story handlers
  context.emit(event);

  return events;
}
```

Key insight from ADR-052:
> "We designed a system that revolves around writing events, but we ignored the need to write code for such events."

### How Implementation Deviated

The actual implementation diverged from ADR-052:

| ADR-052 Design | Actual Implementation |
|----------------|----------------------|
| Actions invoke entity handlers | EventProcessor invokes handlers after event processing |
| Single invocation point | Two invocation points (EventProcessor + GameEngine) |
| Handler gets `(event)` | Handler gets `(event)` initially, then `(event, world)` after fix |
| Story handlers via `Story.on()` | Story handlers via separate EventEmitter class |

**What happened:**

1. **EventProcessor was created** - Instead of actions invoking handlers directly, a centralized EventProcessor was built to process events and invoke handlers on target entities.

2. **GameEngine added duplicate dispatch** - When NPC/scheduler systems were added (ADR-070, ADR-071), GameEngine added its own `dispatchEntityHandlers()` method with different semantics (broadcast to ALL entities, not just target).

3. **World access was missing** - ADR-052's signature `(event) => EventResult` didn't include world access. When troll death handler needed to update score via `world.getCapability()`, we added world parameter, creating type split:
   - `EntityEventHandler = (event, world) => ...`
   - `SimpleEventHandler = (event) => ...` (for EventEmitter compatibility)

4. **Duplicate calls caused bugs** - Both EventProcessor and GameEngine called handlers for the same events, causing troll death to award points 4x.

### Current State (Broken)

```
Player Command
    │
    ▼
┌─────────────────┐
│ CommandExecutor │
│ action.execute()│
│       │         │
│       ▼         │
│ EventProcessor  │──────► invokeEntityHandlers(target only)
│ .processEvents()│        Handler gets (event, world)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   GameEngine    │
│   .executeTurn()│
│       │         │
│       ├─────────┼──────► [Action events - WAS calling dispatch too!]
│       │         │        (Removed in troll fix, but method still exists)
│       ▼         │
│   NPC Phase     │──────► dispatchEntityHandlers(broadcast ALL entities)
│       │         │        Handler gets (event, world)
│       ▼         │
│ Scheduler Phase │──────► dispatchEntityHandlers(broadcast ALL entities)
└─────────────────┘

Story Handlers:
┌─────────────────┐
│ EventEmitter    │──────► SimpleEventHandler(event) - NO world access!
└─────────────────┘
```

**Problems:**

1. Two dispatch mechanisms with different semantics (target-only vs broadcast)
2. Type split between EntityEventHandler and SimpleEventHandler
3. Story handlers can't access world state (defeats purpose of daemons)
4. GameEngine uses `(entity as any).on` - type safety erosion
5. No documentation of which path events take

## Decision

### Return to ADR-052 Principles with Corrections

We consolidate to ADR-052's core design with one correction: **handlers receive world access**.

ADR-052 didn't anticipate handlers needing to modify world state (scoring, unblocking exits, etc.). Adding `world` parameter is the right fix - handlers ARE game logic and need state access.

### 1. Single Dispatch Location

**EventProcessor owns all entity handler dispatch.**

- Remove `GameEngine.dispatchEntityHandlers()` entirely
- Route NPC and scheduler events through EventProcessor
- EventProcessor already has correct target-only semantics per ADR-052

### 2. Unified Handler Signature

**All handlers receive `(event, world)`.** Remove `SimpleEventHandler`.

```typescript
export type EntityEventHandler = (
  event: IGameEvent,
  world: WorldModel
) => void | ISemanticEvent[];
```

Story handlers (daemons) need world access even more than entity handlers - they coordinate multi-entity logic.

### 3. Typed Entity Handlers

Add `on` as first-class typed property on IFEntity:

```typescript
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

Eliminate all `(entity as any).on` casts.

### 4. EventEmitter Gets World

```typescript
export class EventEmitter {
  private world: WorldModel;
  private handlers: Map<string, EntityEventHandler[]> = new Map();

  constructor(world: WorldModel) {
    this.world = world;
  }

  emit(event: IGameEvent): ISemanticEvent[] {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      const result = handler(event, this.world);
      // ...
    }
  }
}
```

### Corrected Event Flow

```
Player Command
    │
    ▼
┌─────────────────┐
│ CommandExecutor │
│ action.execute()│
│       │         │
│       ▼         │
│ EventProcessor  │──────► invokeEntityHandlers(target only)
│ .processEvents()│        Handler gets (event, world)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│   GameEngine.executeTurn()                  │
│       │                                     │
│       ├── Action events: NO dispatch        │
│       │   (already done by EventProcessor)  │
│       │                                     │
│       ├── NPC events ────► EventProcessor   │
│       │                    .processEvents() │
│       │                                     │
│       └── Scheduler events ► EventProcessor │
│                             .processEvents()│
└─────────────────────────────────────────────┘

Story Handlers (daemons):
┌─────────────────┐
│ EventEmitter    │──────► EntityEventHandler(event, world)
│ (with world)    │        Full world access for daemons
└─────────────────┘
```

## Implementation

### Phase 1: Unify Types

1. Remove `SimpleEventHandler` from `world-model/src/events/types.ts`
2. Add `on?: IEventHandlers` to `IFEntity` interface
3. Update `EventEmitter` to require `WorldModel` in constructor
4. Update `StoryWithEvents` to create EventEmitter in `initializeWorld()`

### Phase 2: Consolidate Dispatch

5. Update `GameEngine` to route NPC/scheduler events through `EventProcessor`
6. Remove `GameEngine.dispatchEntityHandlers()` method entirely
7. Ensure EventProcessor handles events without targets gracefully (no-op)

### Phase 3: Document

8. Create event catalog documentation
9. Update this ADR with final event flow diagram

## Consequences

### Positive

- Returns to ADR-052's coherent single-dispatch design
- All handlers have consistent `(event, world)` signature
- Story handlers (daemons) can properly access world state
- Type-safe handler registration
- Single documented event flow

### Negative

- EventEmitter requires WorldModel at construction
- Story must call `initializeWorld()` before registering handlers

## Alternatives Considered

### Keep Both Dispatch Mechanisms

Document when each is used.

**Rejected**: Violates ADR-052 design. Confusing, error-prone.

### Return to ADR-052 Exactly (No World Parameter)

Keep original `(event) => EventResult` signature.

**Rejected**: Handlers need world access for scoring, state changes, multi-entity coordination. This was a gap in ADR-052.

### Actions Invoke Handlers Directly (Pure ADR-052)

Move dispatch back into actions.

**Rejected**: EventProcessor provides clean separation. Actions shouldn't know about handler dispatch - they emit events, processor handles reactions.

## References

- `ADR-052: Event Handlers and Custom Logic` - Original design this consolidation returns to
- `docs/work/dungeo/events-assessment.md` - Critical assessment that prompted this ADR
- `packages/event-processor/src/processor.ts` - EventProcessor (correct implementation)
- `packages/engine/src/game-engine.ts` - GameEngine dispatch (to be removed)
