# ADR-119: State Machines for Puzzles and Narratives

## Status: PROPOSED

## Depends On: ADR-120 (Engine Plugin Architecture)

## Date: 2026-01-27

## Context

### The Problem

Multi-step puzzles and narrative arcs require coordinating state across multiple player actions. Today this is done with hand-coded "orchestration" modules — utility files that export mutation functions called by story actions. Examples:

- **Tiny Room puzzle**: 4 actions (PUT MAT, PUSH KEY, PULL MAT, UNLOCK) sharing door state via `tiny-room-handler.ts`
- **Basket elevator**: 2 actions (RAISE, LOWER) sharing position state via `basket-handler.ts`
- **Ghost ritual**: DROP action checking multi-condition state (location + item + incense)

Each puzzle reinvents:
- State storage (trait properties, world state values, or both)
- Guard conditions (is the puzzle in the right state for this action?)
- Transitions (what state changes when this action succeeds?)
- Message selection (which message fits the current state?)

There is no shared vocabulary or runtime support. Authors write bespoke code per puzzle.

### The Insight

These are all **finite state machines**. The tiny room puzzle:

```
                    PUT MAT           PUSH KEY           PULL MAT          UNLOCK
[initial] ──────> [mat_placed] ──────> [key_on_mat] ──────> [key_in_hand] ──────> [door_open]
                                  │
                                  │ (no mat)
                                  ▼
                              [key_lost]
```

Each arrow is a **transition** triggered by a player action, guarded by preconditions, producing state mutations and messages.

### Prior Art

| System | Pattern | Notes |
|--------|---------|-------|
| AWS Step Functions | State machine orchestration | States, transitions, guards, input/output per step |
| Inform 7 Scenes | Named narrative phases with begin/end conditions | Declarative, condition-polling — see detailed comparison below |
| Ink (Inkle) | Knots/stitches with diversions | Narrative flow as state graph |
| Twine | Passage graph with conditions | Visual state machine for narrative |
| SCUMM (LucasArts) | Puzzle dependency graphs | DAG of puzzle prerequisites |
| Zork (MDL) | `CEVNT` flags + handler dispatch | Ad-hoc flag checking — exactly what we're replacing |

### Inform 7 Scenes: Detailed Comparison

Inform 7's [scene system](https://ganelson.github.io/inform-website/book/WI_10_1.html) is the closest prior art in the IF world. Scenes partition game time into named dramatic episodes:

```inform7
Train Stop is a scene. Train Stop begins when play begins.
Brief Encounter is a scene. Brief Encounter begins when Train Stop ends.
Before going north during the Train Stop, say "The train blocks your way."
```

Key features of Inform 7 scenes:
- **Condition-driven begin/end**: Scenes start/stop when world conditions become true (`when the guard is suspicious`)
- **Concurrent scenes**: Multiple scenes can be active simultaneously
- **"During" scoping**: Rules behave differently based on active scene
- **Props management**: Scenes can move objects in/out of play on enter/exit
- **Recurring**: Scenes can repeat
- **State queries**: `(scene) is happening`, `(scene) has happened`, `(scene) has ended`

#### Similarities

Both systems share the fundamental model: named states with transitions, conditions that gate transitions, and effects that fire on transition. Both support concurrency (multiple active machines/scenes) and state queries.

#### Differences

| Dimension | Inform 7 Scenes | Sharpee State Machines |
|-----------|-----------------|----------------------|
| **Scope** | Global narrative time — "what chapter are we in?" | Entity-scoped — "what state is this puzzle/entity in?" |
| **Trigger model** | Condition polling each turn | Event-driven (action or semantic event triggers) |
| **Granularity** | Coarse dramatic episodes | Fine-grained puzzle steps |
| **Binding** | Global (scenes exist independently of entities) | Entity-bound via role references (`$door`, `$key`) |
| **Purpose** | Narrative pacing, atmospheric shifts, rule scoping | Mechanical state transitions, puzzle orchestration |

#### Design Choice: One System, Two Usage Patterns

These are **complementary patterns**, not competing ones. A game could use both: scenes for "Act 1 / Act 2" narrative pacing, state machines for "key-under-door" puzzle mechanics. However, the underlying runtime is the same — states, transitions, guards, effects. Rather than building two separate systems, we propose **one state machine runtime** that serves both use cases through configuration:

- **Puzzle machines**: Action-triggered, entity-scoped, short-lived, deterministic, few states
- **Narrative machines**: Event/condition-triggered, global-scoped, long-lived, branching, many states

The boundary between "puzzle" and "narrative" is fuzzy — the thief arc (kill thief → do ritual → get canvas) is both a puzzle sequence and a narrative progression. One system avoids forcing authors to classify their game logic into artificial categories.

### Scope

One runtime, two usage patterns:

1. **Puzzle orchestration** — Multi-step mechanical puzzles with concrete state (tiny room, basket, coal machine, dam). Action-triggered transitions between discrete states. Entity-scoped. Short-lived.

2. **Narrative orchestration** — Story arcs, quest progression, NPC relationship phases, chapter gates. Event/condition-triggered transitions. Global or entity-scoped. Long-lived. Analogous to Inform 7 scenes but event-driven rather than condition-polled.

Both share the same core runtime: states, transitions, guards, effects. The distinction is in how authors configure the machines, not in the engine that runs them.

## Decision

Introduce a **declarative state machine system** that authors use to define puzzle and narrative flows. The system provides:

1. A state machine definition format
2. A runtime that evaluates guards and executes transitions
3. Integration with the action system (actions trigger transitions)
4. Integration with the event system (events can trigger transitions)
5. Serialization for save/restore

### State Machine Definition

```typescript
interface StateMachineDefinition {
  id: string;                          // e.g. 'dungeo.puzzle.tiny_room'
  description?: string;
  initialState: string;
  states: Record<string, StateDefinition>;
}

interface StateDefinition {
  description?: string;
  transitions: TransitionDefinition[];
  onEnter?: Effect[];                  // Effects when entering this state
  onExit?: Effect[];                   // Effects when leaving this state
  terminal?: boolean;                  // No outgoing transitions (puzzle solved, quest complete)
}

interface TransitionDefinition {
  target: string;                      // Target state ID
  trigger: TransitionTrigger;          // What causes this transition
  guard?: GuardCondition;              // Additional conditions beyond trigger
  effects?: Effect[];                  // Mutations and messages on transition
  priority?: number;                   // When multiple transitions match
}
```

### Triggers

Transitions fire in response to triggers. Two types:

```typescript
type TransitionTrigger =
  | ActionTrigger                      // Player performs an action
  | EventTrigger                       // Semantic event fires
  | ConditionTrigger;                  // World condition becomes true (polled per turn)

interface ActionTrigger {
  type: 'action';
  actionId: string;                    // e.g. 'dungeo.action.put_under'
  entity?: string;                     // Optional: specific entity involved
}

interface EventTrigger {
  type: 'event';
  eventId: string;                     // e.g. 'if.event.dropped'
  filter?: Record<string, any>;        // Match event data fields
}

interface ConditionTrigger {
  type: 'condition';
  condition: GuardCondition;           // Evaluated each turn; fires when true
  // Analogous to Inform 7: "Brief Encounter begins when Train Stop ends."
  // Use for narrative machines where transitions depend on world state
  // rather than specific player actions.
}
```

### Guards

Guards check world state before allowing a transition:

```typescript
type GuardCondition =
  | EntityGuard                        // Check entity trait/property
  | StateGuard                         // Check world state value
  | LocationGuard                      // Check actor location
  | InventoryGuard                     // Check actor has item
  | CompositeGuard;                    // AND/OR/NOT combinations

interface EntityGuard {
  type: 'entity';
  entityRef: string;                   // Entity ID or role reference
  trait: string;                       // Trait type to check
  property: string;                    // Property on trait
  value: any;                          // Expected value
}

interface LocationGuard {
  type: 'location';
  actorRef?: string;                   // Default: player
  roomRef: string;                     // Room entity ID or role
}

interface InventoryGuard {
  type: 'inventory';
  actorRef?: string;                   // Default: player
  entityRef: string;                   // Must have this item
}

interface CompositeGuard {
  type: 'and' | 'or' | 'not';
  conditions: GuardCondition[];
}
```

### Effects

When a transition fires, effects execute:

```typescript
type Effect =
  | MoveEntityEffect                   // Move entity to location
  | RemoveEntityEffect                 // Destroy entity
  | CreateEntityEffect                 // Spawn new entity
  | SetTraitEffect                     // Modify trait property
  | SetStateEffect                     // Set world state value
  | MessageEffect                      // Emit message to player
  | EmitEventEffect                    // Fire semantic event
  | BlockExitEffect                    // Block/unblock room exit
  | CustomEffect;                      // Escape hatch: callback function

interface MoveEntityEffect {
  type: 'move';
  entityRef: string;
  destinationRef: string;
}

interface MessageEffect {
  type: 'message';
  messageId: string;
  params?: Record<string, any>;
}

interface SetTraitEffect {
  type: 'set_trait';
  entityRef: string;
  trait: string;
  property: string;
  value: any;
}

// ... etc.
```

### Tiny Room Example

```typescript
const tinyRoomPuzzle: StateMachineDefinition = {
  id: 'dungeo.puzzle.tiny_room',
  description: 'Classic key-under-door puzzle',
  initialState: 'locked',

  states: {
    locked: {
      description: 'Door locked, key visible through keyhole',
      transitions: [{
        target: 'mat_placed',
        trigger: { type: 'action', actionId: 'dungeo.action.put_under' },
        guard: {
          type: 'inventory',
          entityRef: '$mat',
        },
        effects: [
          { type: 'set_trait', entityRef: '$door', trait: 'TinyRoomDoorTrait', property: 'matUnderDoor', value: true },
          { type: 'move', entityRef: '$mat', destinationRef: '$room' },
          { type: 'message', messageId: 'dungeo.tiny_room.mat_placed' }
        ]
      }]
    },

    mat_placed: {
      description: 'Mat under door, key still in lock on other side',
      transitions: [{
        target: 'key_on_mat',
        trigger: { type: 'action', actionId: 'dungeo.action.push_key' },
        guard: {
          type: 'inventory',
          entityRef: '$screwdriver',
        },
        effects: [
          { type: 'set_trait', entityRef: '$door', trait: 'TinyRoomDoorTrait', property: 'keyInLock', value: false },
          { type: 'set_trait', entityRef: '$door', trait: 'TinyRoomDoorTrait', property: 'keyOnMat', value: true },
          { type: 'message', messageId: 'dungeo.tiny_room.key_pushed' }
        ]
      }]
    },

    key_on_mat: {
      description: 'Key fell onto mat under door',
      transitions: [{
        target: 'key_in_hand',
        trigger: { type: 'action', actionId: 'dungeo.action.pull_mat' },
        effects: [
          { type: 'set_trait', entityRef: '$door', trait: 'TinyRoomDoorTrait', property: 'matUnderDoor', value: false },
          { type: 'set_trait', entityRef: '$door', trait: 'TinyRoomDoorTrait', property: 'keyOnMat', value: false },
          { type: 'move', entityRef: '$mat', destinationRef: '$player' },
          { type: 'move', entityRef: '$key', destinationRef: '$player' },
          { type: 'message', messageId: 'dungeo.tiny_room.mat_pulled_with_key' }
        ]
      }]
    },

    key_in_hand: {
      description: 'Player has key, can unlock door',
      transitions: [{
        target: 'door_open',
        trigger: { type: 'action', actionId: 'if.action.unlocking' },
        guard: {
          type: 'entity',
          entityRef: '$door',
          trait: 'LockableTrait',
          property: 'isLocked',
          value: true
        },
        effects: [
          { type: 'set_trait', entityRef: '$door', trait: 'LockableTrait', property: 'isLocked', value: false },
          { type: 'message', messageId: 'dungeo.tiny_room.door_unlocked' }
        ]
      }]
    },

    door_open: {
      description: 'Puzzle complete - door unlocked',
      terminal: true
    },

    key_lost: {
      description: 'Key pushed without mat - unwinnable',
      terminal: true
    }
  }
};
```

### Narrative Example: Thief Relationship Arc

```typescript
const thiefArc: StateMachineDefinition = {
  id: 'dungeo.narrative.thief',
  description: 'Thief relationship from enemy to ghost ally',
  initialState: 'hostile',

  states: {
    hostile: {
      description: 'Thief steals from player, fights if cornered',
      transitions: [{
        target: 'dead',
        trigger: { type: 'event', eventId: 'if.event.npc_killed', filter: { npcId: '$thief' } },
        effects: [
          { type: 'message', messageId: 'dungeo.thief.killed' }
        ]
      }]
    },

    dead: {
      description: 'Thief killed, ghost ritual becomes available',
      transitions: [{
        target: 'ghost_summoned',
        trigger: { type: 'action', actionId: 'if.action.dropping' },
        guard: {
          type: 'and',
          conditions: [
            { type: 'location', roomRef: '$basin_room' },
            { type: 'entity', entityRef: '$basin_room', trait: 'BasinRoomTrait', property: 'basinState', value: 'disarmed' }
          ]
        },
        effects: [
          { type: 'remove', entityRef: '$frame_piece' },
          { type: 'create', template: 'thiefs_canvas', destinationRef: '$gallery' },
          { type: 'message', messageId: 'dungeo.ghost.appears' }
        ]
      }]
    },

    ghost_summoned: {
      description: 'Ghost appeared, canvas in Gallery',
      terminal: true
    }
  }
};
```

### Entity References

State machines use **role references** (`$name`) that are bound at registration time:

```typescript
stateMachineRegistry.register(tinyRoomPuzzle, {
  bindings: {
    '$door': tinyRoomDoorId,
    '$mat': welcomeMatId,
    '$key': tinyRoomKeyId,
    '$screwdriver': screwdriverId,
    '$room': tinyRoomId,
    '$player': playerId,
  }
});
```

This decouples the state machine definition from specific entity IDs — the same puzzle pattern could be reused with different entities.

### Runtime Integration

#### With Actions

Actions can declare that they participate in state machines:

```typescript
// Option A: Action checks state machine in validate phase
validate(context) {
  const sm = context.getStateMachine('dungeo.puzzle.tiny_room');
  if (!sm.canTransition('dungeo.action.put_under')) {
    return { valid: false, error: sm.getBlockedReason() };
  }
  return { valid: true };
}

// Option B: Engine automatically checks state machines after action validate
// If a state machine has a transition for this action+state, engine validates guards
// If guards fail, action is blocked with state machine's message
```

#### With Events

The engine evaluates event-triggered transitions after processing semantic events:

```
Action executes → Events emitted → State machines evaluate event triggers → Transitions fire
```

#### Execution Timing

Transitions execute during the action's execute phase (Option A) or as a post-action hook (Option B). Effects are applied to the world model immediately. Messages are queued for the report phase.

### Save/Restore

Each state machine instance serializes as:

```json
{
  "id": "dungeo.puzzle.tiny_room",
  "currentState": "mat_placed",
  "history": ["locked", "mat_placed"],
  "metadata": {}
}
```

The `history` array enables "undo" or narrative callbacks ("remember when you...").

## Open Questions

### 1. Package Location — RESOLVED

**Decision**: `@sharpee/plugin-state-machine`, implementing the `TurnPlugin` interface from ADR-120.

The state machine runtime lives in its own plugin package. Engine calls it via the plugin contract after each successful player action. See ADR-120 for the plugin architecture and `docs/work/platform/state-machine.md` for the full location assessment.

### 2. Declarative vs Programmatic

The examples above are fully declarative (data structures). Should we also support:

- **Programmatic guards**: `guard: (world, actor) => world.getEntity(doorId).isLocked`
- **Programmatic effects**: `effect: (world, actor) => { /* complex logic */ }`

Declarative is safer (serializable, inspectable, toolable). Programmatic is more flexible. Could offer both with declarative preferred.

### 3. Action Ownership

Who executes the transition effects — the action or the state machine runtime?

- **Action executes**: Action calls `sm.transition()` in its execute phase. Action owns the mutation. State machine is advisory.
- **Runtime executes**: Engine detects matching transition and applies effects automatically. Actions don't need to know about state machines.

Option B is more declarative but means mutations happen outside actions, which conflicts with ADR-051 (actions own mutations).

### 4. Parallel State Machines

Can an entity participate in multiple state machines simultaneously? Example: the thief is in both the "thief combat" machine and the "thief treasure" machine. If yes, need conflict resolution for competing transitions.

### 5. Hierarchical States

Should states support sub-states? Example: "hostile" could have sub-states "stalking" and "fighting". This adds complexity but maps well to NPC behavior.

### 6. Visual Tooling

Declarative state machines enable visual editing. A future Sharpee Forge tool could render puzzle graphs, let authors drag states and draw transitions. This is a strong argument for keeping definitions declarative.

## Consequences

### Positive

- **Shared vocabulary**: Authors think in states and transitions, not ad-hoc flag management
- **Inspectable**: State machines can be visualized, validated (reachable states, dead ends)
- **Serializable**: Clean save/restore of puzzle and narrative progress
- **Reusable**: Same puzzle pattern, different entity bindings
- **Testable**: Can verify state machine behavior without running full game
- **Toolable**: Visual editors, automated walkthrough generation, puzzle graph analysis

### Negative

- **Abstraction cost**: Simple puzzles may not need a state machine (single-action puzzles)
- **Learning curve**: Authors must learn the state machine API
- **Migration**: Existing hand-coded orchestrators need migration
- **Over-engineering risk**: Not all game logic fits the FSM model — need escape hatches

### Neutral

- Existing hand-coded orchestrators prove the pattern works — this formalizes what's already happening
- Does not replace actions, interceptors, or daemons — complements them
- Command transformers remain separate (parser-layer, read-only)

## References

- ADR-051: Action Four-Phase Pattern
- ADR-071: Daemons and Fuses
- ADR-090: Capability Dispatch
- ADR-117: Event Handlers vs Capability Behaviors
- ADR-118: Stdlib Action Interceptors
- ADR-120: Engine Plugin Architecture (prerequisite — defines `TurnPlugin` contract)
- `stories/dungeo/src/handlers/tiny-room-handler.ts` — canonical example of hand-coded orchestration
- `stories/dungeo/src/handlers/basket-handler.ts` — simpler two-state example
