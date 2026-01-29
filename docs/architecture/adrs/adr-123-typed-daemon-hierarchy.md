# ADR-123: Typed Daemon Hierarchy

## Status: ACCEPTED

## Depends On: ADR-071 (Daemons and Fuses), ADR-120 (Engine Plugin Architecture)

## Date: 2026-01-29

## Context

### The Problem

The `Daemon` interface (ADR-071) is a bag of callbacks:

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

Daemons are created by factory functions that return plain objects with closures capturing room IDs and mutable state. A daemon has no domain identity — it's two lambdas stitched together. The scheduler iterates them in a flat for-loop with no concept of what they represent.

The codebase has ~15 registered daemons. Despite superficial variety, they all follow one of a few recurring patterns, but each reimplements the pattern from scratch.

### The Patterns

A survey of existing daemons reveals five distinct types:

| Type | Behavior | Examples |
|------|----------|---------|
| **Watchdog** | Monitor a condition over N turns, reset if condition breaks, fire at threshold | Endgame crypt trigger (15 turns in dark), troll recovery |
| **Location reactor** | React when player is in a specific room | Royal puzzle entry, exorcism ritual |
| **Ambient** | Emit atmosphere messages with cooldown | Forest ambience, sword glow |
| **Countdown** | Tick down N turns then fire (like a Fuse but with daemon flexibility) | Balloon burn timer |
| **State watcher** | Poll a flag, react when set | Reality-altered, victory *(now migrated to state machines)* |

State watchers have already been migrated to state machines (ADR-119). The remaining four types are genuinely turn-based and belong in the scheduler, but they share no code or structure.

### What's Wrong Today

1. **No encapsulation.** Daemon state (crypt turn counter, bat cooldown, troll recovery timer) lives in closures or world metadata, not in a domain object. You can't inspect, test, or reason about a daemon's internal state.

2. **No lifecycle.** Daemons are fire-and-forget registrations. There's no `pause()`, `reset()`, or `getStatus()` on the daemon itself — those operations go through the scheduler by string ID lookup.

3. **No composition.** Complex behaviors (endgame trigger = location check + darkness check + door check + counter + milestones + trigger) are monolithic `run()` functions. There's no way to compose smaller behaviors.

4. **No testability in isolation.** Testing a daemon means constructing a full `SchedulerContext` with a `WorldModel`. You can't unit test the counting logic separate from the world queries.

5. **Pattern duplication.** The "count turns while condition holds, reset if broken" pattern is implemented independently in endgame trigger, troll recovery, and bat handler. Each has subtle differences in how it manages its counter.

### Design Principles

- **Daemons are domain objects**, not anonymous callbacks. A `CryptRitualDaemon` is a thing with identity, state, and behavior.
- **Common patterns belong in base classes**, not copy-pasted into each daemon.
- **The scheduler doesn't change.** The `Daemon` interface remains as-is. Typed daemons adapt to it via `toDaemon()`.
- **Opt-in, not mandatory.** Plain `Daemon` objects continue to work. Authors choose typed daemons when the pattern fits.

## Decision

### DaemonRunner Base Class

Introduce an abstract base class that gives daemons proper identity, encapsulated state, and lifecycle:

```typescript
/**
 * Base class for daemons that own their identity and state.
 * Subclass this instead of creating plain { id, condition, run } objects.
 */
abstract class DaemonRunner {
  abstract readonly id: string;
  abstract readonly name: string;
  readonly priority: number = 0;

  /** Override to control when this daemon is active */
  abstract shouldRun(context: SchedulerContext): boolean;

  /** Override to perform the daemon's work */
  abstract execute(context: SchedulerContext): ISemanticEvent[];

  /** Lifecycle: called when daemon is registered with the scheduler */
  onRegistered?(context: { world: WorldModel }): void;

  /** Lifecycle: called when daemon is removed from the scheduler */
  onRemoved?(): void;

  /** Adapt to the plain Daemon interface for scheduler registration */
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
```

### WatchdogDaemon

For daemons that monitor a sustained condition over multiple turns. Named after the watchdog timer pattern: watch a condition, count while it holds, reset when it breaks, fire at threshold.

```typescript
abstract class WatchdogDaemon extends DaemonRunner {
  protected turnCount = 0;
  protected triggered = false;

  /** How many consecutive turns the condition must hold */
  abstract readonly turnsRequired: number;

  /** The condition that must hold each turn */
  abstract conditionHolds(context: SchedulerContext): boolean;

  /** Called when turnsRequired consecutive turns have passed */
  abstract onThresholdReached(context: SchedulerContext): ISemanticEvent[];

  /** Optional: called at specific turn counts during accumulation */
  onMilestone?(turn: number, context: SchedulerContext): ISemanticEvent[];

  /** Optional: called when the counter resets (condition broke) */
  onReset?(context: SchedulerContext): void;

  shouldRun(_context: SchedulerContext): boolean {
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

    const milestoneEvents = this.onMilestone?.(this.turnCount, context);
    if (milestoneEvents) events.push(...milestoneEvents);

    if (this.turnCount >= this.turnsRequired) {
      this.triggered = true;
      events.push(...this.onThresholdReached(context));
    }

    return events;
  }
}
```

**Use cases:**
- Endgame crypt ritual (15 turns in dark with door closed)
- Troll recovery (N turns after knockout)
- Any "wait N turns while X is true" puzzle

### LocationDaemon

For daemons that only run when the player is in a specific room:

```typescript
abstract class LocationDaemon extends DaemonRunner {
  abstract readonly roomIds: EntityId[];

  shouldRun(context: SchedulerContext): boolean {
    return this.roomIds.includes(context.playerLocation);
  }
}
```

**Use cases:**
- Royal puzzle entry detection
- Exorcism ritual (bell/book/candle in Entry to Hades)
- Room-specific ambient effects

### AmbienceDaemon

For daemons that emit atmospheric messages with cooldown between emissions:

```typescript
abstract class AmbienceDaemon extends DaemonRunner {
  protected turnsSinceLastEmission = 0;

  /** Minimum turns between ambient emissions */
  abstract readonly cooldownTurns: number;

  /** Whether conditions are right for ambient emission this turn */
  abstract shouldEmit(context: SchedulerContext): boolean;

  /** Generate the ambient message(s) */
  abstract emitAmbience(context: SchedulerContext): ISemanticEvent[];

  shouldRun(_context: SchedulerContext): boolean {
    return true; // Always tick to manage cooldown
  }

  execute(context: SchedulerContext): ISemanticEvent[] {
    this.turnsSinceLastEmission++;

    if (this.turnsSinceLastEmission < this.cooldownTurns) return [];
    if (!this.shouldEmit(context)) return [];

    this.turnsSinceLastEmission = 0;
    return this.emitAmbience(context);
  }
}
```

**Use cases:**
- Forest ambience (bird songs, rustling)
- Sword glow (proximity to danger)

### CountdownDaemon

For daemons that fire after a fixed number of turns (like a Fuse, but with the full daemon lifecycle and the ability to pause/resume/inspect):

```typescript
abstract class CountdownDaemon extends DaemonRunner {
  protected turnsRemaining: number;

  constructor(turns: number) {
    super();
    this.turnsRemaining = turns;
  }

  /** Called when countdown reaches zero */
  abstract onCountdownComplete(context: SchedulerContext): ISemanticEvent[];

  /** Optional: condition that must hold for the countdown to tick */
  tickCondition?(context: SchedulerContext): boolean;

  shouldRun(_context: SchedulerContext): boolean {
    return this.turnsRemaining > 0;
  }

  execute(context: SchedulerContext): ISemanticEvent[] {
    if (this.tickCondition && !this.tickCondition(context)) return [];

    this.turnsRemaining--;
    if (this.turnsRemaining <= 0) {
      return this.onCountdownComplete(context);
    }
    return [];
  }
}
```

**Use cases:**
- Balloon burn timer
- Any delayed effect that needs more flexibility than a Fuse

## Example: CryptRitualDaemon

The endgame trigger handler rewritten as a `WatchdogDaemon`:

```typescript
class CryptRitualDaemon extends WatchdogDaemon {
  readonly id = 'dungeo-endgame-trigger';
  readonly name = 'Endgame Crypt Ritual';
  readonly priority = 50;
  readonly turnsRequired = 15;

  constructor(
    private cryptId: EntityId,
    private topOfStairsId: EntityId
  ) {
    super();
  }

  conditionHolds(context: SchedulerContext): boolean {
    if (context.world.getStateValue('game.endgameStarted')) return false;
    if (context.playerLocation !== this.cryptId) return false;
    if (!this.isCryptDoorClosed(context.world)) return false;
    if (!this.isRoomDark(context.world)) return false;
    return true;
  }

  onMilestone(turn: number, _context: SchedulerContext): ISemanticEvent[] {
    if (turn === 5 || turn === 10) {
      return [makeMessage(EndgameTriggerMessages.DARKNESS_DESCENDS, { turn })];
    }
    return [];
  }

  onThresholdReached(context: SchedulerContext): ISemanticEvent[] {
    return this.triggerEndgame(context.world);
  }

  // Domain-specific helpers live on the object
  private isCryptDoorClosed(world: WorldModel): boolean { /* ... */ }
  private isRoomDark(world: WorldModel): boolean { /* ... */ }
  private triggerEndgame(world: WorldModel): ISemanticEvent[] { /* ... */ }
}
```

**Registration:**

```typescript
const ritual = new CryptRitualDaemon(cryptId, topOfStairsId);
scheduler.registerDaemon(ritual.toDaemon());
```

## Integration with Scheduler

The scheduler's `Daemon` interface and `SchedulerService.tick()` loop remain unchanged. Typed daemons adapt via `toDaemon()`. This is purely additive — no existing code breaks.

If native support is desired later, the scheduler can gain a `registerRunner(runner: DaemonRunner)` method that calls `toDaemon()` internally and retains a reference to the runner for introspection.

## Decision Matrix: State Machine vs Daemon Type

When implementing a new turn-cycle behavior, use this decision tree:

```
Does the behavior react to a discrete event?
├── YES → State Machine (ADR-119)
│   Examples: player dies, score displayed, item placed, player enters room (one-time)
│
└── NO → It polls or ticks each turn
    │
    ├── Must a condition hold for N consecutive turns?
    │   └── YES → WatchdogDaemon
    │       Examples: crypt darkness ritual, troll recovery
    │
    ├── Does it fire after a fixed number of turns?
    │   └── YES → CountdownDaemon (or Fuse if simpler)
    │       Examples: balloon burn, delayed collapse
    │
    ├── Does it only matter in specific rooms?
    │   └── YES → LocationDaemon
    │       Examples: puzzle entry detection, room-specific reactions
    │
    ├── Does it emit atmosphere with cooldown?
    │   └── YES → AmbienceDaemon
    │       Examples: forest sounds, sword glow
    │
    └── None of the above → plain DaemonRunner
        Examples: custom per-turn logic that doesn't fit a pattern
```

## Consequences

### Positive

- **Domain identity.** Each daemon is a named class with encapsulated state. `CryptRitualDaemon` communicates intent better than `registerEndgameTriggerHandler`.
- **Pattern reuse.** The counting/reset/milestone pattern is implemented once in `WatchdogDaemon`. New watchdog behaviors only implement the condition and threshold.
- **Testability.** `conditionHolds()`, `onThresholdReached()`, and `onMilestone()` can be unit tested independently. Mock only what the method needs, not the full scheduler context.
- **Introspection.** `daemon.turnCount`, `daemon.triggered`, `daemon.turnsRemaining` are inspectable properties. GDT and debugging tools can query daemon state directly.
- **Clear vocabulary.** The type hierarchy documents the patterns. New authors read the class names and understand the taxonomy of turn-cycle behaviors.

### Negative

- **Class hierarchy.** Introduces inheritance where composition might sometimes be preferred. Mitigated by keeping the hierarchy shallow (one level of specialization).
- **Two ways to create daemons.** Plain `Daemon` objects coexist with `DaemonRunner` subclasses. Could cause confusion about which to use. Mitigated by the decision matrix above.
- **Serialization.** Class instances don't serialize as naturally as plain objects. The `toDaemon()` adapter means the scheduler still stores plain `DaemonState`, but runner-specific state (turn counters) needs separate serialization hooks if save/load is required.

### Neutral

- No changes to `SchedulerService`, `SchedulerPlugin`, or the `Daemon` interface.
- Existing plain `Daemon` registrations continue to work unchanged.
- Migration is incremental — convert daemons one at a time as they're touched.

## Implementation Plan

### Phase 1: Base Classes
Add `DaemonRunner`, `WatchdogDaemon`, `LocationDaemon`, `AmbienceDaemon`, and `CountdownDaemon` to `packages/plugin-scheduler/src/`. Export from package index.

### Phase 2: Proof of Concept
Migrate the endgame crypt trigger to `CryptRitualDaemon extends WatchdogDaemon`. Verify all tests pass.

### Phase 3: Incremental Migration
Migrate remaining daemons as they're touched during Dungeo development:
- Troll recovery → `WatchdogDaemon`
- Bat handler → `WatchdogDaemon` or `LocationDaemon`
- Forest ambience → `AmbienceDaemon`
- Sword glow → `AmbienceDaemon`
- Royal puzzle entry → `LocationDaemon`
- Exorcism → `LocationDaemon`

### Phase 4: Optional Scheduler Enhancement
Add `registerRunner(runner: DaemonRunner)` to `ISchedulerService` for native support and introspection without the `toDaemon()` adapter.

## References

- ADR-071: Daemons and Fuses (original daemon/fuse design)
- ADR-119: State Machines (declarative event-driven transitions)
- ADR-120: Engine Plugin Architecture (plugin lifecycle patterns)
- `docs/work/platform/end-game-assessment.md` (analysis that motivated this ADR)
