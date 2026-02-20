# Plugins

Plugin system, NPC plugin, scheduler (daemons/fuses), state machine.

---

## @sharpee/plugins

### turn-plugin

```typescript
import { ISemanticEvent } from '@sharpee/core';
import { TurnPluginContext } from './turn-plugin-context';
export interface TurnPlugin {
    id: string;
    priority: number;
    onAfterAction(context: TurnPluginContext): ISemanticEvent[];
    getState?(): unknown;
    setState?(state: unknown): void;
}
```

### turn-plugin-context

```typescript
import { EntityId, SeededRandom, ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
export interface TurnPluginActionResult {
    actionId: string;
    success: boolean;
    targetId?: EntityId;
    sharedData?: Record<string, unknown>;
}
export interface TurnPluginContext {
    world: WorldModel;
    turn: number;
    playerId: EntityId;
    playerLocation: EntityId;
    random: SeededRandom;
    actionResult?: TurnPluginActionResult;
    actionEvents?: ISemanticEvent[];
}
```

### plugin-registry

```typescript
import { TurnPlugin } from './turn-plugin';
export declare class PluginRegistry {
    private plugins;
    register(plugin: TurnPlugin): void;
    unregister(id: string): void;
    clear(): void;
    getAll(): TurnPlugin[];
    getById(id: string): TurnPlugin | undefined;
    getStates(): Record<string, unknown>;
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
export declare class NpcPlugin implements TurnPlugin {
    id: string;
    priority: number;
    private service;
    constructor();
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[];
    /** NPC state lives in entity traits/metadata - no plugin-level state needed */
    getState(): unknown;
    setState(_state: unknown): void;
    /** Public access for stories that need to register NPC behaviors */
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
import { Daemon, Fuse, DaemonInfo, FuseInfo, SchedulerResult, SchedulerState, SeededRandom } from './types';
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
import { ISchedulerService } from './scheduler-service';
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
 */
import { EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
export interface StateMachineDefinition {
    id: string;
    description?: string;
    initialState: string;
    states: Record<string, StateDefinition>;
}
export interface StateDefinition {
    description?: string;
    transitions?: TransitionDefinition[];
    onEnter?: Effect[];
    onExit?: Effect[];
    terminal?: boolean;
}
export interface TransitionDefinition {
    target: string;
    trigger: TransitionTrigger;
    guard?: GuardCondition;
    effects?: Effect[];
    priority?: number;
}
export type TransitionTrigger = ActionTrigger | EventTrigger | ConditionTrigger;
export interface ActionTrigger {
    type: 'action';
    actionId: string;
    targetEntity?: string;
}
export interface EventTrigger {
    type: 'event';
    eventId: string;
    filter?: Record<string, unknown>;
}
export interface ConditionTrigger {
    type: 'condition';
    condition: GuardCondition;
}
export type GuardCondition = EntityGuard | StateGuard | LocationGuard | InventoryGuard | CompositeGuard | CustomGuard;
export interface EntityGuard {
    type: 'entity';
    entityRef: string;
    trait: string;
    property: string;
    value: unknown;
}
export interface StateGuard {
    type: 'state';
    key: string;
    value: unknown;
}
export interface LocationGuard {
    type: 'location';
    actorRef?: string;
    roomRef: string;
}
export interface InventoryGuard {
    type: 'inventory';
    actorRef?: string;
    entityRef: string;
}
export interface CompositeGuard {
    type: 'and' | 'or' | 'not';
    conditions: GuardCondition[];
}
export interface CustomGuard {
    type: 'custom';
    evaluate: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => boolean;
}
export type Effect = MoveEntityEffect | RemoveEntityEffect | SetTraitEffect | SetStateEffect | MessageEffect | EmitEventEffect | CustomEffect;
export interface MoveEntityEffect {
    type: 'move';
    entityRef: string;
    destinationRef: string;
}
export interface RemoveEntityEffect {
    type: 'remove';
    entityRef: string;
}
export interface SetTraitEffect {
    type: 'set_trait';
    entityRef: string;
    trait: string;
    property: string;
    value: unknown;
}
export interface SetStateEffect {
    type: 'set_state';
    key: string;
    value: unknown;
}
export interface MessageEffect {
    type: 'message';
    messageId: string;
    params?: Record<string, unknown>;
}
export interface EmitEventEffect {
    type: 'emit_event';
    eventType: string;
    entities?: {
        actor?: string;
        target?: string;
        instrument?: string;
        location?: string;
    };
    data?: unknown;
}
export interface CustomEffect {
    type: 'custom';
    execute: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => EffectResult;
}
export interface EffectResult {
    events?: Array<{
        type: string;
        entities?: Record<string, string>;
        data?: unknown;
    }>;
    messages?: Array<{
        messageId: string;
        params?: Record<string, unknown>;
    }>;
}
export type EntityBindings = Record<string, EntityId>;
export interface StateMachineInstanceState {
    id: string;
    currentState: string;
    history: string[];
}
export interface StateMachineRegistryState {
    instances: StateMachineInstanceState[];
}
export interface EvaluationContext {
    world: WorldModel;
    playerId: EntityId;
    playerLocation: EntityId;
    turn: number;
    actionId?: string;
    actionTargetId?: EntityId;
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
import { StateMachineRegistry } from './state-machine-runtime';
export declare class StateMachinePlugin implements TurnPlugin {
    id: string;
    priority: number;
    private registry;
    constructor();
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[];
    getState(): unknown;
    setState(state: unknown): void;
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
import { StateMachineDefinition, EntityBindings, EvaluationContext, StateMachineRegistryState } from './types';
export declare class StateMachineRegistry {
    private machines;
    register(definition: StateMachineDefinition, bindings?: EntityBindings): void;
    unregister(id: string): void;
    getMachineState(id: string): string | undefined;
    getMachineHistory(id: string): string[] | undefined;
    evaluate(ctx: EvaluationContext): ISemanticEvent[];
    private findMatchingTransition;
    private triggerMatches;
    private executeTransition;
    getState(): StateMachineRegistryState;
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
import { GuardCondition, EntityBindings } from './types';
export declare function evaluateGuard(guard: GuardCondition, world: WorldModel, bindings: EntityBindings, playerId: EntityId): boolean;
export declare function resolveRef(ref: string, bindings: EntityBindings): EntityId;
```

### effect-executor

```typescript
/**
 * Effect Executor - applies state machine effects to the world model.
 */
import { EntityId, ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { Effect, EntityBindings } from './types';
export declare function executeEffects(effects: Effect[], world: WorldModel, bindings: EntityBindings, playerId: EntityId, machineId: string): ISemanticEvent[];
```
