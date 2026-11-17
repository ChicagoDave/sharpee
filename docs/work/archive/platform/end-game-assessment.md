# Endgame Trigger Handler: State Machine Assessment

## Current Implementation

The endgame trigger handler (`handlers/endgame-trigger-handler.ts`) is a daemon that polls every turn:

1. **Condition**: Player is in the Crypt
2. **Per-turn logic**: If crypt door is closed AND room is dark, increment counter. Otherwise reset counter to 0.
3. **Atmosphere messages**: Emitted at turn 5 and turn 10
4. **Trigger**: At turn 15, teleport player to Top of Stairs, award score, give sword, start endgame

## Why This Doesn't Fit the State Machine Pattern

The previous migrations (trapdoor, death-penalty, rainbow, reality-altered, victory) all share a key trait: **transitions are triggered by discrete events**. Something happens (player moves, score displayed, player dies, sceptre waved) and the machine reacts.

The endgame handler is fundamentally different — it's a **continuous condition monitor with accumulation and reset**:

1. **Turn counting is stateful accumulation.** The handler must increment a counter each turn while conditions hold. State machines model discrete transitions between named states, not gradual accumulation within a state. Mapping 15 turns to 15 states (or even 3 threshold states) creates artificial structure.

2. **Conditions can break and reset.** If the player turns on the lamp or opens the door at turn 12, the counter resets to 0. This isn't a state transition — it's a reset within the same logical state ("waiting in dark crypt"). A state machine would need explicit "reset" transitions from every counting state back to the initial state, creating a combinatorial explosion.

3. **No triggering event.** There's no `if.event.something` that fires when "the player is still standing in a dark room." The handler must poll. While the state machine runtime supports `ConditionTrigger`, using it to wrap polling logic that increments counters and resets them is just hiding a daemon inside a guard — no declarative benefit.

4. **Side effects during evaluation.** The counter increment and atmosphere messages happen during the daemon's `run()` phase, not as a state transition. Forcing these into state machine effects would require transitions like `turn_4 → turn_5` with a message effect, which is artificial state proliferation for what is logically a single "counting" phase.

## What a State Machine Version Would Look Like

```
States: idle → counting → atmosphere_1 → atmosphere_2 → triggered (terminal)

idle → counting:
  ConditionTrigger: player in crypt, door closed, dark
  Effect: set counter to 1

counting → counting (self-transition):
  ConditionTrigger: still in crypt, door closed, dark, counter < 5
  Effect: increment counter

counting → atmosphere_1:
  ConditionTrigger: counter reaches 5
  Effect: emit darkness message

counting → idle (on any of these):
  ConditionTrigger: player left crypt, OR door opened, OR light on
  Effect: reset counter

... (similar for atmosphere_2 → triggered)
```

This is **more complex and less readable** than the current daemon, with no gain in declarativeness. The "states" are artificial — they don't represent meaningful game states, just counter thresholds.

## Alternative Approaches

### Option A: Leave as Daemon (Recommended)

The daemon pattern is the right tool for continuous condition monitoring with accumulation. It's clear, self-contained, and tested. Not every handler needs to be a state machine.

**Criteria for state machine migration:**
- Handler reacts to discrete events → good fit
- Handler polls conditions with accumulation/reset → keep as daemon

### Option B: Hybrid — Daemon for Counting, State Machine for Trigger

Split the handler into two parts:
- **Daemon**: Handles the turn counting, atmosphere messages, and emits a `dungeo.event.endgame.crypt_ritual_complete` event at turn 15
- **State machine**: Listens for that event and handles the endgame trigger (teleport, score, sword)

This separates the polling concern from the one-time transition, but adds complexity for little benefit since the trigger logic only runs once.

### Option C: Enhanced State Machine with Timer Support

Add a `TimerTrigger` or `AccumulationTrigger` to the state machine plugin that natively supports "fire after N turns while condition holds, reset if condition breaks." This would be a platform enhancement.

```typescript
trigger: {
  type: 'accumulation',
  turnsRequired: 15,
  condition: { type: 'custom', evaluate: ... },
  milestones: [
    { turn: 5, effects: [{ type: 'message', messageId: '...' }] },
    { turn: 10, effects: [{ type: 'message', messageId: '...' }] },
  ],
}
```

This is the most principled solution but requires platform changes for a single use case. Worth revisiting if more turn-counting puzzles emerge.

## The DDD Problem: Daemons as Anonymous Callbacks

The current `Daemon` interface is a bag of callbacks:

```typescript
interface Daemon {
  id: string;
  name: string;
  condition?: (context: SchedulerContext) => boolean;
  run: (context: SchedulerContext) => ISemanticEvent[];
  priority?: number;
  runOnce?: boolean;
}
```

Daemons are created by factory functions (`registerEndgameTriggerHandler`, `registerBatHandler`, etc.) that return plain objects with closures capturing room IDs and state. There's no domain identity — a daemon is just two lambdas stitched together. The scheduler iterates them in a flat for-loop with no concept of what they represent.

This matters because:

1. **No encapsulation.** Daemon state (the crypt turn counter, the bat's cooldown) lives in closures or world state, not in a domain object. You can't inspect, test, or reason about a daemon's internal state.

2. **No lifecycle.** Daemons are fire-and-forget registrations. There's no `pause()`, `reset()`, or `getStatus()` on the daemon itself — those operations go through the scheduler by ID string lookup.

3. **No composition.** Complex behaviors (endgame trigger = location check + darkness check + door check + counter + milestones + trigger) are monolithic `run()` functions. There's no way to compose smaller behaviors.

4. **No testability in isolation.** Testing a daemon means constructing a full `SchedulerContext` with a `WorldModel`. You can't unit test the counting logic separate from the world queries.

### Survey of Existing Daemons

The codebase has ~15 registered daemons. They fall into distinct patterns:

| Pattern | Examples | Characteristics |
|---------|----------|----------------|
| **Condition monitor** | Endgame trigger, bat handler, round room | Poll each turn, accumulate state, react when threshold met |
| **Location reactor** | Royal puzzle entry, exorcism | Check if player is in specific room, react |
| **State watcher** | Reality-altered, victory | Check a flag, emit message (now migrated to state machines) |
| **Ambient** | Forest ambience, sword glow | Emit atmosphere based on location/conditions |
| **Recovery timer** | Troll recovery | Count turns until NPC recovers |

The condition monitors and recovery timers are the ones that genuinely need the daemon pattern. The state watchers and location reactors were better served by state machines (and have been migrated).

## Option D: Domain-Typed Daemon Classes

Rather than one generic `Daemon` interface for everything, introduce typed daemon base classes that encode the common patterns:

```typescript
/**
 * Base class for daemons that own their identity and state.
 * Replaces anonymous { id, condition, run } objects.
 */
abstract class DaemonRunner {
  abstract readonly id: string;
  abstract readonly name: string;
  readonly priority: number = 0;

  /** Override to control when this daemon is active */
  abstract shouldRun(context: SchedulerContext): boolean;

  /** Override to perform the daemon's work */
  abstract execute(context: SchedulerContext): ISemanticEvent[];

  /** Lifecycle hook — called when daemon is first registered */
  onRegistered?(context: { world: WorldModel }): void;

  /** Lifecycle hook — called when daemon is removed */
  onRemoved?(): void;
}
```

Then specialized subclasses for the common patterns:

```typescript
/**
 * A daemon that monitors a condition over multiple turns,
 * accumulates a counter while the condition holds, resets
 * when it breaks, and triggers at a threshold.
 */
abstract class WatchdogDaemon extends DaemonRunner {
  protected turnCount = 0;
  abstract readonly turnsRequired: number;

  /** The condition that must hold each turn */
  abstract conditionHolds(context: SchedulerContext): boolean;

  /** Called when the threshold is reached */
  abstract onThresholdReached(context: SchedulerContext): ISemanticEvent[];

  /** Optional milestone callbacks */
  onMilestone?(turn: number, context: SchedulerContext): ISemanticEvent[];

  /** Optional hook when counter resets */
  onReset?(context: SchedulerContext): void;

  // Base implementation handles the counting pattern
  shouldRun(context: SchedulerContext): boolean {
    return !this.triggered;
  }

  execute(context: SchedulerContext): ISemanticEvent[] {
    if (!this.conditionHolds(context)) {
      if (this.turnCount > 0) {
        this.turnCount = 0;
        this.onReset?.(context);
      }
      return [];
    }

    this.turnCount++;
    const events: ISemanticEvent[] = [];

    // Check milestones
    const milestoneEvents = this.onMilestone?.(this.turnCount, context);
    if (milestoneEvents) events.push(...milestoneEvents);

    // Check threshold
    if (this.turnCount >= this.turnsRequired) {
      this.triggered = true;
      events.push(...this.onThresholdReached(context));
    }

    return events;
  }
}
```

### Endgame Trigger as WatchdogDaemon

```typescript
class CryptRitualDaemon extends WatchdogDaemon {
  readonly id = 'dungeo-endgame-trigger';
  readonly name = 'Endgame Crypt Ritual';
  readonly priority = 50;
  readonly turnsRequired = 15;

  constructor(
    private cryptId: EntityId,
    private topOfStairsId: EntityId
  ) { super(); }

  conditionHolds(context: SchedulerContext): boolean {
    if (context.world.getStateValue('game.endgameStarted')) return false;
    if (context.playerLocation !== this.cryptId) return false;
    if (!this.isCryptDoorClosed(context.world)) return false;
    if (!this.isRoomDark(context.world)) return false;
    return true;
  }

  onMilestone(turn: number, context: SchedulerContext): ISemanticEvent[] {
    if (turn === 5 || turn === 10) {
      return [makeMessage(EndgameTriggerMessages.DARKNESS_DESCENDS, { turn })];
    }
    return [];
  }

  onThresholdReached(context: SchedulerContext): ISemanticEvent[] {
    return this.triggerEndgame(context.world);
  }

  // Private helpers (isCryptDoorClosed, isRoomDark, triggerEndgame)
  // now live as methods on the domain object
}
```

### What This Buys

| Concern | Current (plain Daemon) | DaemonRunner class |
|---------|----------------------|-------------------|
| **Identity** | String ID, anonymous closure | Named class with typed state |
| **State** | Scattered in closures / world metadata | Encapsulated in instance fields |
| **Testability** | Need full SchedulerContext | Can unit test `conditionHolds()` and `onThresholdReached()` independently |
| **Pattern reuse** | Copy-paste counting logic | Inherit from `WatchdogDaemon` |
| **Introspection** | `scheduler.getDaemonInfo(id)` returns { id, name, runCount } | `daemon.turnCount`, `daemon.triggered`, `daemon.turnsRequired` |
| **Lifecycle** | None | `onRegistered()`, `onRemoved()` hooks |

### Other Daemon Subtypes Worth Considering

```typescript
/** Daemon that reacts when player enters a specific room */
abstract class LocationDaemon extends DaemonRunner {
  abstract readonly roomId: EntityId;
  shouldRun(ctx: SchedulerContext) { return ctx.playerLocation === this.roomId; }
}

/** Daemon that counts down N turns then fires (like Fuse, but with daemon flexibility) */
abstract class CountdownDaemon extends DaemonRunner {
  protected turnsRemaining: number;
  constructor(turns: number) { super(); this.turnsRemaining = turns; }
}

/** Daemon that emits ambient messages based on conditions */
abstract class AmbienceDaemon extends DaemonRunner {
  abstract readonly cooldownTurns: number;
  // Manages cooldown between ambient emissions
}
```

### Integration with Scheduler

The scheduler's `Daemon` interface stays as-is for backward compatibility. `DaemonRunner` adapts to it:

```typescript
abstract class DaemonRunner {
  /** Convert to the plain Daemon interface for scheduler registration */
  toDaemon(): Daemon {
    return {
      id: this.id,
      name: this.name,
      priority: this.priority,
      condition: (ctx) => this.shouldRun(ctx),
      run: (ctx) => this.execute(ctx),
    };
  }
}

// Registration:
const ritual = new CryptRitualDaemon(cryptId, topOfStairsId);
scheduler.registerDaemon(ritual.toDaemon());

// Or, if scheduler gains native support:
scheduler.registerRunner(ritual);
```

## Recommendation

**Short term**: Leave the endgame trigger as-is. The daemon pattern is correct for this use case.

**Medium term**: Introduce `DaemonRunner` as an abstract base class in `plugin-scheduler` alongside the existing `Daemon` interface. Migrate the endgame trigger to `WatchdogDaemon` as a proof of concept. This gives daemons proper domain identity without breaking existing registrations.

**Decision criteria for future daemons:**
- Reacts to discrete events → state machine
- Polls with accumulation/reset → `WatchdogDaemon`
- Location-specific polling → `LocationDaemon`
- Ambient/atmosphere → `AmbienceDaemon`
- Simple flag watch → state machine (already migrated)
