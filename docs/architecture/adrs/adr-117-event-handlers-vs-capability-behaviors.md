# ADR-117: Eliminate Broad Use of Event Handlers

## Status: ACCEPTED

## Date: 2026-01-26

## Context

### The Problem

Project Dungeo has accumulated ~30 event handlers in `stories/dungeo/src/handlers/`. These handlers:

1. Listen for Domain Events (e.g., `if.event.entered`, `if.event.put_in`)
2. Check conditions on entities
3. Mutate world state based on those conditions

Example from `boat-puncture-handler.ts`:
```typescript
world.registerEventHandler('if.event.entered', (event, world) => {
  // Check if entering inflated boat with sharp object
  if (isInflatedBoat(target) && actorHasSharpObject(actor)) {
    // Mutate: puncture the boat
    (boat as any).isInflated = false;
    // Update description, remove traits, etc.
  }
});
```

### Problems with Handlers

| Problem | Description |
|---------|-------------|
| **No categorization** | All handlers look the same |
| **No introspection** | Can't list what handlers exist or what they do |
| **No lifecycle** | Handlers can't be disabled, prioritized, or replaced |
| **Scattered logic** | Entity behavior lives in separate handler files |
| **Checkpoint issues** | Handler closures don't persist; trait state does |
| **Unclear ownership** | Who "owns" this logic - the entity or the handler? |

### The Key Question

We asked: **If we migrate entity-specific handlers to behaviors, what's left?**

The remaining handlers fell into clear categories:
- Scoring (tracks treasure collection)
- Achievements (tracks milestones)
- Analytics (player behavior)
- Hints (watches for struggling)

These share characteristics:
- **Cross-cutting** - not tied to one entity
- **Observable** - react to events, don't block them
- **Optional** - game works without them
- **Replaceable** - could swap scoring systems
- **Additive** - enhance, don't define core gameplay

**Realization: These aren't "handlers" - they're Extensions.**

### Can We Eliminate Handlers Entirely?

We examined edge cases:

| Case | Resolution |
|------|------------|
| Entity-specific reactions | Behavior (entity participates in action) |
| Cascading state changes | Behavior handles full chain |
| NPC reacts to action they're not involved in | NPC Turn Phase (scheduler) |
| Cross-cutting observation | Extension |
| Time-based events | Daemon/Fuse (scheduler) |

**The hardest case: NPC awareness**

When player takes treasure, the thief (who isn't the target of TAKE) notices and decides to follow.

This fits the existing NPC turn system:
```
1. Player takes treasure
2. TreasureTrait behavior executes, emits if.event.taken
3. Player turn ends
4. NPC turn phase begins (scheduler)
5. Thief's NPC behavior checks recent events, decides to follow
```

NPC reactions happen in the **NPC turn phase**, not handlers.

## Decision

### New Architecture Model

```
┌─────────────────────────────────────────────────────────┐
│                       Story                             │
├─────────────────────────────────────────────────────────┤
│  Actions              │  Traits + Behaviors             │
│  (verbs)              │  (entity-specific logic)        │
│                       │                                 │
│  "what can you do"    │  "how entities participate"     │
│                       │  MUTATES WORLD STATE            │
├─────────────────────────────────────────────────────────┤
│  Scheduler (Daemons/Fuses)  │  NPC Turn Phase           │
│  (time-based events)        │  (NPC reactions/decisions)│
│  MUTATES WORLD STATE        │  MUTATES WORLD STATE      │
├─────────────────────────────────────────────────────────┤
│                     Extensions                          │
│              (cross-cutting observers)                  │
│                                                         │
│  scoring, achievements, analytics, hints, transcripts   │
│  READ-ONLY on world state, own state only               │
└─────────────────────────────────────────────────────────┘
```

### Core Principle: Who Mutates World State?

| Component | Can Mutate World State? | Notes |
|-----------|------------------------|-------|
| **Actions** | Yes | Via execute phase |
| **Traits + Behaviors** | Yes | Entity-specific mutations |
| **Daemons/Fuses** | Yes | Time-based state changes |
| **NPC Turn Phase** | Yes | NPCs take actions |
| **Extensions** | **No** | Read-only observers; maintain own state |

**Extensions can maintain their own state** (scores, achievements, analytics) but cannot mutate world state (entity positions, trait values, room connections).

If something needs to mutate world state in reaction to an event, it must be:
- A behavior (entity-specific)
- An NPC taking an action on their turn
- A daemon/fuse (scheduled)

### When to Use Each Pattern

#### Capability Behaviors (Traits)

Use when:
- Entity customizes how an action works for itself
- Logic should be able to block the action
- The entity "owns" this logic
- State mutation is needed

Examples:
- Boat puncture when entering with sharp object → `BoatTrait` + `BoatEnteringBehavior`
- Basket moves when lowered → `BasketElevatorTrait` + `BasketLoweringBehavior`
- Glacier melts when torch thrown → `GlacierTrait` + `GlacierThrowingBehavior`

#### Extensions

Use when:
- Cross-cutting concern spanning multiple entities
- Purely observational (no world state mutation needed)
- Optional/replaceable feature
- Tracking/analytics

Examples:
- `ScoringExtension` - observes treasure events, tracks score
- `AchievementExtension` - observes milestones, awards achievements
- `AnalyticsExtension` - tracks player behavior patterns
- `HintExtension` - watches for player struggling, offers hints
- `TranscriptExtension` - logs events for replay/debugging

#### NPC Turn Phase (Scheduler)

Use when:
- NPC needs to react to events they weren't directly involved in
- NPC makes decisions based on world state
- NPC takes actions in response to player actions

Examples:
- Thief notices player took treasure → follows player
- Guard hears combat → investigates
- Creature is startled by noise → flees

#### Daemons/Fuses (Scheduler)

Use when:
- Time-based events
- Countdown mechanics
- Periodic checks

Examples:
- Lantern fuel depleting
- Candles burning down
- Thief wandering

### Handler Migration Strategy

For each existing handler, classify:

```
┌─────────────────────────────────────────────────────────────┐
│ Does this logic belong to a specific entity?                │
├─────────────────────────────────────────────────────────────┤
│ YES → Capability Behavior                                   │
│       Entity participates in action via trait + behavior    │
├─────────────────────────────────────────────────────────────┤
│ NO  → Does it need to mutate world state?                   │
│       ├─ YES → Is it time-based?                            │
│       │        ├─ YES → Daemon/Fuse                         │
│       │        └─ NO  → NPC Turn Phase (if NPC reaction)    │
│       │                 or reconsider - maybe it IS entity  │
│       │                 specific after all                  │
│       └─ NO  → Extension (read-only observer)               │
└─────────────────────────────────────────────────────────────┘
```

### Handler Classification for Dungeo

#### Should Become Capability Behaviors

| Handler | Entity | Capability | Rationale |
|---------|--------|------------|-----------|
| `boat-puncture-handler` | Boat | `entering` | Boat owns puncture logic |
| `balloon-handler` | Receptacle | `putting` | Receptacle owns inflation logic |
| `glacier-handler` | Glacier | `throwing` | Glacier owns melting logic |
| `round-room-handler` | Round Room | `going` | Room owns spinning logic |
| `tiny-room-handler` | Door/Key/Mat | Various | Puzzle entities own state |
| `exorcism-handler` | Bell/Book/Candles | Various | Items own ritual participation |
| `dam-handler` | Dam buttons | `pushing` | Buttons own dam state |

#### Should Become Extensions

| Handler | Extension | Rationale |
|---------|-----------|-----------|
| `scoring-handler` | `ScoringExtension` | Cross-cutting, read-only observation |
| `turn-counter` | Part of engine | Already exists |

#### Already Correct (Daemons/Fuses)

| Handler | Type | Rationale |
|---------|------|-----------|
| `lantern-daemon` | Daemon | Time-based fuel depletion |
| `candle-fuse` | Fuse | Time-based burn countdown |
| `thief-daemon` | Daemon | Periodic NPC behavior |

### Deprecation Caveat

**We will not deprecate the handler system yet.**

The handler registration API (`world.registerEventHandler()`) will remain available. However:

1. **New code should not use handlers** for the patterns described above
2. **Existing handlers should be migrated** to behaviors/extensions during the `(entity as any)` cleanup
3. **After implementing 5-10 stories**, we will revisit whether handlers can be fully deprecated

If edge cases emerge that truly don't fit behaviors, extensions, or the scheduler, we'll document them and reconsider. The goal is to validate this model through practical experience before making breaking changes.

## Implementation

### Phase 1: Complete Trait Migration (Current)

Finish `(entity as any)` → Trait migration:
- [x] TreasureTrait
- [x] InflatableTrait
- [ ] BurnableTrait
- [ ] RiverRoomTrait
- [ ] etc.

### Phase 2: Handler → Behavior Migration

For each handler in "Should Become Capability Behaviors":
1. Create/extend trait with capability declaration
2. Create behavior implementing 4-phase pattern
3. Register behavior in story's `initializeWorld()`
4. Delete handler file
5. Verify with walkthrough tests

### Phase 3: Extension System

Define extension interface:
```typescript
interface Extension {
  id: string;
  name: string;
  description: string;

  /** Called when extension is registered */
  initialize(world: IWorldModel): void;

  /** Event types this extension observes */
  observes: string[];

  /** Called for each observed event - READ ONLY */
  onEvent(event: ISemanticEvent, world: IWorldModel): void;

  /** Extension's own state (scores, achievements, etc.) */
  getState(): Record<string, unknown>;
}
```

Migrate scoring handler to `ScoringExtension`.

### Phase 4: Documentation & Validation

- Update CLAUDE.md with new patterns
- Document in stdlib reference
- Validate model holds for 5-10 stories
- Revisit handler deprecation

## Consequences

### Positive

- **Clear ownership**: Entity logic lives with entity
- **Predictable mutations**: Only behaviors/scheduler mutate world
- **Checkpoint safe**: Trait state persists, closures don't
- **Testable**: Behaviors and extensions can be unit tested
- **Extensible**: Third parties add extensions, not handlers
- **Debuggable**: "Why did X change?" → check entity's behaviors

### Negative

- **More structure**: Authors learn behaviors vs extensions vs scheduler
- **Migration effort**: Existing handlers need refactoring
- **Validation period**: Won't deprecate until proven across stories

### Neutral

- **Handler count**: ~30 handlers → ~0 handlers + behaviors + extensions
- **Total code**: Similar amount, better organized

## Extension Interface (Draft)

```typescript
/**
 * Extensions are cross-cutting observers that react to game events
 * without mutating world state. They maintain their own state
 * (scores, achievements, analytics) separate from the world.
 */
interface Extension {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** What this extension does */
  description: string;

  /** Event types to observe (empty = all events) */
  observes?: string[];

  /**
   * Called when extension is registered.
   * Can read world state to initialize.
   */
  initialize(world: IWorldModel): void;

  /**
   * Called for each observed event.
   * MUST NOT mutate world state.
   * Can update extension's own state.
   */
  onEvent(event: ISemanticEvent, world: IWorldModel): void;

  /**
   * Get extension's current state for serialization.
   * This state is saved/restored with checkpoints.
   */
  getState(): Record<string, unknown>;

  /**
   * Restore extension state from checkpoint.
   */
  setState(state: Record<string, unknown>): void;
}

/**
 * Extension registry for managing extensions.
 */
interface ExtensionRegistry {
  register(extension: Extension): void;
  unregister(id: string): void;

  /** Get all registered extensions */
  getAll(): Extension[];

  /** Get extension by ID */
  get(id: string): Extension | undefined;

  /** Dispatch event to all observing extensions */
  dispatch(event: ISemanticEvent, world: IWorldModel): void;

  /** Get combined state of all extensions (for checkpoints) */
  getState(): Record<string, Record<string, unknown>>;

  /** Restore all extension states from checkpoint */
  setState(state: Record<string, Record<string, unknown>>): void;
}
```

### Example: Scoring Extension

```typescript
const scoringExtension: Extension = {
  id: 'dungeo.extension.scoring',
  name: 'Scoring',
  description: 'Tracks treasure collection and calculates score',

  observes: ['if.event.taken', 'if.event.put_in'],

  // Extension's own state
  private score: number = 0;
  private collectedTreasures: Set<string> = new Set();

  initialize(world: IWorldModel): void {
    // Could scan for already-collected treasures on load
  },

  onEvent(event: ISemanticEvent, world: IWorldModel): void {
    if (event.type === 'if.event.taken') {
      const entityId = event.data?.entityId;
      const entity = world.getEntity(entityId);
      const treasure = entity?.get(TreasureTrait);

      if (treasure && !this.collectedTreasures.has(treasure.treasureId)) {
        this.score += treasure.treasureValue;
        this.collectedTreasures.add(treasure.treasureId);
      }
    }

    if (event.type === 'if.event.put_in') {
      // Check if putting treasure in trophy case
      // Award trophyCaseValue points
    }
  },

  getState(): Record<string, unknown> {
    return {
      score: this.score,
      collectedTreasures: Array.from(this.collectedTreasures)
    };
  },

  setState(state: Record<string, unknown>): void {
    this.score = state.score as number ?? 0;
    this.collectedTreasures = new Set(state.collectedTreasures as string[] ?? []);
  }
};
```

## Summary

| Before | After |
|--------|-------|
| Handlers everywhere | Behaviors for entity logic |
| Unclear mutation sources | Only behaviors/scheduler mutate |
| Logic scattered in handler files | Logic co-located with entities |
| Hard to test | Behaviors and extensions testable |
| Checkpoint issues | Trait state persists correctly |

**The handler system remains available** but should not be used for new code. After validating this model across multiple stories, we'll revisit full deprecation.

## References

- ADR-090: Entity-Centric Action Dispatch via Trait Capabilities
- ADR-052: Event Handlers for Custom Logic (superseded by this ADR)
- ADR-071: Daemons and Fuses
- `docs/work/platform/as-any.md`: Trait migration tracking
- `docs/work/dungeo/handler-to-behavior-migration.md`: Migration plan
- `docs/work/platform/handler-options.md`: Analysis of handler architecture options
