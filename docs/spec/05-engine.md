# Sharpee Engine Specification

**Subsystem**: Engine — turn lifecycle, command pipeline, scheduler, plugins, save/restore orchestration
**Prerequisites**: `01-data-model.md`, `02-world-model.md`, `03-parser.md`, `04-grammar.md`
**Version**: 1 (derived from code as of 2026-04-16)

---

## Purpose

The engine is the runtime loop that binds all other subsystems together. It:

1. **Owns the turn cycle.** It receives input, drives the parse → validate → execute → report pipeline, ticks plugins (NPCs, scheduler, scenes, state machines), runs the text service, and emits output.
2. **Dispatches commands.** It decides whether input is a standard command, a meta-command, a platform-operation trigger, or an alternate-input-mode payload.
3. **Coordinates save/restore.** It serialises engine + world + plugin state to the client's save hook and rehydrates on restore.
4. **Maintains game lifecycle.** It tracks the current turn number, player entity, history, event log, and session metadata.
5. **Mediates extensions.** It exposes the plugin registry, parser transformers, before-action hooks, input-mode handlers, and lifecycle listeners.

The engine is **subsystem-agnostic**. It does not hardcode any particular action, trait, or grammar rule — those live in stdlib, world-model, and locale packages. The engine's job is to turn their contributions into a running game.

---

## Invariants

1. **One turn per successful action.** A successful player action advances the turn counter by exactly one. Meta-commands (SCORE, HELP, VERSION), failed parses, and disambiguation prompts do NOT advance the turn.
2. **Events are produced in phase order.** Within a turn, events are emitted in the order: action events → plugin events (NPC → scheduler → scenes → state machines, in plugin priority) → platform events → text events. The ordering is stable across runs.
3. **The world is mutated only in execute / plugin phases.** `validate`, `report`, and `blocked` phases MUST NOT mutate the world. The engine enforces this by convention (via the four-phase contract); it does not police it at runtime.
4. **ValidationResult flows across phases.** Data returned from `validate.data` is made available to `execute` and `report` via `ActionContext.validationResult` / `sharedData`. Phases do not re-compute what validate already resolved.
5. **Platform events are processed post-turn.** `platform.save_requested`, `platform.restore_requested`, `platform.quit_requested`, `platform.restart_requested`, `platform.undo_requested`, `platform.again_requested` are collected during action execution and processed *after* the action's event stream, *before* the text service, in the order they were emitted.
6. **Meta-commands do not pollute state.** A meta-command produces events that go to the text service but NOT to the event log, NOT to command history, NOT to undo snapshots.
7. **Undo snapshots are taken before state changes.** The engine captures a snapshot *before* each turn's execute phase, so undo returns to the state just before the last successful command.
8. **Restore replaces the engine's view, not just the world.** A restore load re-initialises the event source, re-populates plugin state, resets the pronoun context, and rebuilds the entity vocabulary in addition to restoring world state.

---

## Public Contract

### GameEngine interface

```
class GameEngine {
    constructor(options: {
        world:              WorldModel
        player:             IFEntity
        parser:             Parser
        language:           LanguageProvider
        perceptionService?: PerceptionService
        config?:            EngineConfig
    })

    // Story binding
    setStory(story: Story) -> Void
    getStory() -> Story?

    // Core loop
    start() -> Void
    stop(reason?, details?) -> Void
    executeTurn(input: String) -> Promise<CommandResult>

    // Context
    getContext() -> GameContext
    getWorld() -> WorldModel
    getParser() -> Parser?
    getLanguageProvider() -> LanguageProvider?
    getTextService() -> TextService?
    setTextService(service)
    getEventProcessor() -> EventProcessor
    getEventSource() -> SemanticEventSource
    getPluginRegistry() -> PluginRegistry
    getNarrativeSettings() -> NarrativeSettings

    // History & queries
    getHistory() -> List<TurnResult>
    getRecentEvents(count?) -> List<SemanticEvent>
    introspect() -> EngineIntrospection

    // Save / restore / undo
    registerSaveRestoreHooks(hooks)
    save() -> Promise<Boolean>
    restore() -> Promise<Boolean>
    undo() -> Boolean
    canUndo() -> Boolean
    getUndoLevels() -> Integer

    // Player identity (ADR-132)
    switchPlayer(entityId: EntityId) -> Void

    // Extension seams
    registerPlugin(plugin)
    unregisterPlugin(id)
    registerParsedCommandTransformer(transformer)
    unregisterParsedCommandTransformer(transformer)
    onBeforeAction(listener)
    registerInputMode(id: String, handler: InputModeHandler)

    // Vocabulary (ADR-082)
    updateEntityVocabulary(entity, inScope)
    updateScopeVocabulary()

    // Platform events (engine-emitted)
    emitPlatformEvent(event)

    // Lifecycle events
    on(event, listener)
    off(event, listener)
}
```

### EngineConfig

```
EngineConfig {
    maxHistory?:        Integer                         // trim history beyond this
    validateEvents?:    Boolean                         // invoke event validators
    collectTiming?:     Boolean                         // populate TurnResult.timing
    debug?:             Boolean
    maxUndoSnapshots?:  Integer                         // default 10; 0 disables undo
    onError?:           (Error, GameContext) -> Void
    onEvent?:           (SemanticEvent) -> Void         // event interceptor for debugging
}
```

### GameContext

The engine's view of the session:

```
GameContext {
    currentTurn:  Integer
    player:       IFEntity
    history:      List<TurnResult>
    metadata: {
        title?:    String
        author?:   String
        version?:  String
        started:   Date
        lastPlayed: Date
    }
    customState?:       Map<String, Any>      // story-level state
    implicitActions?: {                        // ADR-104
        inference?:    Boolean
        implicitTake?: Boolean
    }
}
```

### CommandResult (discriminated union)

```
CommandResult = TurnResult | MetaCommandResult

TurnResult {
    type?:             "turn"
    turn:              Integer
    input:             String
    events:            List<SemanticEvent>
    blocks?:           List<TextBlock>          // from text service
    success:           Boolean
    error?:            String
    timing?:           TimingData
    actionId?:         ActionId
    parsedCommand?:    ParsedCommand
    validatedCommand?: ValidatedCommand
    needsInput?:       Boolean                   // disambiguation or query pending
}

MetaCommandResult {
    type:       "meta"
    input:      String
    success:    Boolean
    events:     List<SemanticEvent>
    error?:     String
    actionId?:  ActionId
}
```

### TurnPlugin (ADR-120)

Subsystems that participate in the turn cycle implement this contract:

```
interface TurnPlugin {
    id:        String                        // e.g., "sharpee.plugin.scheduler"
    priority:  Integer                       // higher runs first; default 0
    onAfterAction(context: TurnPluginContext) -> List<SemanticEvent>
    getState?() -> Any                        // for save
    setState?(state)                          // for restore
}

TurnPluginContext {
    world:          WorldModel
    turn:           Integer
    playerId:       EntityId
    playerLocation: EntityId
    random:         SeededRandom
    actionResult?: {
        actionId:    ActionId
        success:     Boolean
        targetId?:   EntityId
        sharedData?: Map<String, Any>
    }
    actionEvents?:  List<SemanticEvent>
}
```

Canonical plugins:

| Plugin                           | Priority | Purpose                                                |
|----------------------------------|----------|--------------------------------------------------------|
| NPC turn plugin                   | 100      | NPCs act after the player (ADR-070)                    |
| State machine evaluation          | 80       | Puzzle / narrative transitions (ADR-119 Proposed)       |
| Scene evaluation                  | 60       | Scene begin/end conditions (ADR-149)                   |
| Scheduler (daemons + fuses)       | 50       | Timed events (ADR-071)                                 |

Stories MAY register additional plugins at any priority. The engine invokes plugins in descending priority order after each successful action.

### SchedulerService (ADR-071)

Daemons (run every turn) and fuses (countdown timers). Often implemented as a `TurnPlugin`.

```
interface SchedulerService {
    // Daemons
    registerDaemon(daemon)
    removeDaemon(id)
    pauseDaemon(id)
    resumeDaemon(id)
    hasDaemon(id) -> Boolean

    // Fuses
    setFuse(fuse)
    cancelFuse(id)
    adjustFuse(id, delta)
    pauseFuse(id)
    resumeFuse(id)
    getFuseRemaining(id) -> Integer?

    // Tick
    tick(context: SchedulerContext) -> SchedulerResult

    // Introspection
    getActiveDaemons() -> List<DaemonInfo>
    getActiveFuses() -> List<FuseInfo>

    // Save/restore
    getState() -> SchedulerState
    setState(state)
}

Daemon {
    id:         String
    name:       String                         // human-readable
    condition?: (context) -> Boolean           // optional guard
    run:        (context) -> List<SemanticEvent>
    priority?:  Integer                        // default 0
    runOnce?:   Boolean
}

Fuse {
    id:         String
    name:       String
    turns:      Integer                        // countdown
    trigger:    (context) -> List<SemanticEvent>
    entityId?:  EntityId                       // bound entity (for auto-cleanup)
    tickCondition?: (context) -> Boolean       // if false, don't decrement this turn
    onCancel?:  (context) -> List<SemanticEvent>
    priority?:  Integer
    repeat?:    Boolean
}

SchedulerContext {
    world:          WorldModel
    turn:           Integer
    random:         SeededRandom
    playerLocation: EntityId
}

SchedulerResult {
    events:          List<SemanticEvent>
    fusesTriggered:  List<FuseId>
    daemonsRun:      List<DaemonId>
}
```

Scheduler state is serialised as `ISerializedSchedulerState` (see `01-data-model.md`). New implementations SHOULD treat the scheduler as a `TurnPlugin` and save its state under `engineState.pluginStates.scheduler`.

### SaveRestoreService

```
interface SaveRestoreStateProvider {
    getWorld()          -> WorldModel
    getContext()        -> GameContext
    getStory()          -> Story?
    getEventSource()    -> SemanticEventSource
    getPluginRegistry() -> PluginRegistry
    getParser()         -> Parser?
}

interface SaveRestoreService {
    createUndoSnapshot(world, currentTurn)
    undo(world) -> { turn: Integer } | Null
    canUndo() -> Boolean
    getUndoLevels() -> Integer
    clearUndoSnapshots()

    createSaveData(provider) -> SaveData
    loadSaveData(saveData, provider) -> {
        eventSource: SemanticEventSource
        currentTurn: Integer
    }
}
```

The service produces `SaveData` conforming to the envelope in `01-data-model.md`. Restore replays nothing (the world snapshot is authoritative); event-sourced restore is future work (ADR-034).

### PlatformOperationHandler

After the action phase of a turn, the engine processes any platform-operation events emitted by actions:

```
PlatformOperation = SAVE | RESTORE | QUIT | RESTART | UNDO | AGAIN
```

Each operation has a request event (e.g., `platform.save_requested`) emitted by the corresponding action, and a completion event (`platform.save_completed` / `platform.save_failed`) emitted by the engine after the operation resolves. For QUIT and RESTART, the client can cancel (`platform.quit_cancelled` / `platform.restart_cancelled`).

### Vocabulary manager (ADR-082)

The engine ensures entity names/aliases are registered with the parser's grammar vocabulary as the player's scope changes:

```
interface VocabularyManager {
    updateEntityVocabulary(entity, inScope: Boolean)
    updateScopeVocabulary(world, playerId)       // recomputes scope and re-registers all
}
```

Called after every turn and after `switchPlayer`, before the next input is parsed.

### Story interface

```
interface Story {
    config: StoryConfig

    initializeWorld(world: WorldModel) -> Void
    createPlayer(world: WorldModel) -> IFEntity

    getCustomActions?() -> List<Action>
    getCustomVocabulary?() -> CustomVocabulary
    initialize?() -> Void
    isComplete?() -> Boolean
    extendParser?(parser)
    extendLanguage?(language)
    onEngineReady?(engine)
}

StoryConfig {
    id:            String
    title:         String
    author:        String | List<String>
    version:       String                    // semver
    buildDate?:    String                    // ISO 8601
    description?:  String
    website?:      String
    email?:        String
    tags?:         List<String>
    ifid?:         String                    // IFID (UUIDv4 uppercase)
    license?:      String
    releaseDate?:  String
    custom?:       Map<String, Any>
    narrative?:    NarrativeConfig          // ADR-089
    implicitActions?: {                      // ADR-104
        inference?:    Boolean
        implicitTake?: Boolean
    }
}
```

### Lifecycle events

The engine emits lifecycle events to registered listeners:

```
interface GameEngineEvents {
    "turn:start":    (turn: Integer, input: String) -> Void
    "turn:complete": (result: TurnResult) -> Void
    "turn:failed":   (error: Error, turn: Integer) -> Void
    "event":         (event: SemanticEvent) -> Void       // every processed event
    "state:changed": (context: GameContext) -> Void
    "game:over":     (context: GameContext) -> Void
    "text:output":   (blocks: List<TextBlock>, turn: Integer) -> Void
}
```

Semantic lifecycle events (see `01-data-model.md` for full catalog):

- `game.initializing`, `game.initialized`, `game.story_loading`, `game.story_loaded`
- `game.starting`, `game.started`
- `game.ending`, `game.ended`, `game.won`, `game.lost`, `game.quit`, `game.aborted`
- `game.session_saving`, `game.session_saved`, `game.session_restoring`, `game.session_restored`
- `game.pc_switched`, `game.initialization_failed`, `game.story_load_failed`, `game.fatal_error`
- `turn.started`, `turn.ended`

---

## Turn Cycle (normative)

The engine's turn cycle, phase by phase:

```
 INPUT ──────────────────────────────────────────────────────────────
   │
   ├─ 0. Input-mode check (ADR-137)
   │     If world.state[INPUT_MODE_STATE_KEY] is set to a registered mode,
   │     route raw input to that handler and skip steps 1–7.
   │     Turn advances only if handler.advancesTurn = true.
   │
   ├─ 1. Parse
   │     parser.parse(input) → ParsedCommand or ParseError
   │     Optionally: parser.parseChain() for period/comma-separated commands.
   │
   ├─ 2. Transform parsed command (optional)
   │     For each registered ParsedCommandTransformer:
   │       parsed = transformer(parsed, world)
   │
   ├─ 3. Meta-command check
   │     If parsed.action is a meta-command (SCORE, HELP, VERSION, ABOUT,
   │     SAVE, RESTORE, QUIT, RESTART, UNDO, AGAIN, NOTIFY ON/OFF, BRIEF/VERBOSE):
   │       - Execute outside the standard turn cycle
   │       - Do NOT increment turn counter
   │       - Do NOT trigger plugins
   │       - Do NOT create undo snapshot
   │       - Return MetaCommandResult
   │
   ├─ 4. Validate
   │     CommandExecutor.validateCommand(parsed) → ValidatedCommand or ValidationError
   │     - Resolve object references to entities (using scope + disambiguation)
   │     - Determine actionId
   │     - Pronoun resolution has already happened in parse; validator trusts NounPhrase.entityId
   │
   ├─ 5. Before-action hook (ADR-148)
   │     Emit to all BeforeActionHookListeners. Listeners MAY mutate the world
   │     (break concealment, consume a charge). Runs AFTER validation, BEFORE execute.
   │
   ├─ 6. Action four-phase execution
   │     a) validate(context) → ValidationResult (no side effects)
   │     b) before emitting anything: check capability-dispatch for this action
   │         (ADR-090). If a trait on the target declares capability, delegate
   │         the four phases to the trait's CapabilityBehavior.
   │     c) if valid: execute(context) — mutations only, no events
   │     d) if valid: report(context) → List<Effect> → emitted events
   │     e) if invalid: blocked(context, result) → List<Effect> → emitted events
   │     (See 06-stdlib.md for the full four-phase contract.)
   │
   ├─ 7. Undo snapshot
   │     Before step 8, capture an undo snapshot (world + context). Skipped
   │     if maxUndoSnapshots = 0.
   │
   ├─ 8. Plugin phase (in priority order, descending)
   │     For each TurnPlugin registered in PluginRegistry:
   │       events = plugin.onAfterAction(pluginContext)
   │       Process through the event pipeline (enrichment, perception filter,
   │       platform event extraction, emission).
   │
   │     Standard plugins (canonical priorities):
   │       100 — NPC turn phase (ADR-070)
   │        80 — State machine evaluation (ADR-119 Proposed)
   │        60 — Scene evaluation (ADR-149)
   │        50 — Scheduler (daemons + fuses, ADR-071)
   │
   ├─ 9. Platform operations
   │     For each platform event collected in steps 6 & 8 (save, restore,
   │     quit, restart, undo, again):
   │       - Call the corresponding SaveRestoreHook or engine routine
   │       - Emit completion event
   │     Restore, Restart, and Undo may mutate or replace world state.
   │
   ├─ 10. Text service
   │     textService.processTurn(turnEvents) → TextOutput (blocks)
   │     See 07-text-service.md.
   │
   ├─ 11. Pronoun context update
   │     parser.updatePronounContext(validatedCommand, turnNumber)
   │     Only runs if the turn succeeded (validation + execution).
   │
   ├─ 12. Turn counter + context update
   │     - currentTurn += 1
   │     - Append TurnResult to history (respecting maxHistory)
   │     - Update command history capability
   │     - Update scope vocabulary for new player location
   │
   ├─ 13. Lifecycle emission
   │     - "turn:complete" listener
   │     - "text:output" listener
   │     - "state:changed" listener
   │     - "game:over" if applicable (victory/defeat/quit)
   │
   └─ RETURN TurnResult
```

**Meta-command flow** (step 3) is a parallel, shorter path: validate → execute → text service → emit. No turn increment, no plugins, no undo, no command history.

**Game-over detection**: Semantic events of type `game.won`, `game.lost`, `game.quit`, `game.aborted` trigger the `game:over` lifecycle event after the turn completes. The engine also accepts explicit `stop(reason, details)` calls.

---

## Event Processing Pipeline

Each event produced by an action phase or a plugin goes through a processing pipeline before being added to the turn's event list and emitted to listeners:

```
raw event
   │
   ├─ 1. Enrich
   │     Normalise `id`, `timestamp`, `entities`. Set `metadata.turn`, `.source`.
   │
   ├─ 2. Perception filter (optional, ADR-069)
   │     If a PerceptionService is registered, filter events by whether the
   │     player (or NPC observer) can perceive them. Events that the player
   │     cannot perceive are dropped from the player's event list but remain
   │     in the underlying event source for NPC reactions.
   │
   ├─ 3. Platform-event extraction
   │     If event.type starts with "platform.", collect into pendingPlatformOps
   │     instead of the turn's visible events.
   │
   ├─ 4. Append to turn events
   │     Add to this turn's event list, keyed by turn number.
   │
   ├─ 5. Add to event source
   │     Append to the world's event source; handlers fire (ADR-086).
   │
   ├─ 6. Emit
   │     Notify the engine's "event" listeners and config.onEvent, if set.
   │
   └─ 7. Entity handlers (optional)
         Dispatch to per-entity handlers registered on the world.
```

Handlers registered on the world via `registerEventHandler`, `registerEventValidator`, `registerEventPreviewer`, or `chainEvent` (ADR-086, ADR-094) fire during step 5.

---

## Meta-Commands

The following commands are meta-commands. Their action IDs are reserved; stories MAY replace their behaviour but SHOULD NOT repurpose the IDs.

| Action ID                | Typical verbs             | Effect                                              |
|--------------------------|---------------------------|-----------------------------------------------------|
| `if.action.about`        | about, credits            | Show story metadata                                 |
| `if.action.help`         | help, ?                   | Show help text                                      |
| `if.action.scoring`      | score                     | Show current score                                  |
| `if.action.version`      | version                   | Show engine + story versions                        |
| `if.action.notifying_on` | notify on                 | Enable score notifications                          |
| `if.action.notifying_off`| notify off                | Disable score notifications                         |
| `if.action.brief`        | brief                     | Short room descriptions on revisit                  |
| `if.action.verbose`      | verbose                   | Always full room descriptions                       |
| `if.action.superbrief`   | superbrief                | Names only                                          |
| `if.action.saving`       | save                      | Emit `platform.save_requested`                      |
| `if.action.restoring`    | restore                   | Emit `platform.restore_requested`                   |
| `if.action.quitting`     | quit                      | Emit `platform.quit_requested`                      |
| `if.action.restarting`   | restart                   | Emit `platform.restart_requested`                   |
| `if.action.undoing`      | undo                      | Emit `platform.undo_requested`                      |
| `if.action.again`        | again, g                  | Emit `platform.again_requested`                     |

Meta-commands run through a simplified pipeline: validate + execute + text-service. They return a `MetaCommandResult`. The turn counter does not advance; history does not record them; undo is not created.

---

## Extension Points

1. **TurnPlugin registration** — `engine.registerPlugin(plugin)`. Arbitrary reactive subsystems.
2. **ParsedCommandTransformer** — `engine.registerParsedCommandTransformer(fn)`. Rewrite a `ParsedCommand` after parsing, before validation. Used for debug / cheat modes and for input-mode shims.
3. **Before-action hook** (ADR-148) — `engine.onBeforeAction(listener)`. Fires after validation, before execute. MAY mutate the world.
4. **InputModeHandler** (ADR-137) — `engine.registerInputMode(id, handler)`. When `world.state[INPUT_MODE_STATE_KEY]` equals `id`, input is routed to the handler, bypassing the parser. Used for puzzles that take raw text (combinations, passwords, NPC dialogues).
5. **Action interceptors** (ADR-118) — Traits MAY declare `static interceptors = [...]` of action IDs. The stdlib action checks for interceptors before running standard resolution. (See `06-stdlib.md` for the interceptor contract.)
6. **Event handlers / validators / previewers** — Via the world model's event system (ADR-086).
7. **Custom meta-commands** — Register an action with a reserved `group: "meta"`. The engine recognises any action in this group as a meta-command.
8. **Save/restore hooks** — `engine.registerSaveRestoreHooks({ onSaveRequested, onRestoreRequested, onQuitRequested?, onRestartRequested? })`.
9. **Narrative settings** — Per-story `NarrativeConfig` (perspective + player pronouns).
10. **Vocabulary extension** — `story.getCustomVocabulary()` + `parser.getStoryGrammar()`.

---

## Event / Command Catalog (engine-owned)

The engine emits (or propagates) these event types in addition to those cataloged in other specs:

| Type                            | Emitted by         | Purpose                                  |
|---------------------------------|--------------------|------------------------------------------|
| `game.*`                        | engine             | Lifecycle (see above)                    |
| `turn.started` / `turn.ended`   | engine             | Turn boundaries                          |
| `platform.save_*`               | actions + engine   | Save request/completion                  |
| `platform.restore_*`            | actions + engine   | Restore request/completion               |
| `platform.quit_*`               | actions + engine   | Quit request/confirmation                |
| `platform.restart_*`            | actions + engine   | Restart request/completion               |
| `platform.undo_*`               | actions + engine   | Undo request/completion                  |
| `platform.again_*`              | actions + engine   | AGAIN / G command                        |
| `query.pending` / `query.invalid` / `query.response` | engine | PC query system (ADR-018) |

---

## Mandatory vs Optional

| Feature                                        | Required | Notes |
|------------------------------------------------|----------|-------|
| Turn cycle (steps 1–13)                         | **Required** |       |
| Command pipeline (parse → validate → execute → report) | **Required** |       |
| Four-phase action contract                      | **Required** | Enforced by convention; see 06-stdlib.md |
| Meta-command handling                           | **Required** |       |
| Platform-operation dispatch (save/restore/quit/restart/undo/again) | **Required** |       |
| Lifecycle events                                | **Required** |       |
| Turn event log + history                        | **Required** |       |
| Plugin registry (ADR-120)                       | Recommended | Alternative: hardcoded NPC + scheduler phases |
| SchedulerService (ADR-071)                      | Recommended | Needed for timed events (fuses, daemons) |
| NPC turn phase                                  | Recommended | Needed if the game has autonomous NPCs |
| Scene evaluation (ADR-149)                      | Optional | Needed if the game uses scenes |
| State-machine plugin (ADR-119)                  | Optional | Proposed — not yet in reference impl |
| Undo support                                    | Recommended | Configurable depth |
| Save/restore hooks                              | **Required** |       |
| Event source with handlers/validators/chains    | **Required** |       |
| Perception filtering (ADR-069)                  | Optional | Needed for NPC perception simulation |
| Before-action hook (ADR-148)                    | Optional | Needed for concealment + similar |
| ParsedCommandTransformer                        | Optional | Needed for debug / cheat modes |
| InputModeHandler (ADR-137)                      | Optional | Needed for non-parser input (password puzzles) |
| Narrative settings (ADR-089)                    | Recommended | Needed for 1st/3rd person narrative |
| Vocabulary manager (ADR-082)                    | **Required** | Keeps parser scope in sync with world |
| introspect()                                    | Optional | Needed for tooling (VS Code extension) |
| Pronoun-context update (ADR-089)                | **Required** | Required for "it / them / him / her" |
| Turn-timing collection                          | Optional |       |
| Implicit inference (ADR-104)                    | Optional |       |
| switchPlayer (ADR-132)                          | Optional | Needed for multi-PC stories |

---

## Implementation Notes

**ADR-060 (Accepted)** — Command executor refactor. The `CommandExecutor` is an engine component orchestrating validate → execute → report/blocked. It does not own event creation; events are produced by actions and the engine enriches them.

**ADR-069 (Accepted)** — Perception event filtering. The engine filters events through an optional `PerceptionService` to decide which events each observer (player or NPC) perceives.

**ADR-070 (Accepted)** — NPC system. NPCs act after the player in a dedicated plugin phase. In the plugin architecture, the NPC phase is a `TurnPlugin`.

**ADR-071 (Implemented)** — Daemons and fuses. `SchedulerService` is implemented and integrated into the turn cycle. Scheduler state is serialised as part of `EngineState.schedulerState` (legacy) or `EngineState.pluginStates.scheduler` (ADR-120 path).

**ADR-082 (Accepted)** — Typed event system. The engine's event registry supports compile-time typed event data.

**ADR-086 (Accepted)** — Event handler unification. World-model handlers, validators, previewers, and chain handlers are wired into the engine's `EventProcessor` via `world.connectEventProcessor(wiring)`.

**ADR-090 (Accepted)** — Capability dispatch. The engine's `capability-dispatch-helper` checks for trait-declared capabilities before running stdlib action logic. Resolution modes: `first-wins`, `any-blocks`, `all-must-pass`, `highest-priority`.

**ADR-094 (Accepted)** — Event chains. Chain handlers registered on the world produce follow-up events during the event processing pipeline.

**ADR-104** — Implicit inference. If validation fails on a pronoun-resolved command, the engine MAY re-run with an alternate target (e.g., "read it" where `it=mailbox` failed because mailbox isn't readable, so infer leaflet if it's the only readable nearby). Default on; configurable per story.

**ADR-106** — Domain events and event sourcing. Future work; reserves the option to replace the snapshot-based save with pure event-sourced persistence.

**ADR-118 (Accepted)** — Stdlib action interceptors. Traits can intercept standard actions before the stdlib logic runs, enabling guard behaviours (troll blocks take) without forking every action.

**ADR-119 (Proposed)** — State-machine plugin for puzzle and narrative transitions. Not required for conformance.

**ADR-120 (Proposed)** — Plugin architecture. The reference implementation has adopted the `TurnPlugin` pattern for NPC + scheduler + scenes. A conforming implementation MAY hardcode these subsystems; the plugin pattern is recommended for extensibility.

**ADR-121** — Story runner architecture. Describes how `executeTurn` is driven by different hosts (CLI, browser, Zifmia). A conforming implementation provides the `GameEngine` interface; host-specific drivers are out of scope.

**ADR-132** — Player character switching. `engine.switchPlayer(entityId)` moves the `isPlayer` flag, rebuilds parser context, and resets pronoun state.

**ADR-133** — Text blocks. `TurnResult.blocks` contains structured text output (see `07-text-service.md`). The raw `events` array is also available.

**ADR-137 (Accepted)** — Input modes. The engine reads `world.state[INPUT_MODE_STATE_KEY]` (`"if.inputMode"`) before parsing. If set, routes input to the registered handler.

**ADR-148 (Accepted)** — Before-action hook. Listeners fire before the action's validate phase and MAY mutate the world.

**Meta-command list** — The reference implementation defines ~15 meta-actions. A conforming implementation MAY omit some (NOTIFY ON/OFF, BRIEF/VERBOSE) if the game has no use for them; SAVE, RESTORE, QUIT, RESTART, UNDO, AGAIN, SCORE, HELP, VERSION, ABOUT SHOULD all be provided.

---

## Glossary (local)

- **Turn cycle** — The sequence of phases the engine runs per input (parse → … → turn complete).
- **Meta-command** — A command that sits outside the turn cycle (SCORE, HELP, SAVE, etc.).
- **Platform operation** — A save/restore/quit/restart/undo/again operation deferred to after the action phase.
- **TurnPlugin** — A subsystem participating in the plugin phase of the turn cycle.
- **Scheduler** — The service managing daemons and fuses (ADR-071).
- **Daemon** — A function that runs every turn.
- **Fuse** — A countdown timer that triggers once (or repeats) after N turns.
- **Before-action hook** — Listener that fires after validation but before execute.
- **Input mode** — Alternate input handler that bypasses the parser (ADR-137).
- **Pronoun context** — Parser-managed memory for "it / them / him / her"; updated by the engine after successful commands.

A full glossary will be produced in Phase 8.

---

*End of 05-engine.md*
