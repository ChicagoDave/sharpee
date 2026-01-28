# State Machine Package Location Assessment

## The Question

Where should the FSM runtime from ADR-119 live? The four candidates are:

1. **New package** (`@sharpee/state-machine`)
2. **Engine** (`@sharpee/engine`)
3. **Stdlib** (`@sharpee/stdlib`)
4. **World-model** (`@sharpee/world-model`)

## Current Dependency Graph (simplified)

```
core → if-domain → world-model → stdlib → engine
                                ↗
                    if-services ─┘
```

Engine sits at the top. It depends on stdlib, world-model, parser, event-processor, and lang. Stdlib depends on world-model and if-domain. World-model depends on core and if-domain.

Stories depend on engine + stdlib + world-model.

---

## Option 1: New Package (`@sharpee/state-machine`)

### What it looks like

A new package in `packages/state-machine/` at the Processing Layer, alongside stdlib.

```
core → if-domain → world-model → state-machine → engine
                                → stdlib ──────→ engine
```

### Dependencies it needs

- `@sharpee/core` (EntityId, events)
- `@sharpee/if-domain` (contracts)
- `@sharpee/world-model` (WorldModel, traits — to evaluate guards and apply effects)

### Who consumes it

- `@sharpee/engine` — registers machines, evaluates transitions in the turn cycle
- Stories — define machines, bind entities

### Pros

- **Clean separation of concerns.** State machine is a self-contained concept with its own types, runtime, registry, and serialization. It doesn't muddy any existing package's responsibilities.
- **Independent testing.** Can unit-test guard evaluation, effect application, and transition logic without engine or stdlib in scope.
- **Versioning independence.** Changes to FSM semantics don't force engine or stdlib version bumps.
- **Precedent.** `event-processor`, `text-service`, and `text-blocks` are all small focused packages. The monorepo already favors this pattern.

### Cons

- **Build chain grows by one step.** `build.sh` needs a new `--skip` target. Adds ~2-3 seconds to full builds.
- **Integration seams are split across packages.** The FSM package defines machines and evaluates transitions, but *engine* must call it at the right point in the turn cycle. The coordination logic lives in engine regardless.
- **Story authors import from yet another package.** `import { StateMachineDefinition } from '@sharpee/state-machine'` alongside existing imports from engine, stdlib, world-model.
- **Stdlib actions can't easily trigger transitions.** If an action wants to call `sm.transition()` in its execute phase, stdlib would need to depend on state-machine. This either creates a circular dependency concern or forces all transition triggering through engine.

### Key risk: stdlib ↔ state-machine coupling

ADR-119 Option A has actions calling `context.getStateMachine()`. That requires stdlib to know about state machines. But state-machine depends on world-model, and stdlib also depends on world-model — no circular dependency there. The question is whether stdlib *should* know about state machines.

If we go with Option B (engine evaluates transitions automatically), stdlib doesn't need the dependency at all. But Option B means mutations happen outside actions, conflicting with ADR-051.

---

## Option 2: Engine (`@sharpee/engine`)

### What it looks like

FSM types, runtime, and registry added to `packages/engine/src/state-machine/` alongside the existing `scheduler/` directory.

```
packages/engine/src/
├── scheduler/          # Daemons and Fuses (temporal)
├── state-machine/      # FSM runtime (state transitions)
├── command-executor.ts
├── game-engine.ts
└── ...
```

### Dependencies

No new package dependencies — engine already depends on everything FSM needs.

### Who consumes it

- Engine itself — evaluates transitions in the turn cycle
- Stories — define machines via engine API

### Pros

- **Zero new packages.** No build chain changes, no new `package.json`, no new import paths.
- **Natural integration point.** Engine already orchestrates the turn cycle (`CommandExecutor.execute()`). Transition evaluation slots in after action execute, before report. This is exactly where the scheduler already runs.
- **Scheduler analogy.** Daemons/fuses live in engine, and they're the closest existing concept to FSMs — both are "things that react during the turn cycle." Putting FSMs alongside scheduler is conceptually coherent.
- **Engine already has save/restore.** `SaveRestoreService` handles scheduler state serialization. Adding FSM state serialization is a natural extension.
- **Actions can trigger transitions via engine context.** The `ActionContext` is created by engine's `action-context-factory.ts`. Engine can add `getStateMachine()` to the context without stdlib knowing about FSMs.

### Cons

- **Engine is already the largest package.** Adding FSM types, runtime, guards, effects, registry, and serialization roughly doubles its conceptual surface area. Engine currently has ~23 files. FSM would add ~10-15 more.
- **FSM logic is testable but coupled to engine test infrastructure.** Testing guard evaluation requires standing up enough of engine to create contexts.
- **Reuse outside Sharpee is harder.** If someone wanted the FSM runtime for a different project, they'd need all of engine.

### Key advantage: ActionContext injection

Engine creates `ActionContext` via `action-context-factory.ts`. It can inject a `stateMachines` property (or `getStateMachine()` method) without stdlib needing to import anything FSM-specific. Actions use the context interface; they don't import FSM types directly.

```typescript
// In action-context-factory.ts (engine)
context.getStateMachine = (id) => fsmRegistry.get(id);

// In story action (no FSM import needed - uses context API)
const sm = context.getStateMachine('dungeo.puzzle.tiny_room');
```

This sidesteps the stdlib → state-machine dependency entirely. Stdlib actions already use `context.sharedData` and `context.world` without importing engine.

---

## Option 3: Stdlib (`@sharpee/stdlib`)

### What it looks like

FSM runtime lives alongside actions in stdlib.

### Pros

- Actions can directly call transition logic during execute phase.
- Close to where capability dispatch already lives.

### Cons

- **Wrong abstraction level.** Stdlib is a library of IF actions (TAKE, DROP, OPEN). State machines are an orchestration concept. Putting orchestration in the action library is a category error — like putting a workflow engine inside a function library.
- **Stdlib doesn't own the turn cycle.** It can't decide when to evaluate condition-triggered transitions (polling). Only engine knows when a turn ends.
- **Stdlib doesn't have save/restore.** Engine owns serialization.
- **Would become a dependency of engine** (already is, but adding more concepts makes the boundary muddier).

**Verdict: Wrong home.** Stdlib actions participate in state machines; they don't host them.

---

## Option 4: World-Model (`@sharpee/world-model`)

### What it looks like

FSM types and state storage live with traits and behaviors.

### Pros

- FSM state is world state. Traits already model entity state. An FSM could be modeled as a trait (`StateMachineTrait`) with state transitions.
- Guards inspect world-model data. Putting guards here avoids crossing package boundaries.

### Cons

- **World-model should be passive data.** It stores state and provides query APIs. It does not execute logic, evaluate conditions, or orchestrate transitions. Adding a runtime violates this principle.
- **No access to action context.** World-model doesn't know about actions, events, or the turn cycle. FSM triggers (action triggers, event triggers) require concepts that live in higher layers.
- **Scheduler precedent.** Daemons/fuses are also "stateful things that react during gameplay" and they live in engine, not world-model.

**Verdict: Wrong home.** State machines are active orchestration, not passive data.

---

## Comparison Matrix

| Criterion                        | New Package | Engine | Stdlib | World-Model |
|----------------------------------|:-----------:|:------:|:------:|:-----------:|
| Conceptual fit                   | Good        | Strong | Weak   | Weak        |
| Integration with turn cycle      | Indirect    | Direct | None   | None        |
| Integration with actions         | Indirect    | Via context | Direct | None    |
| Integration with save/restore    | New code    | Extend existing | None | None   |
| Build complexity                 | +1 package  | None   | None   | None        |
| Testing isolation                | Strong      | Moderate | N/A  | N/A         |
| Package size impact              | N/A         | +50%   | +30%   | +20%        |
| Follows existing patterns        | Yes (event-processor) | Yes (scheduler) | No | No |
| Story import complexity          | +1 package  | Same   | Same   | Same        |
| Reusability outside Sharpee      | High        | Low    | Low    | Low         |

---

## The Real Trade-off: New Package vs Engine

Stdlib and world-model are clearly wrong. The decision is between **new package** and **engine**.

### Arguments for new package

1. **Single Responsibility.** Engine orchestrates turns. State machines define and evaluate state transitions. Different concerns.
2. **Testing.** FSM guard evaluation, effect application, and transition resolution are pure logic. Testing them independently is cleaner.
3. **Size.** Engine stays focused on turn orchestration.
4. **Precedent.** `event-processor` is a small focused package consumed by engine. Same pattern.

### Arguments for engine

1. **Pragmatism.** FSM evaluation *must* be called by engine. If the runtime is separate, engine still has integration code. The "clean separation" means the logic is split across two packages instead of being in one place.
2. **ActionContext injection.** Engine already creates the context actions use. Adding FSM access is trivial if FSM lives here. If FSM is a separate package, engine still has to wire it in — same code, different location.
3. **Scheduler precedent.** The closest existing analog (daemons/fuses) lives in engine. FSMs are the same kind of thing: stateful objects that react during the turn cycle.
4. **One fewer package.** The monorepo has 14 packages already. Adding another for what might end up being 5-8 files of core logic is overhead.
5. **Save/restore.** Engine already has `SaveRestoreService`. FSM serialization is a natural extension.

### The scheduler analogy is strong

Compare:

| Aspect | Scheduler (Daemons/Fuses) | State Machines |
|--------|--------------------------|----------------|
| Registered by | Story at init time | Story at init time |
| Evaluated by | Engine, end of turn | Engine, during/after action |
| State stored | SchedulerState (serializable) | FSM state (serializable) |
| Reactive to | Turn ticks, conditions | Actions, events, conditions |
| Mutations via | Returns ISemanticEvent[] | Effects array |
| Lives in | engine/scheduler/ | engine/state-machine/? |

They're structurally identical. If daemons live in engine, state machines should too — unless there's a specific reason to separate them.

### The testing argument is weaker than it appears

The FSM runtime needs `WorldModel` to evaluate guards and apply effects. Unit tests already need to create a world. Whether that world comes from `@sharpee/world-model` (new package) or from engine's test helpers (engine) is the same setup cost.

---

## Hybrid: Types in if-domain, Runtime in Engine

A middle ground: put the *interfaces* (`StateMachineDefinition`, `StateDefinition`, `TransitionDefinition`, etc.) in `@sharpee/if-domain` as contracts. Put the *runtime* (registry, evaluator, guard resolution, effect execution) in engine.

**Benefit**: Stories import definition types from if-domain (which they already depend on) and don't need to import engine types directly. Engine imports the same types and provides the runtime.

**Drawback**: Types and runtime in different packages means you look in two places. Also, if-domain is currently pure contracts with no IF-specific orchestration concepts.

---

## Recommendation

**Engine**, with types co-located.

Rationale:
1. The scheduler analogy is the strongest argument. Both are "story-registered, engine-evaluated, turn-cycle-integrated, serializable reactive systems." Splitting them across packages based on trigger mechanism (temporal vs action/event) is an artificial distinction.
2. ActionContext injection is cleanest from engine — no cross-package wiring needed.
3. Save/restore extends naturally from existing `SaveRestoreService`.
4. The "engine gets bigger" concern is real but manageable. The scheduler directory is 4 files. FSM would be 6-8 files. Engine goes from ~23 to ~31 files. This is growth, not bloat.
5. If FSM later proves complex enough to warrant extraction, moving it to a separate package is a straightforward refactor. Starting with a new package and later wanting to merge it into engine is harder (you'd be adding a dependency cycle concern).

**Proposed structure:**

```
packages/engine/src/
├── scheduler/
│   ├── index.ts
│   ├── scheduler-service.ts
│   ├── seeded-random.ts
│   └── types.ts
├── state-machine/
│   ├── index.ts
│   ├── types.ts              # All FSM interfaces
│   ├── registry.ts           # StateMachineRegistry
│   ├── runtime.ts            # Transition evaluator
│   ├── guards.ts             # Guard resolution
│   ├── effects.ts            # Effect execution
│   └── serialization.ts      # Save/restore integration
├── command-executor.ts        # Calls FSM after action execute
├── game-engine.ts
└── ...
```

**Alternative I'd accept:** New package, if you feel strongly that engine should stay focused on turn orchestration only. It works fine either way. The integration seam is small. But I think it's unnecessary indirection for 6-8 files that are fundamentally about "what happens during a turn."

---

## Option 5: Engine Plugin Architecture

The previous options assumed FSM either lives *in* engine or *outside* engine. But there's a third model: engine defines **hook points** in its turn cycle, and FSM (and scheduler, and NPC service) are **plugins** that register to run at those hooks.

### The Problem with the Current Engine

Look at `game-engine.ts` lines 637-757. The turn cycle has three subsystems hardcoded in sequence:

```typescript
// 1. Player action (CommandExecutor.execute)
const result = await this.commandExecutor.execute(input, ...);

// 2. NPC turn phase — hardcoded
const npcEvents = this.npcService.tick({ ... });

// 3. Scheduler tick — hardcoded
const schedulerResult = this.scheduler.tick(world, turn, playerId);
```

Each subsystem has ~40 lines of identical boilerplate: enrich events, filter through perception service, add to turn events, track in event source, check for platform events, emit through engine listeners. Three copies of the same pipeline.

Adding FSM means a fourth copy. Adding any future subsystem (quest tracker, achievement system, ambient sound manager) means a fifth. The engine grows linearly with every turn-cycle participant.

### The Plugin Contract

```typescript
/**
 * A TurnPlugin participates in the engine's turn cycle.
 * Plugins are called in priority order after the player's action succeeds.
 */
interface TurnPlugin {
  /** Unique identifier */
  id: string;

  /** Higher priority runs first. Default: 0 */
  priority: number;

  /**
   * Called after a successful player action.
   * Returns semantic events to be processed through the standard pipeline
   * (enrichment → perception filtering → text service → emit).
   */
  onAfterAction(context: TurnPluginContext): ISemanticEvent[];

  /**
   * Serialization hook — return state for save files.
   * Return undefined if plugin has no state to save.
   */
  getState?(): unknown;

  /**
   * Restore hook — receive state from a save file.
   */
  setState?(state: unknown): void;
}

interface TurnPluginContext {
  world: WorldModel;
  turn: number;
  playerId: EntityId;
  playerLocation: EntityId;
  random: SeededRandom;

  /** The action that just executed (for FSM action triggers) */
  actionResult?: {
    actionId: string;
    success: boolean;
    targetId?: EntityId;
    sharedData?: Record<string, unknown>;
  };

  /** Events emitted by the action (for FSM event triggers) */
  actionEvents?: ISemanticEvent[];
}
```

### What Engine Becomes

Engine's `executeTurn` shrinks to:

```typescript
// Player action
const result = await this.commandExecutor.execute(input, ...);

// Plugin phase — one loop replaces all hardcoded subsystems
if (result.success) {
  const pluginContext = this.buildPluginContext(result, turn);
  for (const plugin of this.plugins) {
    const events = plugin.onAfterAction(pluginContext);
    this.processPluginEvents(events, turn);  // shared pipeline
  }
}
```

The ~120 lines of duplicated event processing collapse into one `processPluginEvents` method called once per plugin.

### Existing Subsystems as Plugins

#### NPC Service → `NpcTurnPlugin`

```typescript
const npcPlugin: TurnPlugin = {
  id: 'sharpee.plugin.npc',
  priority: 100,  // NPCs act first

  onAfterAction(ctx) {
    return npcService.tick({
      world: ctx.world,
      turn: ctx.turn,
      random: ctx.random,
      playerLocation: ctx.playerLocation,
      playerId: ctx.playerId,
    });
  },
  // NPC service manages its own state via world-model entities
};
```

#### Scheduler → `SchedulerPlugin`

```typescript
const schedulerPlugin: TurnPlugin = {
  id: 'sharpee.plugin.scheduler',
  priority: 50,   // Scheduler runs after NPCs

  onAfterAction(ctx) {
    return scheduler.tick(ctx.world, ctx.turn, ctx.playerId).events;
  },

  getState() { return scheduler.getState(); },
  setState(s) { scheduler.setState(s as SchedulerState); },
};
```

#### FSM → `StateMachinePlugin`

```typescript
const fsmPlugin: TurnPlugin = {
  id: 'sharpee.plugin.fsm',
  priority: 75,   // FSM evaluates between NPCs and scheduler

  onAfterAction(ctx) {
    // Evaluate action-triggered transitions
    const events: ISemanticEvent[] = [];
    if (ctx.actionResult) {
      events.push(...fsmRuntime.evaluateActionTriggers(
        ctx.actionResult.actionId,
        ctx.world,
        ctx.actionResult
      ));
    }
    // Evaluate event-triggered transitions
    if (ctx.actionEvents) {
      for (const event of ctx.actionEvents) {
        events.push(...fsmRuntime.evaluateEventTriggers(event, ctx.world));
      }
    }
    // Evaluate condition-triggered transitions (polled each turn)
    events.push(...fsmRuntime.evaluateConditionTriggers(ctx.world));
    return events;
  },

  getState() { return fsmRuntime.getState(); },
  setState(s) { fsmRuntime.setState(s); },
};
```

### Engine's Plugin API

```typescript
class GameEngine {
  private plugins: TurnPlugin[] = [];

  registerPlugin(plugin: TurnPlugin): void {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => b.priority - a.priority);
  }

  unregisterPlugin(id: string): void {
    this.plugins = this.plugins.filter(p => p.id !== id);
  }
}
```

Stories register plugins in `onEngineReady()`:

```typescript
onEngineReady(engine: GameEngine): void {
  engine.registerPlugin(npcPlugin);
  engine.registerPlugin(schedulerPlugin);
  engine.registerPlugin(fsmPlugin);
}
```

### Where Does the FSM Runtime Live?

With the plugin architecture, the question changes. Engine defines `TurnPlugin` and the hook points. The FSM *runtime* (types, guards, effects, registry) can live anywhere that implements `TurnPlugin`. Three sub-options:

#### 5a. FSM runtime in new package, plugged into engine

```
@sharpee/state-machine  →  exports StateMachinePlugin (implements TurnPlugin)
@sharpee/engine         →  exports TurnPlugin interface, registerPlugin()
```

Engine stays thin. FSM is a self-contained package that happens to plug in. Stories import from both.

#### 5b. FSM runtime in engine, alongside scheduler

Same as Option 2 but with the plugin abstraction. Scheduler and FSM both become plugins internally. Less conceptual win — you've added the plugin pattern but kept everything in one package.

#### 5c. FSM runtime in engine, scheduler extracted to its own package

Retroactively extract scheduler to `@sharpee/scheduler`, put FSM in `@sharpee/state-machine`, and engine only has the plugin contract + event processing pipeline. Engine becomes truly thin.

### Assessment

| Sub-option | Engine stays thin | Backward compat | Packages added | Conceptual clarity |
|------------|:-:|:-:|:-:|:-:|
| 5a. FSM external, scheduler stays | Partially | Full | +1 | Mixed — scheduler still hardcoded |
| 5b. Both internal | No | Full | 0 | Low — plugin adds overhead without payoff |
| 5c. Both external | Yes | Breaking | +2 | High — engine is pure orchestrator |

### The Pragmatic Path: 5a

**5a is the right first step.** Here's why:

1. **No breaking changes.** Scheduler stays where it is. NPC service stays where it is. Engine adds `TurnPlugin` interface and `registerPlugin()`. Existing subsystems continue to work as-is.

2. **FSM is the first real plugin.** It validates the plugin contract. If the pattern works well, scheduler and NPC service can migrate to plugins later (5c). If it doesn't, FSM is just a package that engine calls — no harm done.

3. **Engine shrinks over time, not all at once.** The refactor from hardcoded subsystems to plugins is incremental. Turn 1: add plugin interface. Turn 2: FSM uses it. Turn 3: optionally migrate scheduler. Turn 4: optionally migrate NPC service.

4. **FSM gets clean separation.** Its types, runtime, guards, and effects live in `@sharpee/state-machine`. Engine only knows it as a `TurnPlugin`. Testing FSM doesn't require engine.

### Plugin Contract: Additional Hooks

The basic `onAfterAction` covers the common case. Future hooks could include:

```typescript
interface TurnPlugin {
  // ... existing ...

  /** Called before action validation. Can block or modify. */
  onBeforeAction?(context: TurnPluginContext): PluginVeto | void;

  /** Called after action execute but before report. */
  onAfterExecute?(context: TurnPluginContext): ISemanticEvent[];

  /** Called when game is saved — contribute to save data. */
  onSave?(context: SaveContext): unknown;

  /** Called when game is restored. */
  onRestore?(state: unknown, context: RestoreContext): void;

  /** Called once at game start. */
  onGameStart?(context: TurnPluginContext): void;

  /** Called once at game end. */
  onGameEnd?(context: TurnPluginContext): void;
}
```

But **start minimal**. `onAfterAction` + `getState/setState` covers FSM, scheduler, and NPC needs. Add hooks when something actually needs them.

### Relationship to ADR-119 Open Questions

This resolves ADR-119 Question #1 (Package Location) and partially resolves Question #3 (Action Ownership):

- **Package location**: `@sharpee/state-machine`, consumed by engine via `TurnPlugin`
- **Action ownership**: Plugin evaluates transitions in `onAfterAction` — mutations happen *after* the action completes, but are triggered *by* the action's result. The action doesn't call `sm.transition()` directly; the plugin observes what the action did and fires matching transitions. This is the "Option B" from ADR-119 but framed as a plugin rather than engine magic.

The ADR-051 concern ("actions own mutations") is less problematic in this model. The FSM plugin fires *after* the action's four phases complete. It's a reactive system, like event handlers, not a mutation within the action. The action did its thing; the FSM reacts to it.

---

## Final Architecture

**Engine with `@sharpee/plugins` contract package. All turn-cycle subsystems migrate to plugins.**

### Package Structure

```
@sharpee/plugins          — TurnPlugin interface, TurnPluginContext, shared types
@sharpee/plugin-npc       — NPC turn phase (extracted from engine + stdlib)
@sharpee/plugin-scheduler — Daemons and fuses (extracted from engine/scheduler/)
@sharpee/plugin-state-machine — State machines (new, ADR-119)
@sharpee/engine           — Thin orchestrator: parse → validate → execute → report → plugin loop
```

### Dependency Graph

```
core → if-domain → world-model ─→ plugins ─→ engine
                                ├→ plugin-npc
                                ├→ plugin-scheduler
                                └→ plugin-state-machine

stdlib depends on: world-model, if-domain (unchanged)
engine depends on: plugins, stdlib, world-model, parser, event-processor, lang, text-service
plugin-* depends on: plugins, world-model, core
```

Engine depends on `@sharpee/plugins` for the contract. Each plugin package depends on `@sharpee/plugins` for the interface it implements. Engine never imports plugin packages directly — stories wire them in via `registerPlugin()`.

### What Engine Keeps

After full migration, engine retains:

- `GameEngine` class (turn lifecycle, game start/stop)
- `CommandExecutor` (parse → validate → execute → report pipeline)
- `ActionContextFactory` (creates contexts for actions)
- `EventSequencer` (event ordering)
- `SaveRestoreService` (delegates to plugin `getState/setState` hooks)
- `PlatformOperationHandler` (save/restore/quit/undo/again)
- `VocabularyManager` (scope-based vocabulary updates)
- `TurnEventProcessor` (event enrichment)
- Plugin registry and the plugin event-processing loop

Engine **loses**:

- `scheduler/` directory (4 files → `@sharpee/plugin-scheduler`)
- NPC service creation and tick call (→ `@sharpee/plugin-npc`)
- ~120 lines of duplicated event-processing boilerplate (collapses into `processPluginEvents`)
- Direct dependency on `@sharpee/stdlib` for `INpcService`, `createNpcService`, `guardBehavior`, `passiveBehavior` (these move to plugin-npc)

### Migration Plan

#### Phase 1: Foundation — `@sharpee/plugins`

Create the contract package. Small, no runtime logic.

**Files:**
```
packages/plugins/
├── src/
│   ├── index.ts
│   ├── turn-plugin.ts         # TurnPlugin interface
│   ├── turn-plugin-context.ts # TurnPluginContext type
│   └── plugin-registry.ts     # PluginRegistry class (sorted insert, iterate)
├── package.json               # depends on: @sharpee/core, @sharpee/world-model
└── tsconfig.json
```

**`TurnPlugin` interface:**
```typescript
interface TurnPlugin {
  id: string;
  priority: number;

  /** Called after a successful player action */
  onAfterAction(context: TurnPluginContext): ISemanticEvent[];

  /** Serialization */
  getState?(): unknown;
  setState?(state: unknown): void;
}
```

**`PluginRegistry` class:**
```typescript
class PluginRegistry {
  register(plugin: TurnPlugin): void;
  unregister(id: string): void;
  getAll(): TurnPlugin[];           // sorted by priority desc
  getById(id: string): TurnPlugin | undefined;
  getStates(): Record<string, unknown>;   // for save
  setStates(states: Record<string, unknown>): void;  // for restore
}
```

**Engine integration** (additive, no breaking changes):
- `GameEngine` gets `registerPlugin()` and `unregisterPlugin()`
- `executeTurn()` gets a plugin loop after the existing hardcoded NPC + scheduler calls
- Save/restore collects plugin states via registry
- All new plugins use the loop. Existing subsystems untouched.

**Tests**: Plugin registry unit tests (register, priority ordering, state round-trip). No engine changes needed to test.

**Validates**: Plugin contract is usable before migrating anything.

#### Phase 2: First Plugin — `@sharpee/plugin-scheduler`

Extract scheduler from engine. Lowest risk — scheduler is already a clean service behind `ISchedulerService`.

**What moves:**
- `packages/engine/src/scheduler/` → `packages/plugin-scheduler/src/`
  - `scheduler-service.ts`
  - `seeded-random.ts`
  - `types.ts` (Daemon, Fuse, SchedulerContext, etc.)
- New: `scheduler-plugin.ts` implementing `TurnPlugin`

**What changes in engine:**
- Remove `import { ISchedulerService, createSchedulerService } from './scheduler'`
- Remove `private scheduler: ISchedulerService` from `GameEngine`
- Remove hardcoded scheduler tick block (~45 lines in `executeTurn`)
- Remove `getScheduler()` method
- Remove scheduler state from `SaveRestoreService` (plugin handles it)
- Keep `scheduler/` directory deletion

**Story changes:**
- `onEngineReady()` registers `SchedulerPlugin` instead of calling `engine.getScheduler()`
- All `engine.getScheduler().registerDaemon()` calls become `schedulerPlugin.getScheduler().registerDaemon()` or the plugin exposes a registration API

**Backward compatibility concern:**
Stories currently call `engine.getScheduler()` extensively. Two options:
1. **Deprecation shim**: Keep `getScheduler()` on engine, delegate to the plugin via registry lookup. Remove in next major version.
2. **Clean break**: Stories update their `onEngineReady()` to hold a reference to the scheduler plugin and use it directly.

Option 2 is cleaner. Since there's only one story (dungeo) and we don't care about backward compatibility, clean break is fine.

**Tests**: All 148 walkthrough tests must pass. Scheduler unit tests move to new package.

#### Phase 3: Second Plugin — `@sharpee/plugin-npc`

Extract NPC service. Slightly more tangled — NPC service currently lives in stdlib.

**Current location:** `@sharpee/stdlib` exports `INpcService`, `createNpcService`, `guardBehavior`, `passiveBehavior`.

**What moves:**
- NPC service types and implementation from stdlib → `packages/plugin-npc/src/`
- `guardBehavior`, `passiveBehavior` → `plugin-npc` (these are NPC behavior strategies)
- New: `npc-plugin.ts` implementing `TurnPlugin`

**What changes in engine:**
- Remove `import { INpcService, createNpcService, guardBehavior, passiveBehavior } from '@sharpee/stdlib'`
- Remove `private npcService: INpcService` from `GameEngine`
- Remove hardcoded NPC tick block (~50 lines in `executeTurn`)
- Remove `getNpcService()` method
- Remove NPC behavior registration from constructor

**What changes in stdlib:**
- Remove NPC service exports (types and implementation move out)
- Stdlib no longer owns NPC concepts

**Story changes:**
- `onEngineReady()` registers `NpcPlugin`
- NPC registration moves from engine constructor to plugin or story init

**Dependency note:** `plugin-npc` depends on `@sharpee/world-model` (for entity access) and `@sharpee/plugins` (for interface). Does NOT depend on stdlib or engine.

**Tests**: Walkthrough tests must pass. NPC-specific tests move to new package.

#### Phase 4: New Plugin — `@sharpee/plugin-state-machine`

Build the state machine system as a plugin from the start. No migration — purely new code.

**Files:**
```
packages/plugin-state-machine/
├── src/
│   ├── index.ts
│   ├── types.ts              # StateMachineDefinition, State, Transition, Guard, Effect
│   ├── fsm-plugin.ts         # TurnPlugin implementation
│   ├── runtime.ts            # Transition evaluator
│   ├── registry.ts           # Machine instance registry
│   ├── guards.ts             # Guard condition evaluators
│   ├── effects.ts            # Effect executors
│   └── serialization.ts      # State serialization
├── package.json              # depends on: @sharpee/plugins, @sharpee/world-model, @sharpee/core
└── tsconfig.json
```

**Story usage:**
```typescript
import { createFsmPlugin, StateMachineDefinition } from '@sharpee/plugin-state-machine';

// In story init
const fsmPlugin = createFsmPlugin();
fsmPlugin.register(tinyRoomPuzzle, { bindings: { ... } });
fsmPlugin.register(thiefArc, { bindings: { ... } });

// In onEngineReady
engine.registerPlugin(fsmPlugin);
```

**Tests**: Unit tests for guards, effects, transitions. Integration test: migrate tiny-room puzzle from hand-coded orchestrator to FSM definition, verify walkthrough tests still pass.

#### Phase 5: Cleanup

- Remove duplicated event-processing boilerplate from `executeTurn` — the plugin loop with `processPluginEvents` handles everything
- Remove `scheduler/` directory from engine (now empty)
- Remove NPC imports from engine
- Engine's `executeTurn` becomes:
  ```typescript
  const result = await this.commandExecutor.execute(input, ...);
  // ... event processing for the action itself ...
  if (result.success) {
    const ctx = this.buildPluginContext(result, turn);
    for (const plugin of this.pluginRegistry.getAll()) {
      const events = plugin.onAfterAction(ctx);
      this.processPluginEvents(events, turn);
    }
  }
  ```
- Update `SaveRestoreService` to collect/restore plugin states via registry
- Update `build.sh` with new package targets
- Final walkthrough test run: 148/148

### Phase Order and Dependencies

```
Phase 1: @sharpee/plugins        — foundation, no breaking changes
    ↓
Phase 2: @sharpee/plugin-scheduler — first extraction, validates pattern
    ↓
Phase 3: @sharpee/plugin-npc     — second extraction, cleans up stdlib
    ↓
Phase 4: @sharpee/plugin-state-machine     — new feature, built as plugin from day one
    ↓
Phase 5: Cleanup                  — remove dead code, shrink engine
```

Phases 2 and 3 can swap order. Phase 4 can run in parallel with 2-3 if the plugin contract from Phase 1 is stable. Phase 5 must be last.

### Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|------------|
| 1 | Low — additive only | Plugin loop runs after existing hardcoded code; nothing breaks |
| 2 | Medium — scheduler is used by every daemon/fuse in dungeo | Shim `getScheduler()` during transition if needed |
| 3 | Medium — NPC service is imported by engine constructor | Clean extraction; engine stops importing from stdlib for NPC |
| 4 | Low — new code, no migration | Build on stable plugin contract from phases 1-3 |
| 5 | Low — deleting dead code | Walkthrough tests catch any missed wiring |

### What This Means for Engine

After all phases, engine is:

- **~400 lines smaller** (removed NPC tick, scheduler tick, duplicated event processing)
- **Zero knowledge of NPCs, daemons, fuses, or state machines** — it just calls plugins
- **Extensible** — future subsystems (quest tracker, achievement system, ambient events) are new plugin packages, not engine modifications
- **Still owns**: Turn lifecycle, command execution, action context creation, event sequencing, save/restore coordination, platform operations, text output

Engine becomes what its name says: the engine. It turns the crank. Plugins decide what happens when it turns.
