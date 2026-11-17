# Event Flow Analysis - All Event-Based Elements

## Current Architecture (With Problems)

```mermaid
sequenceDiagram
    box Player Turn
        participant Player
        participant Parser
        participant Action as Action (stdlib)
    end

    box Core
        participant World as WorldModel
        participant EP as EventProcessor
        participant GE as GameEngine
    end

    box Event Sources
        participant NPC as NPC System
        participant Daemon as Daemons/Fuses
        participant Sched as Scheduler
    end

    box Event Targets
        participant EH as Entity Handlers
        participant Emitter as EventEmitter
    end

    Note over Player,Emitter: === PLAYER TURN ===

    Player->>Parser: "kill troll"
    Parser->>Action: validate(context)
    Action->>World: query state
    Action->>Action: execute(context)
    Action->>World: mutate via CombatBehavior
    Action->>EP: emit(combat.hit, combat.death)

    EP->>World: find target entity
    EP->>EH: handler(event, world) ⚠️
    EH->>World: world.scoring.addPoints() ⚠️ BYPASS

    EP->>Emitter: emit(event) for global listeners
    Emitter->>GE: global handlers

    Note over Player,Emitter: === NPC PHASE ===

    Sched->>NPC: npc.act()
    NPC->>Action: troll attacks player
    Action->>World: mutate via CombatBehavior
    Action->>GE: dispatchEntityHandlers() ⚠️ DUPLICATE
    GE->>EH: handler(event, world)

    Note over Player,Emitter: === DAEMON PHASE ===

    Sched->>Daemon: check fuses/daemons
    Daemon->>World: lantern.fuel--
    Daemon->>GE: emit(lantern.dying)
    GE->>Emitter: emit(event)
```

## Problems Identified

1. **Two dispatch paths**: EventProcessor vs GameEngine.dispatchEntityHandlers()
2. **World injection**: Handlers get full world, can bypass stdlib
3. **No effect validation**: Direct mutations in handlers
4. **Inconsistent handler types**: EntityEventHandler vs SimpleEventHandler

## Proposed Architecture (Effects-Based)

```mermaid
sequenceDiagram
    box Player Turn
        participant Player
        participant Parser
        participant Action as Action (stdlib)
    end

    box Core
        participant World as WorldModel
        participant EP as EventProcessor
        participant EffQ as Effect Processor
    end

    box Event Sources
        participant NPC as NPC System
        participant Daemon as Daemons/Fuses
        participant Sched as Scheduler
    end

    box Event Targets
        participant EH as Entity Handlers
    end

    Note over Player,EH: === PLAYER TURN ===

    Player->>Parser: "kill troll"
    Parser->>Action: validate(context)
    Action->>World: query state (read)
    Action->>Action: execute(context)
    Action->>World: mutate via Behavior ✓
    Action->>EP: emit(combat.death)

    EP->>World: find target entity
    EP->>EH: handler(event, query)
    Note right of EH: query = read-only
    EH-->>EP: return Effect[]
    EP->>EffQ: process effects
    EffQ->>World: validated mutations ✓

    Note over Player,EH: === NPC PHASE ===

    Sched->>NPC: npc.act()
    NPC->>Action: execute action
    Action->>EP: emit(events)
    EP->>EH: handler(event, query)
    EH-->>EP: return Effect[]
    EP->>EffQ: process effects

    Note over Player,EH: === DAEMON PHASE ===

    Sched->>Daemon: tick()
    Daemon-->>EP: return Effect[]
    EP->>EffQ: process effects
    EffQ->>EP: emit(lantern.dying)
    EP->>EH: handler(event, query)
```

## Effect Types

```typescript
type Effect =
  | { type: 'score'; points: number; reason?: string }
  | { type: 'flag'; name: string; value: boolean }
  | { type: 'message'; id: string; data?: unknown }
  | { type: 'emit'; event: SemanticEvent }
  | { type: 'schedule'; daemon: string; turns: number }
  | { type: 'mutate'; entityId: string; trait: string; mutation: unknown }  // ← needs validation
```

## Key Changes

| Current | Proposed |
|---------|----------|
| `handler(event, world)` | `handler(event, query): Effect[]` |
| Direct world mutation | Return effects for processing |
| Two dispatch mechanisms | Single EventProcessor |
| EntityEventHandler + SimpleEventHandler | One handler type |
| GameEngine dispatches some events | All events through EventProcessor |

## Questions to Resolve

1. **Should `mutate` effects exist?** Or must all mutations go through actions?
2. **Who validates effects?** EffectProcessor? Behaviors?
3. **Can effects trigger more events?** (score effect → score.changed event)
4. **Where do daemons return effects?** Scheduler processes them?
