# @sharpee/event-processor

Event sequencing and effect processing.

---

### processor

```typescript
/**
 * Event processor implementation
 *
 * Applies semantic events to the world model through registered handlers.
 * ADR-075: Entity handlers receive WorldQuery and return Effect[].
 */
import { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ProcessedEvents, ProcessorOptions } from '@sharpee/if-domain';
import type { StoryEventHandler } from './handler-types';
export type { StoryEventHandler, IGameEvent } from './handler-types';
export type { Effect, WorldQuery } from './effects';
export declare class EventProcessor {
    private world;
    private options;
    private effectProcessor;
    private worldQuery;
    private storyHandlers;
    constructor(world: WorldModel, options?: ProcessorOptions);
    /**
     * Register a story-level event handler
     * Multiple handlers can be registered for the same event type
     */
    registerHandler(eventType: string, handler: StoryEventHandler): void;
    /**
     * Unregister a story-level event handler
     */
    unregisterHandler(eventType: string, handler: StoryEventHandler): void;
    /**
     * Process a batch of events
     */
    processEvents(events: ISemanticEvent[]): ProcessedEvents;
    /**
     * Process a single event
     */
    private processSingleEvent;
    /**
     * Process reaction events with depth limiting
     */
    private processReactions;
    /**
     * Invoke story handlers for an event (ADR-075)
     *
     * Collects effects from all story-level handlers and processes them
     * through EffectProcessor. Entity `on` handlers were removed in ISSUE-068.
     */
    private invokeEntityHandlers;
    /**
     * Get the world model
     */
    getWorld(): WorldModel;
    /**
     * Update processor options
     */
    setOptions(options: Partial<ProcessorOptions>): void;
}
```

### handlers

```typescript
/**
 * Event handler registration
 *
 * Central module for registering all standard IF event handlers
 */
export * from './movement';
export * from './state-change';
export * from './observation';
export * from './meta';
export * from './complex-manipulation';
export * from './device';
import { WorldModel } from '@sharpee/world-model';
/**
 * Register all standard IF event handlers with the world model
 */
export declare function registerStandardHandlers(world: WorldModel): void;
```

### effects/types

```typescript
/**
 * Effect types for ADR-075: Effects-Based Handler Pattern
 *
 * Effects are intents, not mutations. They describe what should happen, not how.
 * Handlers return effects, which are validated and applied by EffectProcessor.
 */
import { ISemanticEvent } from '@sharpee/core';
/**
 * Effect for adding/subtracting score
 */
export interface ScoreEffect {
    type: 'score';
    points: number;
    reason?: string;
}
/**
 * Effect for setting a world flag
 */
export interface FlagEffect {
    type: 'flag';
    name: string;
    value: boolean;
}
/**
 * Effect for emitting a message to the player
 */
export interface MessageEffect {
    type: 'message';
    id: string;
    data?: Record<string, unknown>;
}
/**
 * Effect for emitting another semantic event
 */
export interface EmitEffect {
    type: 'emit';
    event: ISemanticEvent;
}
/**
 * Effect for scheduling a daemon/fuse
 */
export interface ScheduleEffect {
    type: 'schedule';
    daemon: string;
    turns: number;
}
/**
 * Effect for unblocking an exit
 */
export interface UnblockEffect {
    type: 'unblock';
    exit: string;
    room: string;
}
/**
 * Effect for blocking an exit
 */
export interface BlockEffect {
    type: 'block';
    exit: string;
    room: string;
    reason?: string;
}
/**
 * Effect for moving an entity
 */
export interface MoveEntityEffect {
    type: 'move_entity';
    entityId: string;
    destination: string | null;
}
/**
 * Effect for updating an entity's state
 */
export interface UpdateEntityEffect {
    type: 'update_entity';
    entityId: string;
    updates: Record<string, unknown>;
}
/**
 * Effect for setting world state value
 */
export interface SetStateEffect {
    type: 'set_state';
    key: string;
    value: unknown;
}
/**
 * Effect for updating room exits
 */
export interface UpdateExitsEffect {
    type: 'update_exits';
    roomId: string;
    exits: Record<string, {
        destination: string;
    } | null>;
}
/**
 * Union type of all effects
 */
export type Effect = ScoreEffect | FlagEffect | MessageEffect | EmitEffect | ScheduleEffect | UnblockEffect | BlockEffect | MoveEntityEffect | UpdateEntityEffect | SetStateEffect | UpdateExitsEffect;
/**
 * Error from effect validation
 */
export interface EffectError {
    effect: Effect;
    reason: string;
}
/**
 * Result of processing effects
 */
export interface EffectResult {
    success: boolean;
    errors: EffectError[];
    applied: Effect[];
    /** Events emitted via EmitEffect (for adding to turn events) */
    emittedEvents?: ISemanticEvent[];
}
```

### effects/world-query

```typescript
/**
 * WorldQuery: Read-only view of WorldModel for event handlers
 *
 * Per ADR-075, handlers receive a read-only query interface instead of
 * full world access. This preserves stdlib as the gatekeeper for mutations.
 */
import type { IFEntity, TraitType, ICapabilityData, IWorldModel } from '@sharpee/world-model';
/**
 * Read-only query interface for handlers
 *
 * Allows handlers to read state to make decisions, but cannot mutate directly.
 * Mutations happen through Effects processed by EffectProcessor.
 */
export interface WorldQuery {
    /**
     * Get an entity by ID
     */
    getEntity(id: string): IFEntity | undefined;
    /**
     * Check if an entity exists
     */
    hasEntity(id: string): boolean;
    /**
     * Get the player entity
     */
    getPlayer(): IFEntity | undefined;
    /**
     * Get the room the player is in
     */
    getCurrentRoom(): IFEntity | undefined;
    /**
     * Get the room an entity is in
     */
    getContainingRoom(entityId: string): IFEntity | undefined;
    /**
     * Get the location (parent) of an entity
     */
    getLocation(entityId: string): string | undefined;
    /**
     * Get contents of a container/room
     */
    getContents(containerId: string): IFEntity[];
    /**
     * Find entities by trait
     */
    findByTrait(traitType: TraitType): IFEntity[];
    /**
     * Find entities matching a predicate
     */
    findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[];
    /**
     * Get a world state value
     */
    getStateValue(key: string): unknown;
    /**
     * Get a capability's data
     */
    getCapability(name: string): ICapabilityData | undefined;
    /**
     * Check if a capability exists
     */
    hasCapability(name: string): boolean;
}
/**
 * Create a WorldQuery wrapper around a WorldModel
 *
 * This provides read-only access to the world model for event handlers.
 */
export declare function createWorldQuery(world: IWorldModel): WorldQuery;
```

### effects/effect-processor

```typescript
/**
 * EffectProcessor: Validates and applies effects per ADR-075
 *
 * This is the ONLY place effects become mutations. It validates effects,
 * ensures atomicity (all-or-nothing), and applies them through proper channels.
 */
import { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { Effect, EffectResult } from './types';
/**
 * Callback to emit events (provided by EventProcessor)
 */
export type EventEmitCallback = (events: ISemanticEvent[]) => void;
/**
 * EffectProcessor validates and applies effects atomically
 */
export declare class EffectProcessor {
    private world;
    private emitEvents?;
    constructor(world: WorldModel, emitEvents?: EventEmitCallback | undefined);
    private pendingEmittedEvents;
    /**
     * Process effects with two-phase atomic processing
     *
     * Phase 1: Validate ALL effects before applying any
     * Phase 2: Apply all effects (atomic - all or nothing)
     */
    process(effects: Effect[]): EffectResult;
    /**
     * Validate all effects, returning any errors
     */
    private validateAll;
    /**
     * Validate a single effect
     */
    private validate;
    /**
     * Apply a single effect
     */
    private apply;
    private applyScoreEffect;
    private applyFlagEffect;
    private applyMessageEffect;
    private applyEmitEffect;
    private applyMoveEntityEffect;
    private applyUpdateEntityEffect;
    private applySetStateEffect;
    private applyUpdateExitsEffect;
}
```

### handler-types

```typescript
/**
 * Event handler types for the event system (ADR-075)
 *
 * Entity `on` handler types were removed in ISSUE-068.
 * Only story-level handler types remain.
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { WorldQuery } from './effects/world-query';
import type { Effect } from './effects/types';
/**
 * Game event that can be handled by the story
 */
export interface IGameEvent extends ISemanticEvent {
    type: string;
    data: Record<string, any>;
}
/**
 * Story-level event handler (ADR-075)
 *
 * Receives read-only WorldQuery and returns Effect[]
 */
export type StoryEventHandler = (event: IGameEvent, query: WorldQuery) => Effect[];
```
