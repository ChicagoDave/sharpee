# ADR-075: Event Handler Consolidation

## Status

Accepted (Revised 2025-12-30 - Atomic Transactions)

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

| ADR-052 Design                  | Actual Implementation                                             |
| ------------------------------- | ----------------------------------------------------------------- |
| Actions invoke entity handlers  | EventProcessor invokes handlers after event processing            |
| Single invocation point         | Two invocation points (EventProcessor + GameEngine)               |
| Handler gets `(event)`          | Handler gets `(event)` initially, then `(event, world)` after fix |
| Story handlers via `Story.on()` | Story handlers via separate EventEmitter class                    |

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
6. **Handlers can bypass stdlib** - passing full WorldModel allows direct mutations

### The Gatekeeper Problem

Passing `WorldModel` to handlers violates a key architectural boundary:

**stdlib is the gatekeeper** - Actions in stdlib validate and control all mutations to world state. If handlers receive full world access, they can:

- Mutate state without validation
- Bypass the action pattern (validate/execute/report)
- Create hard-to-trace state changes
- Break invariants that actions maintain

Example of the problem:

```typescript
// Handler bypasses stdlib entirely
on: {
  'combat.death': (event, world) => {
    world.scoring.addPoints(10);  // Direct mutation!
    world.flags.set('troll-dead', true);  // No validation!
  }
}
```

## Decision

### Effects-Based Handler Pattern

Instead of passing world model to handlers, handlers return **effects** that are processed through proper channels. This preserves stdlib as the gatekeeper while giving handlers the expressiveness they need.

### 1. Handler Signature: Query In, Effects Out

```typescript
export type EntityEventHandler = (
  event: IGameEvent,
  query: WorldQuery // Read-only access
) => Effect[];

// Read-only query interface
export interface WorldQuery {
  getEntity(id: EntityId): IFEntity | undefined;
  getPlayer(): IFEntity;
  getCurrentRoom(): IFEntity;
  getScore(): number;
  getFlag(name: string): boolean;
  // No mutation methods!
}
```

Handlers can read state to make decisions, but cannot mutate directly.

### 2. Effect Types

```typescript
export type Effect =
  | { type: 'score'; points: number; reason?: string }
  | { type: 'flag'; name: string; value: boolean }
  | { type: 'message'; id: string; data?: Record<string, unknown> }
  | { type: 'emit'; event: SemanticEvent }
  | { type: 'schedule'; daemon: string; turns: number }
  | { type: 'unblock'; exit: string; room: EntityId };
```

Effects are **intents**, not mutations. They describe what should happen, not how.

### 3. Effect Processor

A new `EffectProcessor` validates and applies effects using **two-phase atomic processing**:

```typescript
export interface EffectResult {
  success: boolean;
  errors: EffectError[];
  applied: Effect[];
}

export interface EffectError {
  effect: Effect;
  reason: string;
}

export class EffectProcessor {
  constructor(private world: WorldModel, private eventProcessor: EventProcessor) {}

  process(effects: Effect[]): EffectResult {
    // Phase 1: Validate ALL effects before applying any
    const errors = this.validateAll(effects);
    if (errors.length > 0) {
      return { success: false, errors, applied: [] };
    }

    // Phase 2: Apply all effects (atomic - all or nothing)
    for (const effect of effects) {
      this.apply(effect);
    }

    return { success: true, errors: [], applied: effects };
  }

  private validateAll(effects: Effect[]): EffectError[] {
    const errors: EffectError[] = [];
    for (const effect of effects) {
      const error = this.validate(effect);
      if (error) errors.push({ effect, reason: error });
    }
    return errors;
  }

  private validate(effect: Effect): string | null {
    switch (effect.type) {
      case 'score':
        if (typeof effect.points !== 'number') return 'points must be a number';
        break;
      case 'flag':
        if (!effect.name) return 'flag name required';
        break;
      case 'unblock':
        if (!this.world.getEntity(effect.room)) return `room ${effect.room} not found`;
        break;
      // ... validation for each effect type
    }
    return null;
  }

  private apply(effect: Effect): void {
    switch (effect.type) {
      case 'score':
        this.world.scoring.addPoints(effect.points);
        break;
      case 'flag':
        this.world.flags.set(effect.name, effect.value);
        break;
      case 'emit':
        this.eventProcessor.processEvents([effect.event]);
        break;
      // ... apply each effect type
    }
  }
}
```

The EffectProcessor is the **only** place effects become mutations. It can validate, log, and ensure consistency.

### Atomicity and Testing Stability

**Effects are atomic transactions.** A handler returns a set of effects that represent a logical unit of work. Either all effects apply, or none do.

**Why atomicity matters:**

1. **Consistency** - Game state remains valid. No "troll died but score didn't update" scenarios.
2. **Debuggability** - When something fails, no partial state to untangle.
3. **Determinism** - Same input → same output, critical for testing and replay.

**Testing requirements:**

Effects must be **stable and deterministic** to enable reliable testing:

```typescript
// Test: Handler produces expected effects
it('should award points when troll dies', () => {
  const event = { type: 'combat.death', target: 'troll' };
  const query = createMockQuery({ trollDead: false });

  const effects = trollDeathHandler(event, query);

  expect(effects).toEqual([
    { type: 'score', points: 10, reason: 'troll' },
    { type: 'flag', name: 'troll-dead', value: true },
    { type: 'message', id: 'troll.death' },
  ]);
});

// Test: EffectProcessor validates before applying
it('should reject invalid effects without applying any', () => {
  const effects = [
    { type: 'score', points: 10 },
    { type: 'unblock', exit: 'north', room: 'nonexistent-room' }, // Invalid!
    { type: 'flag', name: 'something', value: true },
  ];

  const result = processor.process(effects);

  expect(result.success).toBe(false);
  expect(result.applied).toEqual([]); // Nothing applied
  expect(world.scoring.getScore()).toBe(0); // Score unchanged
});
```

**Key invariants for testing:**

| Invariant                   | Enforcement                                    |
| --------------------------- | ---------------------------------------------- |
| Handlers are pure functions | `(event, query) => Effect[]` - no side effects |
| Effects are data, not code  | Plain objects, serializable, comparable        |
| Validation before mutation  | Two-phase processing in EffectProcessor        |
| All-or-nothing application  | Atomic transaction semantics                   |
| Deterministic ordering      | Effects applied in array order                 |

This enables:

- **Unit testing handlers** - Mock query, assert returned effects
- **Integration testing** - Verify EffectProcessor applies correctly
- **Snapshot testing** - Compare effect arrays across runs
- **Replay/debugging** - Log effects, replay to reproduce bugs

### 4. Single Dispatch Location

**EventProcessor owns all handler dispatch.** Remove `GameEngine.dispatchEntityHandlers()`.

```
Player Command
    │
    ▼
┌─────────────────┐
│ CommandExecutor │
│ action.execute()│
│       │         │
│       ▼         │
│ EventProcessor  │──────► invokeEntityHandlers(target)
│ .processEvents()│        Handler gets (event, query)
│       │         │        Handler returns Effect[]
│       ▼         │
│ EffectProcessor │──────► Validated mutations
│ .process()      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│   GameEngine.executeTurn()                  │
│       │                                     │
│       ├── NPC events ────► EventProcessor   │
│       │                                     │
│       └── Scheduler ─────► EventProcessor   │
└─────────────────────────────────────────────┘
```

### 5. Daemons Also Return Effects

Daemons (scheduled tasks) follow the same pattern:

```typescript
export interface Daemon {
  id: string;
  tick(query: WorldQuery): Effect[];
}

// Example: lantern daemon
const lanternDaemon: Daemon = {
  id: 'lantern-fuel',
  tick(query) {
    const lantern = query.getEntity('lantern');
    if (lantern?.traits.lightSource?.fuel <= 0) {
      return [
        { type: 'emit', event: { type: 'lantern.died', target: 'lantern' } },
        { type: 'flag', name: 'in-darkness', value: true },
      ];
    }
    // Fuel decrement is a mutation - must be an effect
    return [{ type: 'fuel', entity: 'lantern', delta: -1 }];
  },
};
```

## Implementation

### Phase 1: Define Effect System

1. Create `Effect` type union in `world-model/src/effects/types.ts`
2. Create `WorldQuery` interface (read-only view of WorldModel)
3. Create `EffectProcessor` class
4. Update `EntityEventHandler` signature to `(event, query) => Effect[]`

### Phase 2: Update Handlers

5. Update troll death handler to return effects
6. Update any other entity handlers to return effects
7. Update EventProcessor to collect and process effects

### Phase 3: Consolidate Dispatch

8. Route NPC/scheduler events through EventProcessor
9. Remove `GameEngine.dispatchEntityHandlers()` entirely
10. Update daemons to return effects

### Phase 4: Remove Dead Code

11. Remove `SimpleEventHandler` type
12. Remove world parameter from handler signatures
13. Update EventEmitter to use new pattern

## Consequences

### Positive

- **stdlib remains gatekeeper** - All mutations flow through validated channels
- **Handlers are pure** - Given event + query, return effects (testable!)
- **Atomic transactions** - Effects validated before any are applied; all-or-nothing
- **Stable for testing** - Deterministic, serializable effects enable unit/snapshot testing
- **Single dispatch** - EventProcessor owns all handler invocation
- **Auditable** - EffectProcessor can log all mutations for debugging/replay
- **Extensible** - New effect types don't require signature changes

### Negative

- More ceremony for simple handlers (must return effects array)
- Effect types must be defined upfront
- Two-phase processing (collect effects, then apply)

### Trade-offs

| Direct World Access         | Effects Pattern               |
| --------------------------- | ----------------------------- |
| Simpler handler code        | More structured               |
| Easy to bypass validation   | Forced through gatekeeper     |
| Hard to test (side effects) | Pure functions (easy to test) |
| Mutations scattered         | Mutations centralized         |

## Alternatives Considered

### Pass Full WorldModel (Original ADR-075)

Give handlers `(event, world)` signature.

**Rejected**: Bypasses stdlib gatekeeper. Handlers can mutate freely without validation.

### Read-Only World + Mutation Callbacks

Pass read-only world plus specific mutation functions.

**Rejected**: Still allows direct mutation, just with indirection. Doesn't solve the gatekeeper problem.

### Keep Both Dispatch Mechanisms

Document when each is used.

**Rejected**: Violates ADR-052 design. Confusing, error-prone.

## References

- `ADR-052: Event Handlers and Custom Logic` - Original design
- `docs/work/dungeo/events-assessment.md` - Critical assessment
- `docs/work/dungeo/event-flow-diagram.md` - Visual sequence diagrams
- `packages/event-processor/src/processor.ts` - EventProcessor
- `packages/engine/src/game-engine.ts` - GameEngine dispatch (to be removed)
