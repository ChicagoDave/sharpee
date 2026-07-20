# Plugins

Plugin system, NPC plugin, scheduler (daemons/fuses), state machine.

---

## @sharpee/plugins

### turn-plugin

```typescript
import { ISemanticEvent } from '@sharpee/core';
import { TurnPluginContext } from './turn-plugin-context.js';
/**
 * A turn-cycle plugin: code that runs once after each successful player action
 * to contribute additional world changes and events (ADR-120).
 *
 * The engine invokes every registered plugin's {@link TurnPlugin.onAfterAction}
 * in descending {@link TurnPlugin.priority} order (NPC behaviour at 100, state
 * machines at 75, the scheduler at 50). Plugins do not run for meta-commands or
 * for failed actions.
 */
export interface TurnPlugin {
    /** Unique plugin identifier. Registering two plugins with the same id throws. */
    id: string;
    /** Run order within a turn; higher priority runs first. */
    priority: number;
    /**
     * Called once per successful player action. Return the semantic events the
     * plugin produces; the engine merges a non-empty array into the turn's event
     * stream. Return an empty array to contribute nothing.
     */
    onAfterAction(context: TurnPluginContext): ISemanticEvent[];
    /** Optional: return serializable state to persist when the game is saved. */
    getState?(): unknown;
    /** Optional: restore previously-saved state when the game is loaded. */
    setState?(state: unknown): void;
}
```

### turn-plugin-context

```typescript
import { EntityId, SeededRandom, ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
/** Summary of the player action that just completed, passed to each plugin. */
export interface TurnPluginActionResult {
    /** The action's id (the verb that ran). */
    actionId: string;
    /**
     * Whether the action GENUINELY succeeded (platform-issue-sweep Phase 7):
     * false when the action was refused/blocked — including modern blocked()
     * paths that reuse the primary event type with `blocked: true` /
     * `failed: true` instead of emitting `action.error`. Plugins still run
     * after refused actions (NPC/scheduler ticks are turn-level); consumers
     * that must not react to refusals (state-machine action triggers) gate on
     * this flag.
     */
    success: boolean;
    /** The action's direct-object entity, when it had one. */
    targetId?: EntityId;
    /** Arbitrary data the action chose to share, keyed by the action. */
    sharedData?: Record<string, unknown>;
}
/** Read-only turn context the engine passes to each plugin's onAfterAction. */
export interface TurnPluginContext {
    /** The live world model. */
    world: WorldModel;
    /** The current turn number. */
    turn: number;
    /** The player entity id. */
    playerId: EntityId;
    /** The player's current location id. */
    playerLocation: EntityId;
    /**
     * The engine's seeded RNG. Use this instead of `Math.random` so turns stay
     * deterministic and replayable.
     */
    random: SeededRandom;
    /** The action that just completed this turn. */
    actionResult?: TurnPluginActionResult;
    /** The semantic events the action emitted this turn. */
    actionEvents?: ISemanticEvent[];
}
```

### plugin-registry

```typescript
import { TurnPlugin } from './turn-plugin.js';
/**
 * Holds the turn plugins for a running game and hands them to the engine in
 * priority order each turn (ADR-120). The engine owns the single registry;
 * stories add behaviour through the plugin packages (NPC, scheduler, state
 * machine) rather than implementing {@link TurnPlugin} directly.
 */
export declare class PluginRegistry {
    private plugins;
    /** Register a plugin. Throws if a plugin with the same id is already registered. */
    register(plugin: TurnPlugin): void;
    /** Remove a plugin by id; a no-op if no such plugin is registered. */
    unregister(id: string): void;
    /** Remove all registered plugins. */
    clear(): void;
    /** All registered plugins, sorted by descending priority (turn run order). */
    getAll(): TurnPlugin[];
    /** Look up a single plugin by id, or `undefined` if absent. */
    getById(id: string): TurnPlugin | undefined;
    /**
     * Collect each plugin's {@link TurnPlugin.getState} result, keyed by plugin id,
     * for inclusion in a save. Plugins without `getState` are omitted.
     */
    getStates(): Record<string, unknown>;
    /**
     * Restore plugin state from a prior {@link PluginRegistry.getStates} result on
     * load, calling each matching plugin's {@link TurnPlugin.setState}. Entries
     * with no registered plugin (or no `setState`) are skipped.
     */
    setStates(states: Record<string, unknown>): void;
}
```

## @sharpee/plugin-npc

### npc-plugin

```typescript
/**
 * NpcPlugin - Wraps NPC service as a TurnPlugin (ADR-070, ADR-120)
 *
 * Priority 100: Runs before scheduler (50) and state machines (75).
 * NPCs act immediately after the player's action.
 */
import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { INpcService } from '@sharpee/stdlib';
/**
 * The {@link TurnPlugin} that lets NPCs act each turn (ADR-070, ADR-120).
 *
 * Runs at priority 100 — before state machines (75) and the scheduler (50), so
 * NPCs react immediately after the player's action. It wraps the NPC service
 * from `@sharpee/stdlib`, pre-registering the standard `guard` and `passive`
 * behaviours. Register the plugin with the engine, then add story-specific
 * behaviours through {@link getNpcService}.
 */
export declare class NpcPlugin implements TurnPlugin {
    /** Stable plugin id. */
    id: string;
    /** Run order within a turn (NPCs act first). */
    priority: number;
    private service;
    constructor();
    /**
     * Tick the NPC service for this turn and return the events NPCs produced.
     *
     * After the per-turn tick (which drives each NPC's `onTurn`), this also fires
     * the room-entry/exit hooks when the player's action moved them this turn:
     * an `if.event.actor_moved` in `ctx.actionEvents` is always the player's move
     * (NPC movement is produced here, not in the player's action events), so the
     * NPCs in the room left react via `onPlayerLeaves` and those in the room
     * entered react via `onPlayerEnters` (e.g. a greeting emote). Without this the
     * service's `onPlayerEnters`/`onPlayerLeaves` hooks have no runtime caller.
     */
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[];
    /**
     * Returns an empty object: NPC state lives in world-model entity traits, so it
     * is saved with the world and the plugin holds nothing of its own.
     */
    getState(): unknown;
    /** No-op: NPC state is restored with the world model, not by this plugin. */
    setState(_state: unknown): void;
    /**
     * The underlying NPC service — the author hook for registering custom NPC
     * behaviours. The service type (`INpcService`) and behaviour helpers live in
     * `@sharpee/stdlib`.
     */
    getNpcService(): INpcService;
}
```

## @sharpee/plugin-scheduler

### types

```typescript
/**
 * Scheduler types for Daemons and Fuses (ADR-071)
 *
 * Daemons: Processes that run every turn
 * Fuses: Countdown timers that trigger after N turns
 */
import { ISemanticEvent, EntityId, SeededRandom } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
export { SeededRandom } from '@sharpee/core';
/**
 * Context passed to daemon and fuse handlers
 */
export interface SchedulerContext {
    /** The world model */
    world: WorldModel;
    /** Current turn number */
    turn: number;
    /** Seeded random number generator */
    random: SeededRandom;
    /** Player's current location */
    playerLocation: EntityId;
    /** Player entity ID */
    playerId: EntityId;
}
/**
 * A daemon is a function that runs every turn
 */
export interface Daemon {
    /** Unique identifier */
    id: string;
    /** Human-readable name for debugging */
    name: string;
    /** Condition for running (optional - if omitted, always runs) */
    condition?: (context: SchedulerContext) => boolean;
    /** The daemon's action - returns semantic events */
    run: (context: SchedulerContext) => ISemanticEvent[];
    /** Priority for ordering (higher = runs first, default 0) */
    priority?: number;
    /** If true, daemon removes itself after first successful run */
    runOnce?: boolean;
    /** Optional: return runner-specific state for serialization (ADR-123) */
    getRunnerState?: () => Record<string, unknown>;
    /** Optional: restore runner-specific state after deserialization (ADR-123) */
    restoreRunnerState?: (state: Record<string, unknown>) => void;
}
/**
 * A fuse is a countdown timer that triggers after N turns
 */
export interface Fuse {
    /** Unique identifier */
    id: string;
    /** Human-readable name for debugging */
    name: string;
    /** Turns until trigger (counts down each tick) */
    turns: number;
    /** What happens when it triggers - returns semantic events */
    trigger: (context: SchedulerContext) => ISemanticEvent[];
    /** Optional: entity this fuse is bound to (for automatic cleanup) */
    entityId?: EntityId;
    /** Optional: condition for ticking (if false, turn doesn't count down) */
    tickCondition?: (context: SchedulerContext) => boolean;
    /** What happens if cancelled before triggering (cleanup) */
    onCancel?: (context: SchedulerContext) => ISemanticEvent[];
    /** Priority for ordering multiple simultaneous triggers */
    priority?: number;
    /** If true, fuse repeats after triggering */
    repeat?: boolean;
    /** Original turns value for repeating fuses */
    originalTurns?: number;
}
/**
 * Runtime state for a daemon
 */
export interface DaemonState {
    id: string;
    isPaused: boolean;
    runCount: number;
    /** Runner-specific state for typed daemons (ADR-123) */
    runnerState?: Record<string, unknown>;
}
/**
 * Runtime state for a fuse
 */
export interface FuseState {
    id: string;
    turnsRemaining: number;
    isPaused: boolean;
    entityId?: EntityId;
    /** Skip the next tick after fuse is set, so countdown matches turns value */
    skipNextTick?: boolean;
}
/**
 * Info about an active daemon (for debugging/introspection)
 */
export interface DaemonInfo {
    id: string;
    name: string;
    isPaused: boolean;
    runCount: number;
    priority: number;
}
/**
 * Info about an active fuse (for debugging/introspection)
 */
export interface FuseInfo {
    id: string;
    name: string;
    turnsRemaining: number;
    isPaused: boolean;
    entityId?: EntityId;
    priority: number;
    repeat: boolean;
}
/**
 * Result of a scheduler tick
 */
export interface SchedulerResult {
    /** Events generated by daemons and fuses */
    events: ISemanticEvent[];
    /** IDs of fuses that triggered this tick */
    fusesTriggered: string[];
    /** IDs of daemons that ran this tick */
    daemonsRun: string[];
}
/**
 * Serializable scheduler state for save/load
 */
export interface SchedulerState {
    /** Current turn number */
    turn: number;
    /** Daemon states */
    daemons: DaemonState[];
    /** Fuse states */
    fuses: FuseState[];
    /** Random seed */
    randomSeed: number;
}
/**
 * Scheduler event types for lifecycle events
 */
export type SchedulerEventType = 'daemon.registered' | 'daemon.removed' | 'daemon.paused' | 'daemon.resumed' | 'fuse.set' | 'fuse.triggered' | 'fuse.cancelled' | 'fuse.paused' | 'fuse.resumed';
```

### scheduler-service

```typescript
/**
 * SchedulerService - Manages Daemons and Fuses (ADR-071)
 *
 * The scheduler runs during the turn cycle, after NPCs act:
 * 1. Player action
 * 2. NPC turns
 * 3. Scheduler tick (daemons run, fuses count down)
 * 4. Turn complete
 */
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { Daemon, Fuse, DaemonInfo, FuseInfo, SchedulerResult, SchedulerState, SeededRandom } from './types.js';
/**
 * SchedulerService interface
 */
export interface ISchedulerService {
    registerDaemon(daemon: Daemon): void;
    removeDaemon(id: string): void;
    pauseDaemon(id: string): void;
    resumeDaemon(id: string): void;
    hasDaemon(id: string): boolean;
    setFuse(fuse: Fuse): void;
    cancelFuse(id: string): ISemanticEvent[];
    getFuseRemaining(id: string): number | undefined;
    adjustFuse(id: string, delta: number): void;
    pauseFuse(id: string): void;
    resumeFuse(id: string): void;
    hasFuse(id: string): boolean;
    tick(world: WorldModel, turn: number, playerId: EntityId): SchedulerResult;
    getActiveDaemons(): DaemonInfo[];
    getActiveFuses(): FuseInfo[];
    getState(): SchedulerState;
    setState(state: SchedulerState): void;
    cleanupEntity(entityId: EntityId): ISemanticEvent[];
    getRandom(): SeededRandom;
}
/**
 * SchedulerService implementation
 */
export declare class SchedulerService implements ISchedulerService {
    private daemons;
    private daemonStates;
    private fuses;
    private fuseStates;
    private random;
    private currentTurn;
    constructor(seed?: number);
    registerDaemon(daemon: Daemon): void;
    removeDaemon(id: string): void;
    pauseDaemon(id: string): void;
    resumeDaemon(id: string): void;
    hasDaemon(id: string): boolean;
    setFuse(fuse: Fuse): void;
    cancelFuse(id: string): ISemanticEvent[];
    getFuseRemaining(id: string): number | undefined;
    adjustFuse(id: string, delta: number): void;
    pauseFuse(id: string): void;
    resumeFuse(id: string): void;
    hasFuse(id: string): boolean;
    tick(world: WorldModel, turn: number, playerId: EntityId): SchedulerResult;
    getActiveDaemons(): DaemonInfo[];
    getActiveFuses(): FuseInfo[];
    getState(): SchedulerState;
    setState(state: SchedulerState): void;
    cleanupEntity(entityId: EntityId): ISemanticEvent[];
    getRandom(): SeededRandom;
    private createContext;
    private getSortedDaemons;
    private getSortedFuses;
}
/**
 * Create a new SchedulerService instance
 */
export declare function createSchedulerService(seed?: number): ISchedulerService;
```

### scheduler-plugin

```typescript
/**
 * SchedulerPlugin - Wraps SchedulerService as a TurnPlugin (ADR-120)
 *
 * Priority 50: Runs after NPCs (100) and state machines (75).
 * Daemons and fuses are background temporal events.
 */
import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { ISchedulerService } from './scheduler-service.js';
export declare class SchedulerPlugin implements TurnPlugin {
    id: string;
    priority: number;
    private service;
    constructor(seed?: number);
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[];
    getState(): unknown;
    setState(state: unknown): void;
    /** Public access for stories that need daemon/fuse registration */
    getScheduler(): ISchedulerService;
}
```

## @sharpee/plugin-state-machine

### types

```typescript
/**
 * State Machine Types (ADR-119)
 *
 * Declarative state machine definitions for puzzle and narrative orchestration.
 *
 * Entity references in these types use a binding convention: a string starting
 * with `$` (e.g. `$door`) is a role looked up in the machine's
 * {@link EntityBindings}; any other string is a literal entity id.
 */
import { EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
/** A complete declarative state machine: its states and where it starts. */
export interface StateMachineDefinition {
    /** Unique machine id. Registering two machines with the same id throws. */
    id: string;
    /** Optional human-readable description of what the machine models. */
    description?: string;
    /** The state the machine begins in; must be a key of {@link states}. */
    initialState: string;
    /** All states, keyed by state name. */
    states: Record<string, StateDefinition>;
}
/** One state within a machine. */
export interface StateDefinition {
    /** Optional description of the state. */
    description?: string;
    /** Transitions out of this state, tried in descending `priority` each turn. */
    transitions?: TransitionDefinition[];
    /** Effects run when the machine enters this state. */
    onEnter?: Effect[];
    /** Effects run when the machine leaves this state. */
    onExit?: Effect[];
    /** When true, the machine stops evaluating once in this state (an end state). */
    terminal?: boolean;
}
/** A single edge from the owning state to {@link target}. */
export interface TransitionDefinition {
    /** Name of the state to move to when this transition fires. */
    target: string;
    /** What causes this transition to be considered. */
    trigger: TransitionTrigger;
    /** Optional extra condition that must hold for the transition to fire. */
    guard?: GuardCondition;
    /** Effects run as part of taking this transition (after onExit, before onEnter). */
    effects?: Effect[];
    /** Higher priority transitions are tried first; defaults to 0. */
    priority?: number;
}
/** What can cause a transition to be considered. */
export type TransitionTrigger = ActionTrigger | EventTrigger | ConditionTrigger;
/** Fires when the player runs a specific action (optionally on a specific target). */
export interface ActionTrigger {
    type: 'action';
    /** The action id to match (the verb that ran). */
    actionId: string;
    /** Optional target to match: a role reference (`$door`) or a literal entity id. */
    targetEntity?: string;
}
/** Fires when one of the turn's action events matches. */
export interface EventTrigger {
    type: 'event';
    /** The event type to match. */
    eventId: string;
    /** Optional event-data fields that must match; `$`-values resolve via bindings. */
    filter?: Record<string, unknown>;
}
/** Fires when a guard condition evaluates true (no player action required). */
export interface ConditionTrigger {
    type: 'condition';
    /** The condition to evaluate against world state each turn. */
    condition: GuardCondition;
}
/** A boolean condition evaluated against world state. */
export type GuardCondition = EntityGuard | StateGuard | LocationGuard | InventoryGuard | CompositeGuard | CustomGuard;
/** True when an entity's trait property equals a value. */
export interface EntityGuard {
    type: 'entity';
    /** Role reference (`$x`) or literal id of the entity to inspect. */
    entityRef: string;
    /** Trait name on the entity. */
    trait: string;
    /** Property of that trait to read. */
    property: string;
    /** Value the property must equal. */
    value: unknown;
}
/** True when a world state value equals a value. */
export interface StateGuard {
    type: 'state';
    /** World state key (see `world.getStateValue`). */
    key: string;
    /** Value the state must equal. */
    value: unknown;
}
/** True when an actor is in a given room. */
export interface LocationGuard {
    type: 'location';
    /** Role/id of the actor; defaults to the player when omitted. */
    actorRef?: string;
    /** Role/id of the room the actor must be in. */
    roomRef: string;
}
/** True when an actor is carrying a given entity. */
export interface InventoryGuard {
    type: 'inventory';
    /** Role/id of the carrier; defaults to the player when omitted. */
    actorRef?: string;
    /** Role/id of the entity that must be carried. */
    entityRef: string;
}
/** Combines other guards with boolean logic. */
export interface CompositeGuard {
    /** `and` = all true, `or` = any true, `not` = not all true. */
    type: 'and' | 'or' | 'not';
    /** The sub-conditions to combine. */
    conditions: GuardCondition[];
}
/** A guard backed by a custom predicate function. */
export interface CustomGuard {
    type: 'custom';
    /** Returns true when the guard passes. */
    evaluate: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => boolean;
}
/** A world mutation or event emission performed when a transition/state fires. */
export type Effect = MoveEntityEffect | RemoveEntityEffect | SetTraitEffect | SetStateEffect | MessageEffect | EmitEventEffect | CustomEffect;
/** Move an entity to a destination. */
export interface MoveEntityEffect {
    type: 'move';
    /** Role/id of the entity to move. */
    entityRef: string;
    /** Role/id of the destination (room or container). */
    destinationRef: string;
}
/** Remove an entity from the world. */
export interface RemoveEntityEffect {
    type: 'remove';
    /** Role/id of the entity to remove. */
    entityRef: string;
}
/** Set a property on an entity's trait. */
export interface SetTraitEffect {
    type: 'set_trait';
    /** Role/id of the entity. */
    entityRef: string;
    /** Trait name. */
    trait: string;
    /** Property to set. */
    property: string;
    /** Value to assign. */
    value: unknown;
}
/** Set a world state value. */
export interface SetStateEffect {
    type: 'set_state';
    /** World state key. */
    key: string;
    /** Value to store. */
    value: unknown;
}
/** Emit a message event for the player to see. */
export interface MessageEffect {
    type: 'message';
    /** Message id to resolve via the language provider. */
    messageId: string;
    /** Optional parameters for the message template. */
    params?: Record<string, unknown>;
}
/** Emit an arbitrary semantic event. */
export interface EmitEventEffect {
    type: 'emit_event';
    /** The event type to emit. */
    eventType: string;
    /** Optional role/id entities to attach, by semantic role; `$`-values resolve via bindings. */
    entities?: {
        actor?: string;
        target?: string;
        instrument?: string;
        location?: string;
    };
    /** Optional event payload. */
    data?: unknown;
}
/** An effect backed by a custom function. */
export interface CustomEffect {
    type: 'custom';
    /** Performs the effect and returns events/messages to emit. */
    execute: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => EffectResult;
}
/** What a {@link CustomEffect} returns: events and/or messages to emit. */
export interface EffectResult {
    /** Semantic events to emit. */
    events?: Array<{
        type: string;
        entities?: Record<string, string>;
        data?: unknown;
    }>;
    /** Messages to show the player. */
    messages?: Array<{
        messageId: string;
        params?: Record<string, unknown>;
    }>;
}
/** Maps role names (e.g. `$door`) to concrete entity ids for one machine instance. */
export type EntityBindings = Record<string, EntityId>;
/** The saveable state of a single running machine. */
export interface StateMachineInstanceState {
    /** The machine's id. */
    id: string;
    /** The state it is currently in. */
    currentState: string;
    /** The ordered list of states it has occupied. */
    history: string[];
}
/** The saveable state of the whole registry (all machine instances). */
export interface StateMachineRegistryState {
    /** One entry per registered machine. */
    instances: StateMachineInstanceState[];
}
/** Per-turn context handed to the runtime when evaluating transitions. */
export interface EvaluationContext {
    /** The live world model. */
    world: WorldModel;
    /** The player entity id. */
    playerId: EntityId;
    /** The player's current location id. */
    playerLocation: EntityId;
    /** The current turn number. */
    turn: number;
    /** The id of the action that ran this turn, if any. */
    actionId?: string;
    /**
     * Whether that action GENUINELY succeeded (platform-issue-sweep Phase 7).
     * Action triggers require `true` — a refused/blocked action must never
     * advance a machine. Populated by the plugin from the engine's
     * TurnPluginActionResult.success; absent only when no action ran.
     */
    actionSucceeded?: boolean;
    /** The direct-object entity id of that action, if any. */
    actionTargetId?: EntityId;
    /** The semantic events the action emitted this turn. */
    actionEvents?: Array<{
        type: string;
        data?: unknown;
        entities?: Record<string, string>;
    }>;
}
```

### state-machine-plugin

```typescript
/**
 * StateMachinePlugin - Wraps state machine registry as a TurnPlugin (ADR-119, ADR-120)
 *
 * Priority 75: Runs after NPCs (100) but before scheduler (50).
 * Evaluates state machine transitions after each successful player action.
 */
import { ISemanticEvent } from '@sharpee/core';
import { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { StateMachineRegistry } from './state-machine-runtime.js';
/**
 * The {@link TurnPlugin} that drives declarative state machines (ADR-119).
 *
 * Runs at priority 75 — after NPC behaviour (100), before the scheduler (50).
 * Each turn it evaluates every machine in its {@link StateMachineRegistry} and
 * returns the events produced by any transitions that fired. Register the
 * plugin with the engine, then add machines via {@link getRegistry}.
 */
export declare class StateMachinePlugin implements TurnPlugin {
    /** Stable plugin id. */
    id: string;
    /** Run order within a turn (after NPCs, before the scheduler). */
    priority: number;
    private registry;
    constructor();
    /** Evaluate all registered machines for this turn and return their events. */
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[];
    /** Serialize all machine instances for saving. */
    getState(): unknown;
    /** Restore machine instances from a prior {@link getState} result on load. */
    setState(state: unknown): void;
    /** The registry where stories add and inspect their state machines. */
    getRegistry(): StateMachineRegistry;
}
```

### state-machine-runtime

```typescript
/**
 * State Machine Runtime (ADR-119)
 *
 * Manages registered state machines and evaluates transitions each turn.
 */
import { ISemanticEvent } from '@sharpee/core';
import { StateMachineDefinition, EntityBindings, EvaluationContext, StateMachineRegistryState } from './types.js';
/**
 * Holds the running state machines for a story and advances them each turn
 * (ADR-119). Stories obtain the registry from
 * {@link StateMachinePlugin.getRegistry} and {@link register} their machines.
 */
export declare class StateMachineRegistry {
    private machines;
    /**
     * Register a machine and start it in its initial state.
     * @param definition The machine to add.
     * @param bindings Role-to-entity bindings (e.g. `{ $door: doorId }`).
     * @throws if the id is already registered or the initial state is missing.
     */
    register(definition: StateMachineDefinition, bindings?: EntityBindings): void;
    /** Remove a machine by id; a no-op if absent. */
    unregister(id: string): void;
    /** The current state name of a machine, or `undefined` if not registered. */
    getMachineState(id: string): string | undefined;
    /** The ordered state history of a machine, or `undefined` if not registered. */
    getMachineHistory(id: string): string[] | undefined;
    /**
     * Evaluate every non-terminal machine for this turn, firing at most one
     * transition per machine (highest-priority matching trigger whose guard
     * passes), and return all events the fired transitions produced.
     */
    evaluate(ctx: EvaluationContext): ISemanticEvent[];
    private findMatchingTransition;
    private triggerMatches;
    private executeTransition;
    /** Serialize every machine instance (current state + history) for saving. */
    getState(): StateMachineRegistryState;
    /** Restore machine instances from a prior {@link getState} result on load. */
    setState(state: StateMachineRegistryState): void;
}
```

### guard-evaluator

```typescript
/**
 * Guard Evaluator - evaluates guard conditions against world state.
 */
import { EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { GuardCondition, EntityBindings } from './types.js';
/**
 * Evaluate a {@link GuardCondition} against current world state.
 * @param guard The condition to test.
 * @param world The live world model.
 * @param bindings Role-to-entity bindings used to resolve `$` references.
 * @param playerId The player, used as the default actor for location/inventory guards.
 * @returns true when the condition holds.
 */
export declare function evaluateGuard(guard: GuardCondition, world: WorldModel, bindings: EntityBindings, playerId: EntityId): boolean;
/**
 * Resolve an entity reference: a `$`-prefixed role is looked up in `bindings`
 * (throwing if unbound); any other string is returned as a literal entity id.
 */
export declare function resolveRef(ref: string, bindings: EntityBindings): EntityId;
```

### effect-executor

```typescript
/**
 * Effect Executor - applies state machine effects to the world model.
 */
import { EntityId, ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { Effect, EntityBindings } from './types.js';
/**
 * Apply a list of {@link Effect}s to the world in order and collect the semantic
 * events they emit.
 * @param effects The effects to run.
 * @param world The live world model to mutate.
 * @param bindings Role-to-entity bindings used to resolve `$` references.
 * @param playerId The player, passed to custom effects.
 * @param machineId The owning machine's id, tagged onto emitted events.
 * @returns The events produced by the effects.
 */
export declare function executeEffects(effects: Effect[], world: WorldModel, bindings: EntityBindings, playerId: EntityId, machineId: string): ISemanticEvent[];
```
