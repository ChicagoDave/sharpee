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

### Logic Location

The `SchedulerService` belongs in **engine** because:
- It's part of the core turn cycle (runs after NPCs, before turn end)
- It's not specific to any game or action
- Stories and stdlib register daemons/fuses, but engine executes them

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

  // The daemon's action - returns semantic events (no raw text!)
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

  // What happens when it triggers - returns semantic events
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

### Language Layer Integration

**Critical**: All events emitted by daemons and fuses use message IDs, not raw English text. The language layer resolves these to prose.

```typescript
// In stdlib: scheduler-messages.ts
export const SchedulerMessages = {
  // Lantern
  LANTERN_DIM: 'scheduler.lantern.dim',
  LANTERN_FLICKERS: 'scheduler.lantern.flickers',
  LANTERN_DIES: 'scheduler.lantern.dies',

  // Candles
  CANDLES_LOW: 'scheduler.candles.low',
  CANDLES_OUT: 'scheduler.candles.out',

  // Ambient
  AMBIENT_FOREST_BIRD: 'scheduler.ambient.forest.bird',
  AMBIENT_FOREST_RUSTLE: 'scheduler.ambient.forest.rustle',
  AMBIENT_FOREST_BRANCH: 'scheduler.ambient.forest.branch',
  AMBIENT_FOREST_BREEZE: 'scheduler.ambient.forest.breeze',

  // Dam
  DAM_DRAINING: 'scheduler.dam.draining',
  DAM_NEARLY_EMPTY: 'scheduler.dam.nearly_empty',
  DAM_EMPTY_TRUNK: 'scheduler.dam.empty_trunk',
} as const;

// In lang-en-us: scheduler-text.ts
export const schedulerText = {
  'scheduler.lantern.dim': () => 'Your lantern is getting dim.',
  'scheduler.lantern.flickers': () => 'Your lantern flickers ominously.',
  'scheduler.lantern.dies': () => 'Your lantern flickers and goes out.',
  'scheduler.candles.low': () => 'The candles are burning low.',
  'scheduler.candles.out': () => 'The candles sputter and go out.',
  'scheduler.ambient.forest.bird': () => 'A bird chirps in the distance.',
  'scheduler.ambient.forest.rustle': () => 'Leaves rustle overhead.',
  'scheduler.dam.empty_trunk': () => 'The last of the water drains away, revealing a trunk in the mud!',
  // ...
};
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
          messageId: SchedulerMessages.LANTERN_DIES
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
          trigger: (ctx) => [{
            type: 'player.died',
            data: { causeId: DeathMessages.VOLCANO }
          }]
        });
        return [{
          type: 'ambient',
          data: { messageId: SchedulerMessages.VOLCANO_VIOLENT }
        }];
      }
    });
    return [{
      type: 'ambient',
      data: { messageId: SchedulerMessages.VOLCANO_RUMBLE }
    }];
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
        SchedulerMessages.AMBIENT_FOREST_BIRD,
        SchedulerMessages.AMBIENT_FOREST_RUSTLE,
        SchedulerMessages.AMBIENT_FOREST_BRANCH,
        SchedulerMessages.AMBIENT_FOREST_BREEZE,
      ];
      return [{
        type: 'ambient',
        data: { messageId: ctx.random.pick(sounds) }
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
            descriptionId: 'room.reservoir.drained'
          });
          ctx.world.updateEntity('trunk', { location: 'reservoir' });
          return [{
            type: 'world.changed',
            data: { messageId: SchedulerMessages.DAM_EMPTY_TRUNK }
          }];
        }
      });
      return [{
        type: 'ambient',
        data: { messageId: SchedulerMessages.DAM_NEARLY_EMPTY }
      }];
    }
  });

  return [{
    type: 'ambient',
    data: { messageId: SchedulerMessages.DAM_DRAINING }
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
      descriptionId: 'object.candles.burned_out'
    });
    return [{
      type: 'object.stateChanged',
      data: { messageId: SchedulerMessages.CANDLES_OUT }
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

**Static registration** (at game start, in stdlib or story):

```typescript
// In story initialization
game.scheduler.registerDaemon(forestAmbienceDaemon);
game.scheduler.registerDaemon(thiefWanderingDaemon);
```

**Dynamic registration** (during play, via event handlers):

```typescript
// In event handler when lantern is lit
eventBus.on('object.lit', (event) => {
  if (event.entityId === 'lantern') {
    game.scheduler.setFuse(lanternBatteryFuse);
  }
});
```

### stdlib vs Story Responsibility

This section clarifies what belongs in reusable packages vs. game-specific code.

#### engine (Core Infrastructure)
- `SchedulerService` implementation
- Turn cycle integration (tick after NPCs)
- Daemon/fuse lifecycle management (add, remove, pause, resume)
- Serialization/deserialization of scheduler state
- `SchedulerContext` type

#### stdlib (Reusable Patterns)
- `Daemon` and `Fuse` interface definitions
- Helper functions for common patterns:
  - `createConsumableFuse(entity, turnsRemaining, onDepleted)` - generic resource consumption
  - `createAmbientDaemon(condition, messages, probability)` - random ambient events
  - `createWarningSequence(stages)` - staged countdown with warnings
- Generic message IDs in `scheduler-messages.ts`:
  - `scheduler.ambient.*` - reusable ambient patterns
  - Generic light source messages (if light sources are stdlib)

#### story (Game-Specific - e.g., Dungeo)
- Specific daemon/fuse instances:
  - Lantern battery fuse (Dungeo has a brass lantern)
  - Candle burning fuse (Dungeo has specific candles)
  - Dam draining sequence (Zork-specific puzzle)
  - Volcano eruption countdown (Zork-specific)
  - Thief wandering daemon (Zork-specific NPC)
- Game-specific message IDs:
  - `dungeo.lantern.dim`, `dungeo.lantern.dies`
  - `dungeo.dam.draining`, `dungeo.dam.empty_trunk`
  - `dungeo.volcano.rumble`, `dungeo.volcano.erupts`
- Forest ambience daemon with Zork-specific flavor text
- Turn counts tuned for game balance (lantern = 350 turns, etc.)

#### lang-en-us (Text Layer)
- Text for stdlib's generic message IDs
- Stories extend with their own message ID → text mappings

**Key Principle**: The engine provides the `SchedulerService`. The stdlib provides the *interfaces* and *helper patterns*. The story provides the *specific timers* with game-appropriate tuning and messages.

**Example**: stdlib might provide `createConsumableFuse()` as a helper, but the story creates the actual lantern fuse with 350 turns and Dungeo-specific messages.

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
// Event emitted with messageId, resolved by language layer
```

## Consequences

### Positive

1. **Classic IF pattern**: Familiar to IF authors
2. **Flexible**: Supports simple countdowns to complex staged events
3. **Testable**: Deterministic with seeded random
4. **Debuggable**: Introspection APIs for visibility
5. **Serializable**: Full save/load support
6. **Decoupled**: Scheduler doesn't know about specific game logic
7. **Localization ready**: All output via message IDs

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

### Phase 1: Core Implementation (engine)
1. `SchedulerService` interface and implementation
2. Basic daemon/fuse management
3. Turn cycle integration
4. Serialization support

### Phase 2: Zork Integration (stdlib + story)
1. `scheduler-messages.ts` in stdlib
2. Lantern battery fuse
3. Candle burning fuse
4. Ambient daemons (forest, underground)
5. Dam draining sequence

### Phase 3: Language Layer (lang-en-us)
1. `scheduler-text.ts` with all message resolutions
2. Extend text service to handle scheduler events

### Phase 4: Polish
1. Debug commands (client layer)
2. Entity-bound auto-cleanup
3. Performance optimization for many timers

## References

- Inform 6 `StartDaemon`, `StopDaemon`, `StartTimer`, `StopTimer`
- TADS Daemon and Fuse classes
- ZIL `QUEUE` and `DEQUEUE` functions
- Zork MDL source (clock.mud)
