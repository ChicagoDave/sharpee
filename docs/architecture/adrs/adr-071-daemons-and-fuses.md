# ADR-071: Daemons and Fuses (Timed Events)

## Status

Proposed

## Context

Interactive Fiction has long used two related concepts for time-based behavior:

1. **Daemons**: Processes that run every turn, checking conditions and potentially acting
2. **Fuses**: Countdown timers that trigger once after N turns

These terms come from Infocom's MDL/ZIL and have been adopted by Inform, TADS, and other IF systems.

### Zork Requirements

Mainframe Zork requires several timed mechanisms:

| Mechanism | Type | Behavior |
|-----------|------|----------|
| Lantern battery | Fuse | Dies after ~350 turns of being lit |
| Candles | Fuse | Burn down after ~20 turns |
| Matches | Fuse | Each match burns for ~2 turns |
| Thief appearance | Daemon | Random chance each turn in underground |
| Reservoir draining | Fuse | Takes several turns after dam opened |
| Balloon descent | Daemon | Gradual descent each turn |
| Volcano eruption | Fuse | Warning countdown |
| Forest sounds | Daemon | Random ambient descriptions |

### Design Requirements

1. **Turn-based**: Events trigger on turn boundaries, not real-time
2. **Conditional**: Daemons may check conditions before acting
3. **Pausable**: Fuses can be paused/resumed (lantern off stops drain)
4. **Cancellable**: Fuses can be cancelled before triggering
5. **Stackable**: Multiple daemons/fuses can run simultaneously
6. **Observable**: Current timers should be queryable (for debugging/testing)
7. **Deterministic**: Given same inputs, same behavior (for testing)
8. **Serializable**: Save/load must preserve timer state

### Design Tensions

1. **Engine vs. Story**: Should this be engine-level or stdlib?
2. **Centralized vs. Distributed**: One scheduler or per-entity timers?
3. **Pull vs. Push**: Do timers notify, or does game loop poll?
4. **Entity-bound vs. Free-floating**: Are timers attached to entities?

## Decision

### Core Concepts

**Daemon**: A named function that runs every turn, returning events or nothing.

**Fuse**: A countdown that triggers a function after N turns, then optionally removes itself.

Both are managed by a `SchedulerService` at the engine level.

### Scheduler Service

```typescript
interface SchedulerService {
  // Daemon management
  registerDaemon(daemon: Daemon): void;
  removeDaemon(id: string): void;
  pauseDaemon(id: string): void;
  resumeDaemon(id: string): void;
  hasDaemon(id: string): boolean;

  // Fuse management
  setFuse(fuse: Fuse): void;
  cancelFuse(id: string): void;
  getFuseRemaining(id: string): number | undefined;
  adjustFuse(id: string, delta: number): void;  // Add/subtract turns
  pauseFuse(id: string): void;
  resumeFuse(id: string): void;

  // Lifecycle
  tick(context: SchedulerContext): SchedulerResult;

  // Introspection (for debugging/testing)
  getActiveDaemons(): DaemonInfo[];
  getActiveFuses(): FuseInfo[];

  // Serialization
  getState(): SchedulerState;
  setState(state: SchedulerState): void;
}

interface Daemon {
  id: string;
  name: string;  // Human-readable for debugging

  // Condition for running (optional - if omitted, always runs)
  condition?: (context: SchedulerContext) => boolean;

  // The daemon's action - returns events to emit
  run: (context: SchedulerContext) => SemanticEvent[];

  // Priority for ordering (higher = runs first, default 0)
  priority?: number;

  // If true, daemon removes itself after first successful run
  runOnce?: boolean;
}

interface Fuse {
  id: string;
  name: string;

  // Turns until trigger (counts down each tick)
  turns: number;

  // What happens when it triggers
  trigger: (context: SchedulerContext) => SemanticEvent[];

  // Optional: entity this fuse is bound to (for automatic cleanup)
  entityId?: EntityId;

  // Optional: condition for ticking (if false, turn doesn't count down)
  tickCondition?: (context: SchedulerContext) => boolean;

  // What happens if cancelled before triggering (cleanup)
  onCancel?: (context: SchedulerContext) => SemanticEvent[];

  // Priority for ordering multiple simultaneous triggers
  priority?: number;

  // If true, fuse repeats after triggering
  repeat?: boolean;
}

interface SchedulerContext {
  world: World;
  turn: number;
  random: SeededRandom;
  playerLocation: EntityId;
}

interface SchedulerResult {
  events: SemanticEvent[];
  fusesTriggered: string[];
  daemonsRun: string[];
}
```

### Turn Cycle Integration

The scheduler runs after NPCs, near the end of the turn:

```
1. Player command parsed
2. Player action validated
3. Player action executed
4. Player action reported
5. NPC turn phase (ADR-070)
6. >>> Scheduler tick <<<
   a. Run all active daemons (ordered by priority)
   b. Decrement all active fuses
   c. Trigger any fuses that reached 0
   d. Collect and return all events
7. Turn complete
```

### Common Patterns

#### Pattern 1: Consumable Resource (Lantern)

```typescript
// When lantern is turned on, start the fuse
function onLanternLit(lantern: Entity, scheduler: SchedulerService) {
  const remainingTurns = lantern.traits.battery?.remaining ?? 350;

  scheduler.setFuse({
    id: 'lantern-battery',
    name: 'Lantern Battery',
    turns: remainingTurns,
    entityId: lantern.id,

    // Only tick when lantern is on
    tickCondition: (ctx) => {
      const lamp = ctx.world.getEntity(lantern.id);
      return lamp?.traits.lightSource?.isLit ?? false;
    },

    trigger: (ctx) => {
      // Lantern dies
      const lamp = ctx.world.getEntity(lantern.id);
      ctx.world.updateEntity(lamp.id, {
        traits: {
          ...lamp.traits,
          lightSource: { ...lamp.traits.lightSource, isLit: false, isDead: true }
        }
      });
      return [{
        type: 'object.stateChanged',
        data: {
          entityId: lamp.id,
          description: 'Your lantern flickers and goes out.'
        }
      }];
    }
  });
}

// When lantern is turned off, pause the fuse
function onLanternExtinguished(scheduler: SchedulerService) {
  scheduler.pauseFuse('lantern-battery');
}

// When lantern is turned back on, resume
function onLanternRelit(scheduler: SchedulerService) {
  scheduler.resumeFuse('lantern-battery');
}
```

#### Pattern 2: Warning Countdown

```typescript
// Volcano gives warnings before erupting
scheduler.setFuse({
  id: 'volcano-warning-3',
  name: 'Volcano Warning',
  turns: 10,
  trigger: (ctx) => {
    // Set next warning
    scheduler.setFuse({
      id: 'volcano-warning-2',
      name: 'Volcano Warning 2',
      turns: 5,
      trigger: (ctx) => {
        scheduler.setFuse({
          id: 'volcano-eruption',
          name: 'Volcano Eruption',
          turns: 3,
          trigger: (ctx) => [{ type: 'player.died', data: { cause: 'volcano' } }]
        });
        return [{ type: 'ambient', data: { message: 'The ground shakes violently!' } }];
      }
    });
    return [{ type: 'ambient', data: { message: 'You hear a distant rumbling.' } }];
  }
});
```

#### Pattern 3: Ambient Daemon

```typescript
// Random forest sounds
scheduler.registerDaemon({
  id: 'forest-ambience',
  name: 'Forest Sounds',
  condition: (ctx) => {
    const room = ctx.world.getEntity(ctx.playerLocation);
    return room?.traits.room?.region === 'forest';
  },
  run: (ctx) => {
    if (ctx.random.chance(0.15)) {  // 15% chance
      const sounds = [
        'A bird chirps in the distance.',
        'Leaves rustle overhead.',
        'You hear a branch snap somewhere nearby.',
        'A gentle breeze stirs the trees.'
      ];
      return [{
        type: 'ambient',
        data: { message: ctx.random.pick(sounds) }
      }];
    }
    return [];
  }
});
```

#### Pattern 4: Multi-Stage Process (Dam Draining)

```typescript
// Opening the dam starts a multi-turn draining process
function onDamOpened(scheduler: SchedulerService) {
  // Stage 1: Water starts draining
  scheduler.setFuse({
    id: 'reservoir-drain-1',
    name: 'Reservoir Draining',
    turns: 3,
    trigger: (ctx) => {
      // Stage 2: Water mostly drained
      scheduler.setFuse({
        id: 'reservoir-drain-2',
        name: 'Reservoir Nearly Empty',
        turns: 3,
        trigger: (ctx) => {
          // Stage 3: Fully drained, reveal trunk
          ctx.world.updateEntity('reservoir', {
            description: 'The reservoir is now empty, revealing a muddy bottom.'
          });
          ctx.world.updateEntity('trunk', { location: 'reservoir' });
          return [{
            type: 'world.changed',
            data: { description: 'The last of the water drains away, revealing a trunk in the mud!' }
          }];
        }
      });
      return [{
        type: 'ambient',
        data: { message: 'The water level in the reservoir drops noticeably.' }
      }];
    }
  });

  return [{
    type: 'ambient',
    data: { message: 'Water begins rushing through the open sluice gates.' }
  }];
}
```

#### Pattern 5: Entity-Bound Cleanup

```typescript
// Fuse bound to an entity - auto-cancels if entity is destroyed
scheduler.setFuse({
  id: 'candle-burning',
  name: 'Candle Burning',
  turns: 20,
  entityId: 'candles',  // Bound to candle entity

  tickCondition: (ctx) => {
    const candles = ctx.world.getEntity('candles');
    return candles?.traits.lightSource?.isLit ?? false;
  },

  trigger: (ctx) => {
    const candles = ctx.world.getEntity('candles');
    ctx.world.updateEntity('candles', {
      traits: {
        ...candles.traits,
        lightSource: { ...candles.traits.lightSource, isLit: false, isDead: true }
      },
      name: 'burned-out candles',
      description: 'A pair of candles, burned down to stubs.'
    });
    return [{
      type: 'object.stateChanged',
      data: { description: 'The candles sputter and go out.' }
    }];
  }
});

// When entity is destroyed, fuse is automatically cancelled
```

### Daemon/Fuse Events

The scheduler emits events for key lifecycle moments:

```typescript
type SchedulerEvent =
  | { type: 'daemon.registered'; id: string; name: string }
  | { type: 'daemon.removed'; id: string }
  | { type: 'daemon.paused'; id: string }
  | { type: 'daemon.resumed'; id: string }
  | { type: 'fuse.set'; id: string; name: string; turns: number }
  | { type: 'fuse.triggered'; id: string; name: string }
  | { type: 'fuse.cancelled'; id: string }
  | { type: 'fuse.paused'; id: string }
  | { type: 'fuse.resumed'; id: string };
```

These are primarily for debugging; authors can listen if desired.

### Serialization

Scheduler state must be saved/loaded:

```typescript
interface SchedulerState {
  turn: number;

  daemons: Array<{
    id: string;
    isPaused: boolean;
    // Note: the daemon function itself is registered at game start,
    // we only save runtime state
  }>;

  fuses: Array<{
    id: string;
    turnsRemaining: number;
    isPaused: boolean;
    entityId?: EntityId;
    // Note: trigger function registered at game start
  }>;
}
```

The pattern is:
1. Daemon/fuse definitions registered at game initialization
2. Only runtime state (paused, turns remaining) is serialized
3. On load, state is restored to registered definitions

### Registration Pattern

Daemons and fuses are registered in two ways:

**Static registration** (at game start):

```typescript
// In story initialization
game.scheduler.registerDaemon(forestAmbienceDaemon);
game.scheduler.registerDaemon(thiefWanderingDaemon);
```

**Dynamic registration** (during play):

```typescript
// In event handler when lantern is lit
eventBus.on('object.lit', (event) => {
  if (event.entityId === 'lantern') {
    game.scheduler.setFuse(lanternBatteryFuse);
  }
});
```

### Debug Support

For testing and debugging:

```typescript
// Console commands (in debug mode)
> /daemons
Active daemons:
  - forest-ambience (running)
  - thief-wandering (running)

> /fuses
Active fuses:
  - lantern-battery: 247 turns remaining (running)
  - candle-burning: 15 turns remaining (paused)

> /fuse-adjust lantern-battery -100
Lantern battery: 247 -> 147 turns

> /fuse-trigger lantern-battery
[Manually triggered lantern-battery]
Your lantern flickers and goes out.
```

## Consequences

### Positive

1. **Classic IF pattern**: Familiar to IF authors
2. **Flexible**: Supports simple countdowns to complex staged events
3. **Testable**: Deterministic with seeded random
4. **Debuggable**: Introspection APIs for visibility
5. **Serializable**: Full save/load support
6. **Decoupled**: Scheduler doesn't know about specific game logic

### Negative

1. **Global state**: Scheduler is a singleton service
2. **String IDs**: Potential for ID collisions (mitigated by conventions)
3. **Callback registration**: Functions can't be serialized, only state
4. **Turn-based only**: No sub-turn or real-time events

### Neutral

1. **Engine-level**: Lives in engine, not stdlib
2. **Ordered execution**: Priority determines order, ties resolved by registration order

## Alternatives Considered

### Alternative 1: Entity Components Only

Timers as trait properties (e.g., `battery.turnsRemaining`).

**Rejected because**:
- No central tick mechanism
- Hard to manage non-entity timers (ambient events)
- Scattered logic across traits

### Alternative 2: Event-Driven Timers

Schedule events for future turns directly on event bus.

**Rejected because**:
- Event bus is for immediate events
- Adds complexity to event system
- Harder to pause/cancel/adjust

### Alternative 3: Real-Time Support

Support both turn-based and real-time events.

**Rejected because**:
- IF is turn-based by nature
- Adds complexity for no benefit
- Can be added later if needed

### Alternative 4: Promise-Based

Async/await style scheduling.

**Rejected because**:
- Doesn't fit turn-based model
- Complicates save/load
- Harder to pause/inspect

## Implementation Notes

### Phase 1: Core Implementation
1. `SchedulerService` interface and implementation
2. Basic daemon/fuse management
3. Turn cycle integration
4. Serialization support

### Phase 2: Zork Integration
1. Lantern battery fuse
2. Candle burning fuse
3. Ambient daemons (forest, underground)
4. Dam draining sequence

### Phase 3: Polish
1. Debug commands
2. Entity-bound auto-cleanup
3. Performance optimization for many timers

## References

- Inform 6 `StartDaemon`, `StopDaemon`, `StartTimer`, `StopTimer`
- TADS Daemon and Fuse classes
- ZIL `QUEUE` and `DEQUEUE` functions
- Zork MDL source (clock.mud)
