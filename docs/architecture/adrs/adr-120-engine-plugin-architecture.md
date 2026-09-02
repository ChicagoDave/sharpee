# ADR-120: Engine Plugin Architecture

## Status: PROPOSED

## Date: 2026-01-27

## Context

### The Problem

The game engine's `executeTurn()` method hardcodes three subsystems that run after each player action:

1. **NPC turn phase** (ADR-070) — NPCs act after the player
2. **Scheduler tick** (ADR-071) — daemons run, fuses count down
3. *(Proposed)* **State machine evaluation** (ADR-119) — puzzle/narrative transitions fire

Each subsystem has ~40 lines of identical boilerplate in `game-engine.ts`: enrich events, filter through perception service, add to turn events, track in event source, check for platform request events, emit through engine listeners. Three copies today, four with state machines, five with the next subsystem.

The engine grows linearly with every turn-cycle participant. Adding a new reactive system requires modifying `game-engine.ts` directly — the core file that orchestrates everything.

### Current Engine Responsibilities

`GameEngine` currently owns:

- Turn lifecycle (start, stop, turn counter)
- Command execution pipeline (parse → validate → execute → report)
- NPC tick invocation (hardcoded)
- Scheduler tick invocation (hardcoded)
- Event enrichment and perception filtering
- Save/restore coordination
- Platform operations (save, restore, quit, undo, again)
- Text output via text service
- Vocabulary management
- Command history

NPC and scheduler are implementation details of specific game features, not core engine concerns. They happen to live in the engine because there was no abstraction for "things that react during the turn cycle."

### Prior Art

| System | Plugin Pattern |
|--------|---------------|
| Unity | MonoBehaviour lifecycle hooks (Awake, Start, Update, LateUpdate) |
| Unreal | Subsystems registered with engine, ticked per frame |
| Webpack | Tapable plugin hooks at defined points in the build pipeline |
| Express | Middleware chain with `next()` |
| VSCode | Extension API with activation events and contribution points |

The common pattern: a host defines hook points in its lifecycle. Plugins register to be called at those hooks. The host doesn't know what plugins do — only that they conform to a contract.

## Decision

Introduce a **plugin architecture** for the engine's turn cycle. The engine defines hook points; subsystems register as plugins that are called at those hooks.

### New Package: `@sharpee/plugins`

A small contract package defining the plugin interface and registry.

**Why a separate package** (not in `if-domain`): `TurnPluginContext` references `WorldModel`. Since `if-domain` cannot depend on `world-model` (it's the other direction), the plugin contract needs its own package.

```
core → if-domain → world-model → plugins → engine
                                         → plugin-scheduler
                                         → plugin-npc
                                         → plugin-state-machine
```

### TurnPlugin Interface

```typescript
/**
 * A TurnPlugin participates in the engine's turn cycle.
 * Plugins are called in priority order after a successful player action.
 */
interface TurnPlugin {
  /** Unique identifier (e.g., 'sharpee.plugin.scheduler') */
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
   * Return serializable state for save files.
   * Return undefined if this plugin has no state to persist.
   */
  getState?(): unknown;

  /**
   * Restore state from a save file.
   */
  setState?(state: unknown): void;
}
```

### TurnPluginContext

```typescript
interface TurnPluginContext {
  world: WorldModel;
  turn: number;
  playerId: EntityId;
  playerLocation: EntityId;
  random: SeededRandom;

  /** The action that just executed */
  actionResult?: {
    actionId: string;
    success: boolean;
    targetId?: EntityId;
    sharedData?: Record<string, unknown>;
  };

  /** Events emitted by the action */
  actionEvents?: ISemanticEvent[];
}
```

### PluginRegistry

```typescript
class PluginRegistry {
  register(plugin: TurnPlugin): void;
  unregister(id: string): void;
  getAll(): TurnPlugin[];  // sorted by priority descending
  getById(id: string): TurnPlugin | undefined;

  /** Collect all plugin states for save */
  getStates(): Record<string, unknown>;

  /** Restore all plugin states from save */
  setStates(states: Record<string, unknown>): void;
}
```

### Engine Integration

`GameEngine` adds:

```typescript
class GameEngine {
  private pluginRegistry: PluginRegistry;

  registerPlugin(plugin: TurnPlugin): void;
  unregisterPlugin(id: string): void;
}
```

The `executeTurn()` method replaces hardcoded subsystem calls with a plugin loop:

```typescript
// Before (current — 3 hardcoded blocks, ~120 lines of duplicated boilerplate)
if (result.success) {
  // NPC tick — ~45 lines of event processing
  const npcEvents = this.npcService.tick({ ... });
  // ... enrich, filter, store, emit ...

  // Scheduler tick — ~45 lines of event processing
  const schedulerResult = this.scheduler.tick(...);
  // ... enrich, filter, store, emit ...
}

// After (plugin loop — one shared pipeline)
if (result.success) {
  const ctx = this.buildPluginContext(result, turn);
  for (const plugin of this.pluginRegistry.getAll()) {
    const events = plugin.onAfterAction(ctx);
    this.processPluginEvents(events, turn);
  }
}
```

`processPluginEvents` is the shared pipeline that replaces the duplicated boilerplate: enrich → perception filter → store in turn events → track in event source → check platform events → emit.

### Subsystem Extraction

Three existing subsystems become plugin packages:

#### `@sharpee/plugin-scheduler`

Extracts `engine/scheduler/` (4 files). Wraps `SchedulerService` in a `TurnPlugin`:

```typescript
// onAfterAction calls scheduler.tick() and returns its events
// getState/setState delegate to scheduler.getState/setState
```

#### `@sharpee/plugin-npc`

Extracts NPC service from `@sharpee/stdlib` (where `INpcService`, `createNpcService`, `guardBehavior`, `passiveBehavior` currently live). Wraps in a `TurnPlugin`:

```typescript
// onAfterAction calls npcService.tick() and returns its events
// NPC state lives in world-model entities, so no getState/setState needed
```

#### `@sharpee/plugin-state-machine` (ADR-119)

New package implementing the state machine system proposed in ADR-119, built as a plugin from the start:

```typescript
// onAfterAction evaluates:
//   1. Action-triggered transitions (matching actionResult.actionId)
//   2. Event-triggered transitions (matching actionEvents)
//   3. Condition-triggered transitions (polled each turn)
// getState/setState serialize current machine states
```

### Plugin Priority Order

| Plugin | Priority | Rationale |
|--------|----------|-----------|
| NPC | 100 | NPCs act first — their actions may trigger FSM transitions |
| State Machine | 75 | Reacts to player action and NPC events |
| Scheduler | 50 | Temporal events run last — daemons/fuses are background |

Priority is a convention, not enforced. Stories can adjust ordering.

### Story Registration

Stories wire plugins in `onEngineReady()`:

```typescript
onEngineReady(engine: GameEngine): void {
  // Create and configure plugins
  const scheduler = createSchedulerPlugin();
  scheduler.getScheduler().registerDaemon(thiefDaemon);
  scheduler.getScheduler().setFuse(floodFuse);

  const npc = createNpcPlugin();
  npc.getNpcService().registerNpc(trollNpc);

  const fsm = createStateMachinePlugin();
  fsm.register(tinyRoomPuzzle, { bindings: { ... } });

  // Register with engine
  engine.registerPlugin(npc);
  engine.registerPlugin(fsm);
  engine.registerPlugin(scheduler);
}
```

### Save/Restore

`SaveRestoreService` collects plugin state:

```typescript
// On save
const pluginStates = this.pluginRegistry.getStates();
saveData.pluginStates = pluginStates;

// On restore
if (saveData.pluginStates) {
  this.pluginRegistry.setStates(saveData.pluginStates);
}
```

Each plugin's state is keyed by its `id`. Plugins without `getState` are skipped.

## Migration Plan

| Phase | Package | Description |
|-------|---------|-------------|
| 1 | `@sharpee/plugins` | Contract package: TurnPlugin, TurnPluginContext, PluginRegistry |
| 2 | `@sharpee/plugin-scheduler` | Extract scheduler from engine |
| 3 | `@sharpee/plugin-npc` | Extract NPC service from engine/stdlib |
| 4 | `@sharpee/plugin-state-machine` | New — ADR-119 implementation |
| 5 | Engine cleanup | Remove dead code, collapse boilerplate |

Phases 2-3 can swap. Phase 4 can run in parallel with 2-3 once Phase 1 is stable. Phase 5 is last.

Detailed migration plan: `docs/work/platform/state-machine.md`

## Consequences

### Positive

- **Engine shrinks** by ~400 lines and loses knowledge of NPCs, daemons, fuses, and state machines
- **No more boilerplate duplication** — one `processPluginEvents` method replaces three copies
- **New subsystems don't modify engine** — just create a new plugin package
- **Independent testing** — each plugin is unit-testable without engine
- **Clear separation** — engine orchestrates the turn cycle; plugins decide what happens during it

### Negative

- **Four new packages** (plugins, plugin-scheduler, plugin-npc, plugin-state-machine) adds build chain steps
- **Story setup is more explicit** — authors register plugins in `onEngineReady()` instead of engine auto-creating subsystems
- **Indirection** — debugging requires knowing which plugin produced an event

### Neutral

- Plugin contract is minimal (`onAfterAction` + optional serialization). Low learning curve.
- Existing subsystem logic is unchanged — only the wiring moves.
- `build.sh` needs new `--skip` targets for each package.

## Future Hooks

The initial contract has one hook: `onAfterAction`. Future hooks can be added as needed:

| Hook | When | Use Case |
|------|------|----------|
| `onBeforeAction` | Before validation | Plugin-based action blocking or modification |
| `onAfterExecute` | After execute, before report | Mid-action reactive logic |
| `onGameStart` | Engine start | Plugin initialization |
| `onGameEnd` | Engine stop | Plugin cleanup |

Add hooks only when a concrete use case requires them. Start minimal.

## References

- ADR-051: Action Four-Phase Pattern
- ADR-070: NPC System Architecture
- ADR-071: Daemons and Fuses
- ADR-119: State Machines for Puzzles and Narratives (depends on this ADR)
- `docs/work/platform/state-machine.md` — detailed assessment and migration plan
- `packages/engine/src/game-engine.ts` — current hardcoded subsystem calls (lines 637-757)
- `packages/engine/src/scheduler/` — scheduler implementation to be extracted

## Amendment — Superseded in part by ADR-328 (2026-08-27)

**Context.** [ADR-328](adr-328-actors-are-a-platform-concept.md) (ACCEPTED 2026-08-25; D5 amended 2026-08-27) rules that the engine owns the per-turn actor tick, per the Logic Location table (`CLAUDE.md`: "NPC turn phase" is an engine responsibility).

**Change.** Of the three extractions in §Subsystem Extraction, `@sharpee/plugin-npc` dissolves: what its `onAfterAction` drove (`npcService.tick`, `onPlayerEnters`/`onPlayerLeaves`, the ADR-310 `actionEvents` and ADR-320 `emitSound` feeds, behavior-state save/restore) becomes an engine-owned actor turn phase. The NPC row of §Plugin Priority Order (100) is therefore no longer a plugin priority — the actor phase runs first as engine sequencing, and State Machine (75) / Scheduler (50) keep their relative order behind it. The `TurnPlugin` interface, `PluginRegistry`, `TurnPluginContext`, and the scheduler and state-machine plugins are unchanged.

**Session.** 2026-08-27, session d6dc2b — Phase 0 of `docs/work/adr-328-actors-platform-concept/plan.md`.

## Amendment — §Plugin Priority Order superseded by ADR-332 (2026-09-02)

**Context.** [ADR-332](adr-332-story-reactions-before-the-actor-phase.md) (DRAFT 2026-09-02, David's direction) rules that the story's own reactions run before the platform's actor phase: under Chord every per-turn clause an author writes — `when <timer> expires`, `on every turn`, `define sequence` — rides the scheduler, so "temporal events run last — daemons/fuses are background" no longer describes what the scheduler carries.

**Change.** §Plugin Priority Order becomes three named bands exported from `packages/plugins` (ADR-332 D2): story reactions (300s — the acting flush 390, the scheduler 350, the hunger daemon 340), platform phases (200s — actor phase 250, state machines 240, scene evaluation 230), watchers (100s — scoring and hunger watchers 120, their narrators 115, chapters 110). The scheduler moves ahead of the actor phase; every other relative position is preserved. Rationale for the new order: what the author wrote happens first; the platform acts on the world the author left. "Priority is a convention, not enforced" becomes "a band is a name you pick." Everything else in this ADR stands. Not yet implemented — ADR-332 §Acceptance names the gates.

**Session.** 2026-09-02, session 6a3da1.
