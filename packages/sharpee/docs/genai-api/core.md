# @sharpee/core

Base types, query system, platform events, entity interfaces, debug utilities.

---

### types/entity

```typescript
/**
 * Unique identifier for entities
 */
export type EntityId = string;
/**
 * The base Entity interface representing any object in a narrative system
 */
export interface IEntity {
    /**
     * Unique identifier for this entity
     */
    id: EntityId;
    /**
     * The entity type, used for categorization and type checking
     */
    type: string;
    /**
     * Arbitrary attributes/properties of the entity
     */
    attributes: Record<string, unknown>;
    /**
     * Relationships to other entities, organized by relationship type
     */
    relationships: Record<string, EntityId[]>;
}
/**
 * Minimal information needed to create a new entity
 */
export interface IEntityCreationParams {
    type: string;
    attributes?: Record<string, unknown>;
    relationships?: Record<string, EntityId[]>;
}
/**
 * Configuration for how entity operations should be performed
 */
export interface IEntityOperationOptions {
    /**
     * Whether to merge arrays in relationships instead of replacing them
     */
    mergeRelationships?: boolean;
    /**
     * Whether to validate relationship target existence
     */
    validateRelationships?: boolean;
}
```

### types/relationship

```typescript
import { EntityId } from './entity';
/**
 * A generic relationship between two entities
 */
export interface IRelationship {
    /**
     * The source entity of the relationship
     */
    sourceId: EntityId;
    /**
     * The type of relationship (can be any string)
     */
    type: string;
    /**
     * The target entity of the relationship
     */
    targetId: EntityId;
    /**
     * Optional metadata for the relationship
     */
    metadata?: Record<string, unknown>;
}
/**
 * Configuration for creating a relationship
 */
export interface IRelationshipConfig {
    /**
     * Whether this relationship creates an inverse relationship automatically
     */
    bidirectional?: boolean;
    /**
     * If bidirectional, the name of the inverse relationship
     */
    inverseType?: string;
    /**
     * Whether this relationship is exclusive (replaces previous relationships of same type)
     */
    exclusive?: boolean;
}
/**
 * Map of relationship type configurations
 */
export type RelationshipConfigMap = Record<string, IRelationshipConfig>;
```

### types/attribute

```typescript
/**
 * Possible types for attribute values
 */
export type AttributeValue = string | number | boolean | null | IAttributeObject | AttributeArray;
/**
 * An object containing attribute values
 */
export interface IAttributeObject {
    [key: string]: AttributeValue;
}
/**
 * An array of attribute values
 */
export type AttributeArray = AttributeValue[];
/**
 * Configuration for an attribute
 */
export interface IAttributeConfig {
    /**
     * Type validation for this attribute
     */
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    /**
     * Whether this attribute is required for the entity
     */
    required?: boolean;
    /**
     * Default value if none is provided
     */
    default?: AttributeValue;
    /**
     * Custom validation function
     */
    validate?: (value: AttributeValue) => boolean;
}
/**
 * A map of attribute configurations
 */
export type AttributeConfigMap = Record<string, IAttributeConfig>;
```

### types/result

```typescript
/**
 * Generic result type for operations that can succeed or fail
 * This is a discriminated union type - check the 'success' field to narrow the type
 */
export type Result<T, E = Error> = {
    success: true;
    value: T;
} | {
    success: false;
    error: E;
};
/**
 * Convenience functions for working with Result types
 */
export declare const Result: {
    /**
     * Create a successful result
     */
    ok<T>(value: T): Result<T, any>;
    /**
     * Create a failed result
     */
    fail<E>(error: E): Result<any, E>;
    /**
     * Check if a result is successful
     */
    isOk<T, E>(result: Result<T, E>): result is {
        success: true;
        value: T;
    };
    /**
     * Check if a result is a failure
     */
    isFail<T, E>(result: Result<T, E>): result is {
        success: false;
        error: E;
    };
    /**
     * Map a successful result to a new value
     */
    map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
    /**
     * Map a failed result to a new error
     */
    mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;
    /**
     * Chain results together
     */
    flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>;
    /**
     * Get the value or throw an error
     */
    unwrap<T, E>(result: Result<T, E>): T;
    /**
     * Get the value or return a default
     */
    unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
};
/**
 * Generic command result type for operations that produce events
 * Domain-specific implementations can extend this
 */
export interface ICommandResult<TEvent = any> {
    /**
     * Whether the command was successful
     */
    success: boolean;
    /**
     * Events generated during command execution
     */
    events: TEvent[];
    /**
     * Error message if the command failed
     */
    error?: string;
    /**
     * Additional metadata about the command execution
     */
    metadata?: Record<string, unknown>;
}
```

### types/save-data

```typescript
/**
 * Save/Restore data structures for game state serialization
 */
/**
 * Complete save game data structure
 */
export interface ISaveData {
    /** Engine version for compatibility checking */
    version: string;
    /** Unix timestamp when save was created */
    timestamp: number;
    /** Game metadata for save management */
    metadata: ISaveMetadata;
    /** Complete engine state */
    engineState: IEngineState;
    /** Story configuration for validation */
    storyConfig: IStoryConfig;
}
/**
 * Save game metadata
 */
export interface ISaveMetadata {
    /** Unique story identifier */
    storyId: string;
    /** Story version for compatibility */
    storyVersion: string;
    /** Number of turns played */
    turnCount: number;
    /** Optional: Total play time in milliseconds */
    playTime?: number;
    /** Optional: Player-provided or auto-generated description */
    description?: string;
}
/**
 * Complete engine state for serialization
 */
export interface IEngineState {
    /** Complete event history */
    eventSource: ISerializedEvent[];
    /** Current world state */
    spatialIndex: ISerializedSpatialIndex;
    /** Turn history for undo/redo */
    turnHistory: ISerializedTurn[];
    /** Optional: Parser state if needed */
    parserState?: ISerializedParserState;
    /** Optional: Scheduler state (daemons and fuses) - legacy, use pluginStates */
    schedulerState?: ISerializedSchedulerState;
    /** Optional: Plugin states for all registered plugins (ADR-120) */
    pluginStates?: Record<string, unknown>;
}
/**
 * Serialized scheduler state for save/load
 */
export interface ISerializedSchedulerState {
    /** Current turn number */
    turn: number;
    /** Daemon states */
    daemons: ISerializedDaemonState[];
    /** Fuse states */
    fuses: ISerializedFuseState[];
    /** Random seed for deterministic replay */
    randomSeed: number;
}
/**
 * Serialized daemon runtime state
 */
export interface ISerializedDaemonState {
    /** Daemon ID */
    id: string;
    /** Whether daemon is paused */
    isPaused: boolean;
    /** Number of times daemon has run */
    runCount: number;
}
/**
 * Serialized fuse runtime state
 */
export interface ISerializedFuseState {
    /** Fuse ID */
    id: string;
    /** Turns remaining until trigger */
    turnsRemaining: number;
    /** Whether fuse is paused */
    isPaused: boolean;
    /** Optional: Entity the fuse is bound to */
    entityId?: string;
}
/**
 * Serialized event representation
 */
export interface ISerializedEvent {
    /** Unique event ID */
    id: string;
    /** Event type */
    type: string;
    /** Unix timestamp */
    timestamp: number;
    /** Event payload data */
    data: Record<string, unknown>;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Serialized spatial index state
 */
export interface ISerializedSpatialIndex {
    /** All entities indexed by ID */
    entities: Record<string, ISerializedEntity>;
    /** All locations indexed by ID */
    locations: Record<string, ISerializedLocation>;
    /** Spatial relationships */
    relationships: Record<string, ISerializedRelationship[]>;
}
/**
 * Serialized entity representation
 */
export interface ISerializedEntity {
    /** Unique entity ID */
    id: string;
    /** Entity traits as key-value pairs */
    traits: Record<string, unknown>;
    /** Entity type hint for deserialization */
    entityType?: string;
}
/**
 * Serialized location representation
 */
export interface ISerializedLocation {
    /** Unique location ID */
    id: string;
    /** Location properties */
    properties: Record<string, unknown>;
    /** IDs of entities at this location */
    contents: string[];
    /** Connected locations */
    connections?: Record<string, string>;
}
/**
 * Serialized spatial relationship
 */
export interface ISerializedRelationship {
    /** Relationship type (e.g., "contains", "supports") */
    type: string;
    /** Source entity/location ID */
    sourceId: string;
    /** Target entity/location ID */
    targetId: string;
    /** Additional relationship data */
    data?: Record<string, unknown>;
}
/**
 * Serialized turn data
 */
export interface ISerializedTurn {
    /** Turn number */
    turnNumber: number;
    /** Event IDs that occurred in this turn */
    eventIds: string[];
    /** Turn timestamp */
    timestamp: number;
    /** Optional: Command that triggered this turn */
    command?: string;
}
/**
 * Serialized parser state (if needed)
 */
export interface ISerializedParserState {
    /** Current context stack */
    contextStack?: unknown[];
    /** Disambiguation state */
    disambiguationState?: unknown;
    /** Any other parser-specific state */
    [key: string]: unknown;
}
/**
 * Story configuration for validation
 */
export interface IStoryConfig {
    /** Unique story identifier */
    id: string;
    /** Story version */
    version: string;
    /** Story title */
    title: string;
    /** Story author(s) */
    author: string;
    /** Optional: Additional story metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Client-provided hooks for save/restore functionality
 */
export interface ISaveRestoreHooks {
    /**
     * Called when save is requested
     * @param data Complete save data to persist
     * @throws Error if save fails
     */
    onSaveRequested: (data: ISaveData) => Promise<void>;
    /**
     * Called when restore is requested
     * @returns Save data to restore, or null if cancelled/unavailable
     */
    onRestoreRequested: () => Promise<ISaveData | null>;
    /**
     * Called when quit is requested
     * @param context Quit context with game state info
     * @returns true if game should quit, false if cancelled
     */
    onQuitRequested?: (context: IQuitContext) => Promise<boolean>;
    /**
     * Called when restart is requested
     * @param context Restart context with game state info
     * @returns true if game should restart, false if cancelled
     */
    onRestartRequested?: (context: IRestartContext) => Promise<boolean>;
}
/**
 * Context provided when quit is requested
 */
export interface IQuitContext {
    /** Current game score */
    score?: number;
    /** Number of moves/turns taken */
    moves?: number;
    /** Whether there are unsaved changes */
    hasUnsavedChanges?: boolean;
    /** Whether to force quit without confirmation */
    force?: boolean;
    /** Any final game statistics */
    stats?: Record<string, unknown>;
}
/**
 * Context provided when restart is requested
 */
export interface IRestartContext {
    /** Current progress information */
    currentProgress?: {
        score?: number;
        moves?: number;
        location?: string;
    };
    /** Whether confirmation is needed */
    confirmationRequired?: boolean;
    /** Whether there are unsaved changes */
    hasUnsavedChanges?: boolean;
    /** Whether to force restart without confirmation */
    force?: boolean;
}
/**
 * Result of a save operation
 */
export interface ISaveResult {
    success: boolean;
    error?: string;
}
/**
 * Result of a restore operation
 */
export interface IRestoreResult {
    success: boolean;
    error?: string;
    /** If true, UI should perform full refresh */
    refreshUI?: boolean;
}
```

### ifid/ifid

```typescript
/**
 * Generate a new IFID using UUID v4 format.
 * Returns an uppercase UUID suitable for Treaty of Babel compliance.
 *
 * @example
 * const ifid = generateIfid();
 * // => "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
 */
export declare function generateIfid(): string;
/**
 * Validate an IFID string against Treaty of Babel requirements.
 *
 * @param ifid - The IFID to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateIfid("A1B2C3D4-E5F6-7890-ABCD-EF1234567890"); // true
 * validateIfid("lowercase-invalid"); // false
 * validateIfid("SHORT"); // false (less than 8 chars)
 */
export declare function validateIfid(ifid: string): boolean;
/**
 * Normalize an IFID to uppercase.
 * Returns the normalized IFID or null if invalid after normalization.
 *
 * @param ifid - The IFID to normalize
 * @returns Normalized uppercase IFID, or null if invalid
 */
export declare function normalizeIfid(ifid: string): string | null;
```

### metadata/story-metadata

```typescript
/**
 * Story metadata for Treaty of Babel compliance.
 * Contains bibliographic information embedded in compiled stories.
 */
export interface StoryMetadata {
    /** Unique IFID (Interactive Fiction Identifier) */
    ifid: string;
    /** Story title */
    title: string;
    /** Author name(s) */
    author: string;
    /** Year of first publication (e.g., "2025") */
    firstPublished?: string;
    /** Brief tagline (e.g., "An Interactive Fiction") */
    headline?: string;
    /** Genre classification */
    genre?: string;
    /** Story blurb/description */
    description?: string;
    /** Primary language code (e.g., "en") */
    language?: string;
    /** Series name if part of a series */
    series?: string;
    /** Number in series */
    seriesNumber?: number;
    /** Zarfian forgiveness scale */
    forgiveness?: 'Merciful' | 'Polite' | 'Tough' | 'Nasty' | 'Cruel';
}
/**
 * Sharpee config section in package.json
 */
export interface SharpeeConfig {
    /** Story IFID */
    ifid: string;
    /** Story title */
    title: string;
    /** Author name(s) */
    author: string;
    /** Year of first publication */
    firstPublished?: string;
    /** Brief tagline */
    headline?: string;
    /** Genre classification */
    genre?: string;
    /** Story description */
    description?: string;
    /** Primary language code */
    language?: string;
    /** Series name */
    series?: string;
    /** Number in series */
    seriesNumber?: number;
    /** Zarfian forgiveness scale */
    forgiveness?: 'Merciful' | 'Polite' | 'Tough' | 'Nasty' | 'Cruel';
}
/**
 * Validation result for story configuration
 */
export interface StoryConfigValidationResult {
    valid: boolean;
    error?: string;
    warnings?: string[];
}
```

### events/types

```typescript
import { EntityId } from '../types/entity';
/**
 * Represents a semantic event in the system
 */
export interface ISemanticEvent {
    /**
     * Unique identifier for this event
     */
    id: string;
    /**
     * The type of event
     */
    type: string;
    /**
     * Timestamp when the event was created
     */
    timestamp: number;
    /**
     * Entity IDs relevant to this event
     */
    entities: {
        /**
         * The entity that initiated the event (often the player)
         */
        actor?: EntityId;
        /**
         * The primary entity that the event affects
         */
        target?: EntityId;
        /**
         * A secondary entity involved in the event
         */
        instrument?: EntityId;
        /**
         * A location where the event occurred
         */
        location?: EntityId;
        /**
         * Other relevant entities
         */
        others?: EntityId[];
    };
    /**
     * Event data - can contain any shape of data needed for the event
     * Use type assertions to access typed data: event.data as MyEventData
     */
    data?: unknown;
    /**
     * Tags for categorizing and filtering events
     */
    tags?: string[];
    /**
     * Priority of the event (higher numbers are more important)
     */
    priority?: number;
    /**
     * Whether this event should be narrated
     */
    narrate?: boolean;
}
export { ISemanticEventSource as EventSource } from './semantic-event-source';
/**
 * Event listener for semantic events
 */
export type EventListener = (event: ISemanticEvent) => void;
/**
 * Event emitter for semantic events
 */
export interface IEventEmitter {
    /**
     * Add an event listener for a specific event type
     * Use '*' to listen to all events
     */
    on: (type: string, listener: EventListener) => void;
    /**
     * Remove an event listener
     */
    off: (type: string, listener: EventListener) => void;
    /**
     * Emit an event
     */
    emit: (event: ISemanticEvent) => void;
}
/**
 * Configuration options for the event system
 */
export interface IEventSystemOptions {
    /**
     * Maximum number of events to store in memory
     */
    maxEvents?: number;
    /**
     * Whether to emit events immediately when added
     */
    emitOnAdd?: boolean;
    /**
     * Custom filter for events that should be emitted
     */
    emitFilter?: (event: ISemanticEvent) => boolean;
}
/**
 * Type alias for backwards compatibility
 */
export type Event = ISemanticEvent;
```

### events/standard-events

```typescript
/**
 * Standard event types and tags
 * TODO: Move to proper location
 */
export declare const StandardEventTypes: {
    readonly ACTION: "action";
    readonly SYSTEM: "system";
    readonly NARRATIVE: "narrative";
    readonly ERROR: "error";
};
export declare const StandardEventTags: {
    readonly SUCCESS: "success";
    readonly FAILURE: "failure";
    readonly INFO: "info";
    readonly WARNING: "warning";
    readonly ERROR: "error";
};
export declare const EventCategories: {
    readonly ACTION: "action";
    readonly SYSTEM: "system";
    readonly NARRATIVE: "narrative";
};
export type StandardEventType = typeof StandardEventTypes[keyof typeof StandardEventTypes];
export type StandardEventTag = typeof StandardEventTags[keyof typeof StandardEventTags];
export type EventCategory = typeof EventCategories[keyof typeof EventCategories];
```

### events/system-event

```typescript
/**
 * System events are used for debugging, monitoring, and system-level notifications.
 * These are separate from SemanticEvents which represent story-meaningful occurrences.
 */
/**
 * System event for debugging and monitoring
 */
export interface ISystemEvent {
    /**
     * Unique identifier for this event instance
     */
    id: string;
    /**
     * Timestamp when the event occurred
     */
    timestamp: number;
    /**
     * Which subsystem emitted this event
     */
    subsystem: string;
    /**
     * Type of system event (e.g., 'parse_attempt', 'validation_error', 'entity_resolved')
     */
    type: string;
    /**
     * Event-specific data
     */
    data: unknown;
    /**
     * Optional severity level
     */
    severity?: 'debug' | 'info' | 'warning' | 'error';
    /**
     * Optional correlation ID to track related events
     */
    correlationId?: string;
}
/**
 * Common subsystem identifiers
 */
export declare const Subsystems: {
    readonly PARSER: "parser";
    readonly VALIDATOR: "validator";
    readonly EXECUTOR: "executor";
    readonly WORLD_MODEL: "world-model";
    readonly TEXT_SERVICE: "text-service";
    readonly EVENT_PROCESSOR: "event-processor";
    readonly RULE_ENGINE: "rule-engine";
};
export type SubsystemType = typeof Subsystems[keyof typeof Subsystems];
/**
 * Helper to create a system event with common fields
 */
export declare function createSystemEvent(subsystem: string, type: string, data: unknown, options?: {
    severity?: ISystemEvent['severity'];
    correlationId?: string;
}): ISystemEvent;
/**
 * Type guard to check if an object is a SystemEvent
 */
export declare function isSystemEvent(obj: unknown): obj is ISystemEvent;
```

### events/platform-events

```typescript
/**
 * Platform events for operations that require client/host intervention
 * These events are processed after turn completion but before text service
 */
import { ISemanticEvent } from './types';
import { IQuitContext, IRestartContext } from '../types/save-data';
/**
 * Platform event types for save, restore, quit, and restart operations
 */
export declare const PlatformEventType: {
    readonly SAVE_REQUESTED: "platform.save_requested";
    readonly RESTORE_REQUESTED: "platform.restore_requested";
    readonly QUIT_REQUESTED: "platform.quit_requested";
    readonly RESTART_REQUESTED: "platform.restart_requested";
    readonly UNDO_REQUESTED: "platform.undo_requested";
    readonly AGAIN_REQUESTED: "platform.again_requested";
    readonly SAVE_COMPLETED: "platform.save_completed";
    readonly RESTORE_COMPLETED: "platform.restore_completed";
    readonly QUIT_CONFIRMED: "platform.quit_confirmed";
    readonly RESTART_COMPLETED: "platform.restart_completed";
    readonly UNDO_COMPLETED: "platform.undo_completed";
    readonly SAVE_FAILED: "platform.save_failed";
    readonly RESTORE_FAILED: "platform.restore_failed";
    readonly QUIT_CANCELLED: "platform.quit_cancelled";
    readonly RESTART_CANCELLED: "platform.restart_cancelled";
    readonly UNDO_FAILED: "platform.undo_failed";
    readonly AGAIN_FAILED: "platform.again_failed";
};
export type PlatformEventTypeValue = typeof PlatformEventType[keyof typeof PlatformEventType];
/**
 * Base interface for all platform events
 */
export interface IPlatformEvent extends ISemanticEvent {
    type: PlatformEventTypeValue;
    /**
     * Indicates this event requires client action and should be processed
     * after turn completion but before text service
     */
    requiresClientAction: true;
    /**
     * Platform-specific context for the operation
     */
    payload: {
        /**
         * Context specific to the platform operation
         */
        context?: unknown;
        /**
         * For completion/error events: whether the operation succeeded
         */
        success?: boolean;
        /**
         * For error events: error message or reason
         */
        error?: string;
        /**
         * Any additional data specific to the platform operation
         */
        [key: string]: unknown;
    };
}
/**
 * Context for save operations
 */
export interface ISaveContext {
    /**
     * Optional name for the save
     */
    saveName?: string;
    /**
     * Save slot identifier
     */
    slot?: string | number;
    /**
     * Whether this is an autosave
     */
    autosave?: boolean;
    /**
     * Additional metadata to store with the save
     */
    metadata?: Record<string, unknown>;
    /**
     * Timestamp when save was requested
     */
    timestamp: number;
}
/**
 * Context for restore operations
 */
export interface IRestoreContext {
    /**
     * Specific save slot to restore
     */
    slot?: string | number;
    /**
     * List of available saves (if known)
     */
    availableSaves?: Array<{
        slot: string | number;
        name?: string;
        timestamp: number;
        metadata?: Record<string, unknown>;
    }>;
    /**
     * Information about the last save
     */
    lastSave?: {
        slot: string | number;
        timestamp: number;
    };
}
export { IQuitContext, IRestartContext };
/**
 * Type guards for platform events
 */
export declare function isPlatformEvent(event: ISemanticEvent): event is IPlatformEvent;
export declare function isPlatformRequestEvent(event: ISemanticEvent): boolean;
export declare function isPlatformCompletionEvent(event: ISemanticEvent): boolean;
/**
 * Helper functions to create platform events
 */
export declare function createPlatformEvent(type: PlatformEventTypeValue, context?: unknown, additionalPayload?: Record<string, unknown>): IPlatformEvent;
export declare function createSaveRequestedEvent(context: ISaveContext): IPlatformEvent;
export declare function createRestoreRequestedEvent(context: IRestoreContext): IPlatformEvent;
export declare function createQuitRequestedEvent(context: IQuitContext): IPlatformEvent;
export declare function createRestartRequestedEvent(context: IRestartContext): IPlatformEvent;
/**
 * Helper functions for completion events
 */
export declare function createSaveCompletedEvent(success: boolean, error?: string): IPlatformEvent;
export declare function createRestoreCompletedEvent(success: boolean, error?: string): IPlatformEvent;
export declare function createQuitConfirmedEvent(): IPlatformEvent;
export declare function createQuitCancelledEvent(): IPlatformEvent;
export declare function createRestartCompletedEvent(success: boolean): IPlatformEvent;
/**
 * Context for undo operations
 */
export interface IUndoContext {
    /**
     * Number of turns to undo (default 1)
     */
    turns?: number;
}
export declare function createUndoRequestedEvent(context?: IUndoContext): IPlatformEvent;
export declare function createUndoCompletedEvent(success: boolean, restoredToTurn?: number, error?: string): IPlatformEvent;
/**
 * Context for again (repeat) operations
 */
export interface IAgainContext {
    /**
     * The original command text to repeat
     */
    command: string;
    /**
     * The action ID of the command to repeat
     */
    actionId: string;
}
export declare function createAgainRequestedEvent(context: IAgainContext): IPlatformEvent;
export declare function createAgainFailedEvent(error: string): IPlatformEvent;
```

### events/game-events

```typescript
/**
 * Game lifecycle events for tracking game state transitions
 * These events mark important milestones in a game session
 */
import { ISemanticEvent } from './types';
/** Story metadata included in game events */
export interface GameEventStoryData {
    id?: string;
    title?: string;
    author?: string;
    version?: string;
    buildDate?: string;
}
/** Session tracking data */
export interface GameEventSessionData {
    startTime?: number;
    endTime?: number;
    turns?: number;
    score?: number;
    moves?: number;
}
/** Ending/conclusion data for game end events */
export interface GameEventEndingData {
    type?: 'victory' | 'defeat' | 'quit' | 'abort';
    reason?: string;
    achieved?: string[];
    score?: number;
    maxScore?: number;
    ranking?: string;
}
/** Error data for failure events */
export interface GameEventErrorData {
    code?: string;
    message?: string;
    stack?: string;
}
/** Game state values */
export type GameState = 'initializing' | 'ready' | 'running' | 'ending' | 'ended';
export interface GameLifecycleInitializingData {
    gameState: 'initializing';
    [key: string]: unknown;
}
export interface GameLifecycleInitializedData {
    gameState: 'ready';
    [key: string]: unknown;
}
export interface GameLifecycleStoryLoadingData {
    story?: {
        id?: string;
    };
    [key: string]: unknown;
}
export interface GameLifecycleStoryLoadedData {
    story: GameEventStoryData;
    gameState: 'ready';
    [key: string]: unknown;
}
export interface GameLifecycleStartingData {
    story?: GameEventStoryData;
    gameState: 'ready';
    [key: string]: unknown;
}
export interface GameLifecycleStartedData {
    story?: GameEventStoryData;
    engineVersion?: string;
    clientVersion?: string;
    gameState: 'running';
    session: {
        startTime: number;
        turns: number;
        moves: number;
    };
    [key: string]: unknown;
}
export interface GameLifecycleEndingData {
    gameState: 'ending';
    session?: GameEventSessionData;
    ending?: {
        reason?: string;
    };
    [key: string]: unknown;
}
export interface GameLifecycleEndedData {
    gameState: 'ended';
    session?: GameEventSessionData & {
        endTime: number;
    };
    ending: GameEventEndingData & {
        type: 'victory' | 'defeat' | 'quit' | 'abort';
    };
    [key: string]: unknown;
}
export interface GameLifecycleWonData {
    gameState: 'ended';
    session?: GameEventSessionData & {
        endTime: number;
    };
    ending: GameEventEndingData & {
        type: 'victory';
    };
    [key: string]: unknown;
}
export interface GameLifecycleLostData {
    gameState: 'ended';
    session?: GameEventSessionData & {
        endTime: number;
    };
    ending: {
        type: 'defeat';
        reason: string;
    };
    [key: string]: unknown;
}
export interface GameLifecycleQuitData {
    gameState: 'ended';
    session?: GameEventSessionData & {
        endTime: number;
    };
    ending: {
        type: 'quit';
        reason: string;
    };
    [key: string]: unknown;
}
export interface GameLifecycleAbortedData {
    gameState: 'ended';
    session?: GameEventSessionData & {
        endTime: number;
    };
    ending: {
        type: 'abort';
        reason: string;
    };
    error: {
        message: string;
    };
    [key: string]: unknown;
}
export interface GameLifecycleSessionSavingData {
    saveId?: string;
    [key: string]: unknown;
}
export interface GameLifecycleSessionSavedData {
    saveId?: string;
    timestamp: number;
    [key: string]: unknown;
}
export interface GameLifecycleSessionRestoringData {
    saveId?: string;
    [key: string]: unknown;
}
export interface GameLifecycleSessionRestoredData {
    saveId?: string;
    timestamp: number;
    [key: string]: unknown;
}
export interface GameLifecyclePcSwitchedData {
    previousPlayerId: string;
    newPlayerId: string;
    [key: string]: unknown;
}
export interface GameLifecycleInitFailedData {
    error: GameEventErrorData;
    [key: string]: unknown;
}
export interface GameLifecycleStoryLoadFailedData {
    story?: {
        id?: string;
    };
    error: GameEventErrorData;
    [key: string]: unknown;
}
export interface GameLifecycleFatalErrorData {
    error: GameEventErrorData;
    [key: string]: unknown;
}
/**
 * Game event types for lifecycle transitions
 */
export declare const GameEventType: {
    readonly GAME_INITIALIZING: "game.initializing";
    readonly GAME_INITIALIZED: "game.initialized";
    readonly STORY_LOADING: "game.story_loading";
    readonly STORY_LOADED: "game.story_loaded";
    readonly GAME_STARTING: "game.starting";
    readonly GAME_STARTED: "game.started";
    readonly GAME_ENDING: "game.ending";
    readonly GAME_ENDED: "game.ended";
    readonly GAME_WON: "game.won";
    readonly GAME_LOST: "game.lost";
    readonly GAME_QUIT: "game.quit";
    readonly GAME_ABORTED: "game.aborted";
    readonly SESSION_SAVING: "game.session_saving";
    readonly SESSION_SAVED: "game.session_saved";
    readonly SESSION_RESTORING: "game.session_restoring";
    readonly SESSION_RESTORED: "game.session_restored";
    readonly PC_SWITCHED: "game.pc_switched";
    readonly INITIALIZATION_FAILED: "game.initialization_failed";
    readonly STORY_LOAD_FAILED: "game.story_load_failed";
    readonly FATAL_ERROR: "game.fatal_error";
};
export type GameEventTypeValue = typeof GameEventType[keyof typeof GameEventType];
/**
 * Check if an event is a game lifecycle event (any GameEventType).
 * Use specific type guards (isGameStartedEvent, etc.) for typed data access.
 */
export declare function isGameEvent(event: ISemanticEvent): boolean;
/**
 * Check if an event is part of the game start sequence.
 */
export declare function isGameStartSequenceEvent(event: ISemanticEvent): boolean;
/**
 * Check if an event is part of the game end sequence.
 */
export declare function isGameEndSequenceEvent(event: ISemanticEvent): boolean;
/**
 * Create a generic game event with typed data.
 * Use specific creators (createGameStartedEvent, etc.) when possible for type safety.
 */
export declare function createGameEvent<T extends Record<string, unknown>>(type: GameEventTypeValue, data?: T): ISemanticEvent;
export declare function createGameInitializingEvent(): ISemanticEvent;
export declare function createGameInitializedEvent(): ISemanticEvent;
export declare function createStoryLoadingEvent(storyId?: string): ISemanticEvent;
export declare function createStoryLoadedEvent(story: GameEventStoryData): ISemanticEvent;
export declare function createGameStartingEvent(story?: GameEventStoryData): ISemanticEvent;
export declare function createGameStartedEvent(story?: GameEventStoryData, startTime?: number, engineVersion?: string, clientVersion?: string): ISemanticEvent;
export declare function createGameEndingEvent(reason?: string, session?: GameEventSessionData): ISemanticEvent;
export declare function createGameEndedEvent(endingType: 'victory' | 'defeat' | 'quit' | 'abort', session?: GameEventSessionData, ending?: Partial<GameEventEndingData>): ISemanticEvent;
export declare function createGameWonEvent(session?: GameEventSessionData, ending?: Partial<GameEventEndingData>): ISemanticEvent;
export declare function createGameLostEvent(reason: string, session?: GameEventSessionData): ISemanticEvent;
export declare function createGameQuitEvent(session?: GameEventSessionData): ISemanticEvent;
export declare function createGameAbortedEvent(error: string, session?: GameEventSessionData): ISemanticEvent;
export declare function createPcSwitchedEvent(previousPlayerId: string, newPlayerId: string): ISemanticEvent;
/** Type guard to check if an event has specific data type */
export declare function isGameStartedEvent(event: ISemanticEvent): event is ISemanticEvent & {
    data: GameLifecycleStartedData;
};
export declare function isGameEndedEvent(event: ISemanticEvent): event is ISemanticEvent & {
    data: GameLifecycleEndedData;
};
export declare function isGameWonEvent(event: ISemanticEvent): event is ISemanticEvent & {
    data: GameLifecycleWonData;
};
export declare function isGameLostEvent(event: ISemanticEvent): event is ISemanticEvent & {
    data: GameLifecycleLostData;
};
export declare function isGameQuitEvent(event: ISemanticEvent): event is ISemanticEvent & {
    data: GameLifecycleQuitData;
};
export declare function isGameAbortedEvent(event: ISemanticEvent): event is ISemanticEvent & {
    data: GameLifecycleAbortedData;
};
```

### events/event-registry

```typescript
/**
 * Event Data Registry - Central type definitions for all semantic events
 *
 * This module defines the mapping between event type strings and their
 * corresponding data shapes. It serves as the single source of truth
 * for event data types across the Sharpee platform.
 *
 * @see ADR-082 for the design rationale
 *
 * ## Extensibility
 *
 * Packages can extend this registry using TypeScript declaration merging:
 *
 * ```typescript
 * declare module '@sharpee/core' {
 *   interface EventDataRegistry {
 *     'my.custom.event': MyCustomData;
 *   }
 * }
 * ```
 */
import { EntityId } from '../types/entity';
/**
 * Registry mapping event type strings to their data shapes.
 *
 * This interface is designed to be extended via declaration merging
 * by stdlib, stories, and other packages.
 */
export interface EventDataRegistry {
    'query.pending': QueryPendingData;
    'query.invalid': QueryInvalidData;
    'query.response': QueryResponseData;
    'message.success': MessageData;
    'message.failure': MessageData;
    'message.info': MessageData;
    'message.warning': MessageData;
    'message.debug': MessageData;
    'game.initializing': EmptyData;
    'game.initialized': GameInitializedData;
    'game.starting': EmptyData;
    'game.started': GameStartedData;
    'game.ending': GameEndingData;
    'game.ended': GameEndedData;
    'game.won': GameEndedData;
    'game.lost': GameEndedData;
    'game.quit': EmptyData;
    'game.aborted': EmptyData;
    'game.pc_switched': PcSwitchedData;
    'platform.save_requested': SaveRequestedData;
    'platform.save_completed': SaveCompletedData;
    'platform.save_failed': SaveFailedData;
    'platform.restore_requested': RestoreRequestedData;
    'platform.restore_completed': RestoreCompletedData;
    'platform.restore_failed': RestoreFailedData;
    'platform.quit_requested': EmptyData;
    'platform.quit_confirmed': QuitConfirmedData;
    'platform.quit_cancelled': EmptyData;
    'platform.restart_requested': EmptyData;
    'platform.restart_completed': EmptyData;
    'platform.restart_cancelled': EmptyData;
    'turn.started': TurnData;
    'turn.ended': TurnData;
    'quit.confirmed': QuitConfirmedData;
    'quit.cancelled': EmptyData;
}
/**
 * Empty data for events that carry no payload.
 */
export interface EmptyData {
}
/**
 * Standard message event data.
 */
export interface MessageData {
    messageId: string;
    params?: Record<string, unknown>;
}
export interface QueryPendingData {
    query: {
        id: string;
        messageId: string;
        messageParams?: Record<string, unknown>;
        options?: string[];
        validationType?: string;
    };
}
export interface QueryInvalidData {
    message?: string;
    hint?: string;
    queryId?: string;
}
export interface QueryResponseData {
    queryId: string;
    response: string | number | boolean;
}
export interface GameInitializedData {
    storyId?: string;
    storyTitle?: string;
    storyVersion?: string;
}
export interface GameStartedData {
    storyId?: string;
    storyTitle?: string;
    initialLocation?: EntityId;
}
export interface GameEndingData {
    reason?: string;
}
export interface GameEndedData {
    finalScore?: number;
    maxScore?: number;
    moves?: number;
    reason?: string;
    rank?: string;
}
export interface PcSwitchedData {
    previousPlayerId: string;
    newPlayerId: string;
}
export interface SaveRequestedData {
    slotName?: string;
}
export interface SaveCompletedData {
    slotName?: string;
    timestamp?: number;
}
export interface SaveFailedData {
    slotName?: string;
    error?: string;
}
export interface RestoreRequestedData {
    slotName?: string;
}
export interface RestoreCompletedData {
    slotName?: string;
    timestamp?: number;
}
export interface RestoreFailedData {
    slotName?: string;
    error?: string;
}
export interface QuitConfirmedData {
    messageId?: string;
    finalScore?: number;
    maxScore?: number;
    moves?: number;
}
export interface TurnData {
    turn: number;
}
/**
 * All known event type strings.
 */
export type EventType = keyof EventDataRegistry;
/**
 * Get the data type for a specific event type.
 */
export type EventDataFor<T extends EventType> = EventDataRegistry[T];
```

### events/typed-event

```typescript
/**
 * Typed Semantic Event - Generic event interface with compile-time type safety
 *
 * @see ADR-082 for design rationale
 */
import { EventDataRegistry, EventType } from './event-registry';
import { ISemanticEvent } from './types';
/**
 * A semantic event with typed data based on the event type.
 *
 * Use this when you know the specific event type at compile time.
 * The `data` property is strictly typed based on the event type.
 *
 * @example
 * ```typescript
 * const event: TypedSemanticEvent<'query.invalid'> = {
 *   id: 'evt-1',
 *   type: 'query.invalid',
 *   timestamp: Date.now(),
 *   entities: {},
 *   data: { message: 'Invalid input', hint: 'Try again' }
 * };
 *
 * // TypeScript knows event.data.message is string | undefined
 * console.log(event.data.message);
 * ```
 */
export interface TypedSemanticEvent<T extends EventType> extends Omit<ISemanticEvent, 'type' | 'data'> {
    /**
     * The event type - a literal string type for discrimination.
     */
    type: T;
    /**
     * Typed event data based on the event type.
     */
    data: EventDataRegistry[T];
}
/**
 * Union of all known typed semantic events.
 *
 * Use this for exhaustive event handling where you want TypeScript
 * to verify you've handled all event types.
 *
 * @example
 * ```typescript
 * function handleEvent(event: KnownSemanticEvent) {
 *   switch (event.type) {
 *     case 'query.invalid':
 *       // TypeScript knows event.data is QueryInvalidData
 *       return event.data.message;
 *     case 'query.pending':
 *       // TypeScript knows event.data is QueryPendingData
 *       return event.data.query.messageId;
 *     // ... handle all cases
 *   }
 * }
 * ```
 */
export type KnownSemanticEvent = {
    [K in EventType]: TypedSemanticEvent<K>;
}[EventType];
/**
 * Type guard to check if an ISemanticEvent is a known typed event.
 *
 * This is useful when you have an ISemanticEvent and want to narrow
 * it to a KnownSemanticEvent for exhaustive handling.
 */
export declare function isKnownEvent(event: ISemanticEvent): event is KnownSemanticEvent;
```

### events/event-factory

```typescript
/**
 * Event Factory - Type-safe semantic event creation
 *
 * @see ADR-082 for design rationale
 */
import { EventDataRegistry, EventType } from './event-registry';
import { TypedSemanticEvent } from './typed-event';
import { ISemanticEvent } from './types';
/**
 * Options for creating an event.
 */
export interface CreateEventOptions {
    /**
     * Entities involved in the event.
     */
    entities?: ISemanticEvent['entities'];
    /**
     * Tags for categorizing the event.
     */
    tags?: string[];
    /**
     * Priority of the event (higher = more important).
     */
    priority?: number;
    /**
     * Whether this event should be narrated.
     */
    narrate?: boolean;
    /**
     * Custom event ID (auto-generated if not provided).
     */
    id?: string;
}
/**
 * Create a type-safe semantic event.
 *
 * The data parameter is strictly typed based on the event type,
 * providing compile-time verification of event data.
 *
 * @example
 * ```typescript
 * // TypeScript enforces correct data shape
 * const event = createTypedEvent('query.invalid', {
 *   message: 'Invalid input',
 *   hint: 'Please try again'
 * });
 *
 * // This would be a compile error:
 * // createTypedEvent('query.invalid', { wrongField: true });
 * ```
 */
export declare function createTypedEvent<T extends EventType>(type: T, data: EventDataRegistry[T], options?: CreateEventOptions): TypedSemanticEvent<T>;
/**
 * Message event variant types.
 */
export type MessageVariant = 'success' | 'failure' | 'info' | 'warning' | 'debug';
/**
 * Create a message event (convenience helper).
 *
 * @example
 * ```typescript
 * const event = createMessageEvent('success', 'item_taken', {
 *   item: 'brass lantern'
 * });
 * ```
 */
export declare function createMessageEvent(variant: MessageVariant, messageId: string, params?: Record<string, unknown>, options?: CreateEventOptions): TypedSemanticEvent<`message.${MessageVariant}`>;
/**
 * Create an empty event (for events with no data).
 *
 * @example
 * ```typescript
 * const event = createEmptyEvent('platform.quit_cancelled');
 * ```
 */
export declare function createEmptyEvent<T extends EventType>(type: T, options?: CreateEventOptions): TypedSemanticEvent<T>;
/**
 * Reset the event counter (useful for testing).
 */
export declare function resetEventCounter(): void;
```

### events/event-helpers

```typescript
/**
 * Event Helpers - Type-safe event consumption utilities
 *
 * These functions help consumers safely extract typed data from events
 * without resorting to `as any` casts.
 *
 * @see ADR-082 for design rationale
 */
import { EventDataRegistry, EventType } from './event-registry';
import { ISemanticEvent } from './types';
/**
 * Check if an event is of a specific type and narrow its type.
 *
 * This is a type guard that allows TypeScript to narrow the event
 * type in conditional branches.
 *
 * @example
 * ```typescript
 * function processEvent(event: ISemanticEvent) {
 *   if (isEventType(event, 'query.invalid')) {
 *     // TypeScript knows event.data is QueryInvalidData
 *     console.log(event.data.message);
 *     console.log(event.data.hint);
 *   }
 * }
 * ```
 */
export declare function isEventType<T extends EventType>(event: ISemanticEvent, type: T): event is ISemanticEvent & {
    type: T;
    data: EventDataRegistry[T];
};
/**
 * Check if an event type starts with a prefix.
 *
 * Useful for handling categories of events (e.g., all message.* events).
 *
 * @example
 * ```typescript
 * if (hasEventPrefix(event, 'message.')) {
 *   // Handle any message event
 * }
 * ```
 */
export declare function hasEventPrefix(event: ISemanticEvent, prefix: string): boolean;
/**
 * Get typed event data if the event matches the expected type.
 *
 * Returns undefined if the event type doesn't match. This is the safe
 * way to extract data when you're not sure of the event type.
 *
 * @example
 * ```typescript
 * const data = getEventData(event, 'quit.confirmed');
 * if (data) {
 *   console.log(`Final score: ${data.finalScore}`);
 * }
 * ```
 */
export declare function getEventData<T extends EventType>(event: ISemanticEvent, expectedType: T): EventDataRegistry[T] | undefined;
/**
 * Get event data with a fallback for missing properties.
 *
 * This is useful when you need default values for optional fields.
 *
 * @example
 * ```typescript
 * const { message, hint } = getEventDataWithDefaults(
 *   event,
 *   'query.invalid',
 *   { message: 'Invalid response.', hint: undefined }
 * );
 * ```
 */
export declare function getEventDataWithDefaults<T extends EventType>(event: ISemanticEvent, expectedType: T, defaults: EventDataRegistry[T]): EventDataRegistry[T];
/**
 * Assert and get typed event data.
 *
 * Throws if the event type doesn't match. Use this when you're certain
 * of the event type and want a clear error if assumptions are wrong.
 *
 * @example
 * ```typescript
 * // In a handler that only receives 'quit.confirmed' events
 * const data = requireEventData(event, 'quit.confirmed');
 * console.log(`Score: ${data.finalScore}/${data.maxScore}`);
 * ```
 */
export declare function requireEventData<T extends EventType>(event: ISemanticEvent, expectedType: T): EventDataRegistry[T];
/**
 * Safely access a property from event data with type inference.
 *
 * Returns undefined if the event type doesn't match or the property
 * doesn't exist.
 *
 * @example
 * ```typescript
 * const message = getEventProperty(event, 'query.invalid', 'message');
 * // message is string | undefined
 * ```
 */
export declare function getEventProperty<T extends EventType, K extends keyof EventDataRegistry[T]>(event: ISemanticEvent, expectedType: T, property: K): EventDataRegistry[T][K] | undefined;
/**
 * Get event data as a generic record for untyped event access.
 *
 * Use this when working with events that aren't yet in the EventDataRegistry.
 * Prefer using typed helpers (isEventType, getEventData) when the event
 * type is known.
 *
 * @example
 * ```typescript
 * const data = getUntypedEventData(event);
 * if (data.customField) {
 *   console.log(data.customField);
 * }
 * ```
 */
export declare function getUntypedEventData(event: ISemanticEvent): Record<string, unknown>;
```

### events/event-source

```typescript
/**
 * Generic event source infrastructure for the narrative engine.
 * This provides a simple pub/sub mechanism for any type of event.
 */
/**
 * Generic event source interface for pub/sub pattern
 */
export interface IGenericEventSource<T> {
    /**
     * Emit an event to all subscribers
     */
    emit(event: T): void;
    /**
     * Subscribe to events
     * @returns Unsubscribe function
     */
    subscribe(handler: (event: T) => void): () => void;
}
/**
 * Simple synchronous implementation of EventSource
 */
export declare class SimpleEventSource<T> implements IGenericEventSource<T> {
    private handlers;
    emit(event: T): void;
    subscribe(handler: (event: T) => void): () => void;
    /**
     * Get the current number of subscribers
     */
    get subscriberCount(): number;
    /**
     * Remove all subscribers
     */
    clear(): void;
}
/**
 * Create a new event source for a specific event type
 */
export declare function createEventSource<T>(): IGenericEventSource<T>;
```

### events/semantic-event-source

```typescript
/**
 * Semantic event source - specialized event source for story events
 * Builds on the generic event source infrastructure
 */
import { IGenericEventSource, SimpleEventSource } from './event-source';
import { ISemanticEvent, IEventEmitter } from './types';
import { EntityId } from '../types/entity';
/**
 * Specialized event source for semantic (story) events
 * Provides additional filtering and query capabilities
 */
export interface ISemanticEventSource extends IGenericEventSource<ISemanticEvent> {
    /**
     * Add an event to the source
     */
    addEvent(event: ISemanticEvent): void;
    /**
     * Get all events in the source
     */
    getAllEvents(): ISemanticEvent[];
    /**
     * Get events of a specific type
     */
    getEventsByType(type: string): ISemanticEvent[];
    /**
     * Get events involving a specific entity
     */
    getEventsByEntity(entityId: EntityId): ISemanticEvent[];
    /**
     * Get events with a specific tag
     */
    getEventsByTag(tag: string): ISemanticEvent[];
    /**
     * Clear all events
     */
    clearEvents(): void;
    /**
     * Apply a filter to the events
     */
    filter(predicate: (event: ISemanticEvent) => boolean): ISemanticEvent[];
    /**
     * Get the event emitter associated with this source
     */
    getEmitter(): IEventEmitter;
}
/**
 * Implementation of semantic event source
 */
export declare class SemanticEventSourceImpl extends SimpleEventSource<ISemanticEvent> implements ISemanticEventSource {
    private events;
    private eventEmitter;
    private lastProcessedIndex;
    constructor();
    addEvent(event: ISemanticEvent): void;
    getAllEvents(): ISemanticEvent[];
    getEventsByType(type: string): ISemanticEvent[];
    getEventsByEntity(entityId: EntityId): ISemanticEvent[];
    getEventsByTag(tag: string): ISemanticEvent[];
    filter(predicate: (event: ISemanticEvent) => boolean): ISemanticEvent[];
    clearEvents(): void;
    getEmitter(): IEventEmitter;
    /**
     * Get events since a specific event ID
     */
    getEventsSince(eventId?: string): ISemanticEvent[];
    /**
     * Get unprocessed events and mark them as processed
     */
    getUnprocessedEvents(): ISemanticEvent[];
}
/**
 * Create a new semantic event source
 */
export declare function createSemanticEventSource(): ISemanticEventSource;
/**
 * Type alias for backwards compatibility
 * @deprecated Use SemanticEventSource instead
 */
export type EventSource = ISemanticEventSource;
/**
 * Create event source for backwards compatibility
 * @deprecated Use createSemanticEventSource instead
 */
export declare function createEventSource(): EventSource;
```

### events/event-system

```typescript
import { ISemanticEvent } from './types';
import { EntityId } from '../types/entity';
import { ISemanticEventSource } from './semantic-event-source';
/**
 * Create a new semantic event
 */
export declare function createEvent(type: string, data?: Record<string, unknown>, entities?: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
    others?: EntityId[];
}, metadata?: {
    tags?: string[];
    priority?: number;
    narrate?: boolean;
    source?: string;
    sessionId?: string;
    [key: string]: unknown;
}): ISemanticEvent;
export { SemanticEventSourceImpl as EventSourceImpl } from './semantic-event-source';
/**
 * Create a new event source
 * @deprecated Use createSemanticEventSource from './semantic-event-source'
 */
export declare function createEventSource(): ISemanticEventSource;
```

### extensions/types

```typescript
import { ISemanticEvent } from '../events/types';
/**
 * Base interface for all extensions
 */
export interface IExtension {
    /**
     * Unique identifier for this extension
     */
    id: string;
    /**
     * Human-readable name of the extension
     */
    name: string;
    /**
     * Version of the extension
     */
    version?: string;
    /**
     * Extension dependencies
     */
    dependencies?: string[];
}
/**
 * Extension for command handling (generic)
 * The IF-specific version with ParsedCommand and GameContext is in stdlib
 */
export interface ICommandExtension extends IExtension {
    /**
     * Verbs that this extension can handle
     */
    verbs: string[];
}
/**
 * Extension for abilities (generic)
 * The IF-specific version with GameContext is in stdlib
 */
export interface IAbilityExtension extends IExtension {
    /**
     * Name of the ability
     */
    abilityName: string;
}
/**
 * Extension for event processing (generic)
 * The IF-specific version with GameContext is in stdlib
 */
export interface IEventExtension extends IExtension {
    /**
     * Event types that this extension handles
     */
    eventTypes: string[];
    /**
     * Process an event
     */
    processEvent: (event: ISemanticEvent) => ISemanticEvent[];
}
/**
 * Extension for parser enhancements (generic)
 * The IF-specific version with ParsedCommand is in stdlib
 */
export interface IParserExtension extends IExtension {
    /**
     * Grammar rules, dictionaries, etc.
     */
    vocabulary?: Record<string, string[]>;
    /**
     * Pre-processing hook for input text
     */
    preProcessInput?: (input: string) => string;
}
/**
 * Extension types enum
 */
export declare enum ExtensionType {
    COMMAND = "command",
    ABILITY = "ability",
    EVENT = "event",
    PARSER = "parser"
}
/**
 * Union type for all extension types
 */
export type AnyExtension = ICommandExtension | IAbilityExtension | IEventExtension | IParserExtension;
```

### execution/types

```typescript
/**
 * Generic context interface for execution
 * Domain-specific contexts should extend this interface
 */
export interface IExecutionContext {
    /**
     * Additional context data
     */
    [key: string]: any;
}
/**
 * Generic handler interface for any command-like system
 * This is kept generic - specific implementations (IF, visual novel, etc)
 * should define their own command and result types
 */
export interface ICommandHandler<TCommand = any, TResult = any> {
    /**
     * The verb or verbs that this handler can process
     */
    verbs: string[];
    /**
     * Check if this handler can handle the given command
     */
    canHandle: (command: TCommand, context: IExecutionContext) => boolean;
    /**
     * Execute the command
     */
    execute: (command: TCommand, context: IExecutionContext) => Promise<TResult> | TResult;
    /**
     * Validate the command before execution
     */
    validate?: (command: TCommand, context: IExecutionContext) => {
        valid: boolean;
        error?: string;
    };
}
/**
 * Generic action interface
 * Actions are handlers with unique identifiers
 */
export interface IAction<TCommand = any, TResult = any> extends ICommandHandler<TCommand, TResult> {
    /**
     * Unique identifier for the action
     */
    id: string;
    /**
     * Action metadata (if any)
     */
    metadata?: any;
}
/**
 * Generic router interface for command-like systems
 */
export interface ICommandRouter<TCommand = any, TResult = any> {
    /**
     * Register a command handler
     */
    registerHandler: (handler: ICommandHandler<TCommand, TResult>) => void;
    /**
     * Unregister a command handler
     */
    unregisterHandler: (handler: ICommandHandler<TCommand, TResult>) => void;
    /**
     * Get a handler for the command
     */
    getHandler: (command: TCommand, context: IExecutionContext) => ICommandHandler<TCommand, TResult> | undefined;
    /**
     * Route and execute a command
     */
    execute: (command: TCommand, context: IExecutionContext, options?: ICommandExecutionOptions<TCommand>) => Promise<TResult>;
    /**
     * Process the result of command execution and return text output
     */
    processResult?: (result: TResult) => string;
}
/**
 * Generic factory interface for creating handlers
 */
export interface ICommandHandlerFactory<TCommand = any, TResult = any> {
    /**
     * Create a standard command handler
     */
    createHandler: (config: {
        verbs: string[];
        canHandle?: (command: TCommand, context: IExecutionContext) => boolean;
        execute: (command: TCommand, context: IExecutionContext) => Promise<TResult> | TResult;
        validate?: (command: TCommand, context: IExecutionContext) => {
            valid: boolean;
            error?: string;
        };
    }) => ICommandHandler<TCommand, TResult>;
}
/**
 * Options for command execution
 */
export interface ICommandExecutionOptions<TCommand = any, TResult = any> {
    /**
     * Whether to skip validation
     */
    skipValidation?: boolean;
    /**
     * Custom validation callback
     */
    customValidation?: (command: TCommand, context: IExecutionContext) => {
        valid: boolean;
        error?: string;
    };
    /**
     * Pre-execution hooks
     */
    preExecute?: ((command: TCommand, context: IExecutionContext) => Promise<void> | void)[];
    /**
     * Post-execution hooks
     */
    postExecute?: ((result: TResult, command: TCommand, context: IExecutionContext) => Promise<TResult> | TResult)[];
}
```

### rules/types

```typescript
/**
 * Simple Rule System v2 - Clean, functional design
 */
import { EntityId } from '../types/entity';
import { ISemanticEvent } from '../events/types';
/**
 * Simple world interface for rules - no complex abstractions
 */
export interface IRuleWorld {
    getEntity(id: EntityId): any;
    updateEntity(id: EntityId, changes: Record<string, any>): void;
    getPlayer(): any;
    getCurrentLocation(): any;
}
/**
 * Result of executing a rule
 */
export interface IRuleResult {
    /** Prevent the original action from happening */
    prevent?: boolean;
    /** Message to display to the player */
    message?: string;
    /** Additional events to generate */
    events?: ISemanticEvent[];
    /** Entity changes to apply */
    changes?: IEntityChange[];
}
/**
 * A change to apply to an entity
 */
export interface IEntityChange {
    entityId: EntityId;
    attribute: string;
    value: any;
}
/**
 * A simple rule definition
 */
export interface IRule {
    /** Unique identifier for the rule */
    id: string;
    /** Event type this rule responds to (e.g., 'item:taking') */
    eventType: string;
    /** Optional condition - if false, rule doesn't fire */
    condition?: (event: ISemanticEvent, world: IRuleWorld) => boolean;
    /** Action to take when rule fires */
    action: (event: ISemanticEvent, world: IRuleWorld) => IRuleResult;
    /** Priority (higher = runs first) */
    priority?: number;
}
/**
 * Simple rule system interface
 */
export interface ISimpleRuleSystem {
    /** Add a rule */
    addRule(rule: IRule): void;
    /** Remove a rule */
    removeRule(ruleId: string): void;
    /** Process an event through all matching rules */
    processEvent(event: ISemanticEvent, world: IRuleWorld): IRuleResult;
    /** Get all rules */
    getRules(): IRule[];
}
```

### rules/simple-rule-system

```typescript
/**
 * Simple Rule System Implementation
 */
import { ISemanticEvent } from '../events/types';
import { IRule, IRuleResult, IRuleWorld, ISimpleRuleSystem } from './types';
/**
 * Simple rule system implementation
 */
export declare class SimpleRuleSystemImpl implements ISimpleRuleSystem {
    private rules;
    /**
     * Add a rule to the system
     */
    addRule(rule: IRule): void;
    /**
     * Remove a rule from the system
     */
    removeRule(ruleId: string): void;
    /**
     * Get all rules
     */
    getRules(): IRule[];
    /**
     * Process an event through all matching rules
     */
    processEvent(event: ISemanticEvent, world: IRuleWorld): IRuleResult;
    /**
     * Find rules that match the given event
     */
    private getMatchingRules;
}
/**
 * Create a new simple rule system
 */
export declare function createSimpleRuleSystem(): ISimpleRuleSystem;
```

### rules/helpers

```typescript
/**
 * Helper functions for common rule patterns
 */
import { EntityId } from '../types/entity';
import { ISemanticEvent } from '../events/types';
import { IRuleWorld, IEntityChange } from './types';
/**
 * Helper to get the target item from an event
 */
export declare function getTargetItem(event: ISemanticEvent, world: IRuleWorld): any;
/**
 * Helper to get the actor from an event
 */
export declare function getActor(event: ISemanticEvent, world: IRuleWorld): any;
/**
 * Helper to check if entity has a specific name/id
 */
export declare function entityIs(entity: any, nameOrId: string): boolean;
/**
 * Helper to get entity attribute value
 */
export declare function getAttribute(entity: any, attribute: string): any;
/**
 * Helper to check if entity has an ability
 */
export declare function hasAbility(entity: any, ability: string): boolean;
/**
 * Helper to create an entity change that gives an ability
 */
export declare function giveAbility(entityId: EntityId, ability: string): IEntityChange;
/**
 * Helper to create an entity change that removes an ability
 */
export declare function removeAbility(entityId: EntityId, ability: string): IEntityChange;
/**
 * Helper to create an entity change that sets an attribute
 */
export declare function setAttribute(entityId: EntityId, attribute: string, value: any): IEntityChange;
/**
 * Common condition: item weight vs player strength
 */
export declare function itemTooHeavy(event: ISemanticEvent, world: IRuleWorld): boolean;
/**
 * Common condition: check if taking a specific item
 */
export declare function isTaking(itemNameOrId: string): (event: ISemanticEvent, world: IRuleWorld) => boolean;
/**
 * Common condition: player has specific ability
 */
export declare function playerHasAbility(ability: string): (event: ISemanticEvent, world: IRuleWorld) => boolean;
```

### rules/rule-world-adapter

```typescript
/**
 * Adapter to make existing world model work with simple rule system
 */
import { EntityId } from '../types/entity';
import { IRuleWorld } from './types';
/**
 * Simple adapter for any object-based world state
 */
export declare class SimpleRuleWorldAdapter implements IRuleWorld {
    private worldState;
    private playerId;
    private currentLocationId?;
    constructor(worldState: any, playerId?: EntityId, currentLocationId?: EntityId | undefined);
    /**
     * Get an entity by ID
     */
    getEntity(id: EntityId): any;
    /**
     * Update an entity with new attributes
     */
    updateEntity(id: EntityId, changes: Record<string, any>): void;
    /**
     * Get the player entity
     */
    getPlayer(): any;
    /**
     * Get the current location entity
     */
    getCurrentLocation(): any;
    /**
     * Set the player ID
     */
    setPlayerId(playerId: EntityId): void;
    /**
     * Set the current location ID
     */
    setCurrentLocationId(locationId: EntityId): void;
}
/**
 * Create a simple rule world from basic state
 */
export declare function createSimpleRuleWorld(worldState: any, playerId?: EntityId, currentLocationId?: EntityId): IRuleWorld;
```

### rules/compatibility

```typescript
/**
 * Compatibility adapter for the old RuleSystem interface
 * This allows existing code to work with the new simple rule system
 */
import { ISemanticEvent } from '../events/types';
import { SimpleRuleSystemImpl } from './simple-rule-system';
/**
 * Game context interface that the old system expects
 */
interface GameContext {
    worldState: any;
    player: any;
    currentLocation: any;
    getEntity: (id: string) => any;
    updateWorldState?: (updater: (state: any) => any) => GameContext;
    [key: string]: any;
}
/**
 * Result interface that the old system expects
 */
interface OldRuleResult {
    prevented: boolean;
    preventMessage?: string;
    events: ISemanticEvent[];
    context: GameContext;
}
/**
 * Old RuleSystem interface for compatibility
 */
export interface IRuleSystem {
    processEvent(event: ISemanticEvent, context: GameContext): OldRuleResult;
}
/**
 * Adapter that makes the new SimpleRuleSystem compatible with old interfaces
 */
export declare class RuleSystemAdapter implements IRuleSystem {
    private simpleRuleSystem;
    constructor(simpleRuleSystem: SimpleRuleSystemImpl);
    processEvent(event: ISemanticEvent, context: GameContext): OldRuleResult;
}
/**
 * Create a compatible rule system
 */
export declare function createRuleSystem(): IRuleSystem;
export {};
```

### debug/types

```typescript
/**
 * Debug event types for diagnostic information.
 * These are separate from semantic events and used for development/debugging.
 */
/**
 * Debug event emitted by various subsystems for diagnostic purposes.
 * These events are NOT part of the game's semantic event system.
 */
export interface IDebugEvent {
    /** Unique identifier for this debug event */
    id: string;
    /** When the event was emitted */
    timestamp: number;
    /** Which subsystem emitted this event */
    subsystem: 'parser' | 'validator' | 'executor' | 'world-model' | 'text-service';
    /** Type of debug event within the subsystem */
    type: string;
    /** Event-specific data */
    data: any;
}
/**
 * Callback function for receiving debug events
 */
export type DebugEventCallback = (event: IDebugEvent) => void;
/**
 * Context for debug event emission, passed to subsystems
 */
export interface IDebugContext {
    /** Optional callback to emit debug events */
    emit?: DebugEventCallback;
    /** Whether debug events are enabled */
    enabled: boolean;
}
/**
 * Common debug event types by subsystem
 */
export declare const DebugEventTypes: {
    readonly parser: {
        readonly TOKEN_ANALYSIS: "token_analysis";
        readonly PATTERN_MATCH: "pattern_match";
        readonly CANDIDATE_SCORING: "candidate_scoring";
    };
    readonly validator: {
        readonly ENTITY_RESOLUTION: "entity_resolution";
        readonly SCOPE_CHECK: "scope_check";
        readonly AMBIGUITY_RESOLUTION: "ambiguity_resolution";
        readonly VALIDATION_ERROR: "validation_error";
    };
    readonly executor: {
        readonly ACTION_START: "action_start";
        readonly ACTION_COMPLETE: "action_complete";
        readonly ACTION_ERROR: "action_error";
    };
    readonly worldModel: {
        readonly ENTITY_CHANGE: "entity_change";
        readonly RELATION_CHANGE: "relation_change";
        readonly PROPERTY_CHANGE: "property_change";
    };
    readonly textService: {
        readonly TEMPLATE_SELECTION: "template_selection";
        readonly TEXT_GENERATION: "text_generation";
        readonly CHANNEL_ROUTING: "channel_routing";
    };
};
```

### query/types

```typescript
/**
 * Core types for the PC communication query system
 *
 * These types define the structure of queries, responses, and validation
 * for the client query system (ADR-018).
 */
/**
 * Sources that can initiate queries
 */
export declare enum QuerySource {
    /** System-level queries (save, quit, restart) */
    SYSTEM = "system",
    /** Parser disambiguation queries */
    DISAMBIGUATION = "disambiguation",
    /** NPC dialogue queries */
    NPC = "npc",
    /** Game mechanic queries (passwords, combinations) */
    GAME_MECHANIC = "mechanic",
    /** Narrative-driven queries */
    NARRATIVE = "narrative"
}
/**
 * Types of queries that can be presented
 */
export declare enum QueryType {
    /** Simple yes/no question */
    YES_NO = "yes_no",
    /** Multiple choice with predefined options */
    MULTIPLE_CHOICE = "multiple_choice",
    /** Open-ended text input */
    FREE_TEXT = "free_text",
    /** Numeric input only */
    NUMERIC = "numeric",
    /** Special type for disambiguation */
    DISAMBIGUATION = "disambiguation"
}
/**
 * A query waiting for player response
 */
export interface IPendingQuery {
    /** Unique identifier for this query */
    id: string;
    /** Source that initiated the query */
    source: QuerySource;
    /** Type of query */
    type: QueryType;
    /** Message ID for the query prompt */
    messageId: string;
    /** Parameters for message formatting */
    messageParams?: Record<string, any>;
    /** Available options (for multiple choice) */
    options?: string[];
    /** Additional context for the query handler */
    context: IQueryContext;
    /** Whether the player can interrupt this query */
    allowInterruption: boolean;
    /** Name of the validator to use */
    validator?: string;
    /** Optional timeout in milliseconds */
    timeout?: number;
    /** Timestamp when query was created */
    created: number;
    /** Priority level (higher = more important) */
    priority?: number;
}
/**
 * Context data passed with queries
 */
export interface IQueryContext {
    /** Query-specific data */
    [key: string]: any;
    /** For quit queries */
    score?: number;
    maxScore?: number;
    moves?: number;
    hasUnsavedProgress?: boolean;
    nearComplete?: boolean;
    /** For save queries */
    existingFile?: string;
    lastSaveTime?: number;
    /** For disambiguation */
    candidates?: Array<{
        id: string;
        name: string;
        description?: string;
    }>;
    /** For NPC queries */
    npcId?: string;
    npcName?: string;
    topic?: string;
    /** For game mechanic queries */
    attempts?: number;
    maxAttempts?: number;
    hint?: string;
}
/**
 * Player's response to a query
 */
export interface IQueryResponse {
    /** ID of the query being responded to */
    queryId: string;
    /** Raw input from the player */
    rawInput: string;
    /** Processed/normalized response */
    response: string | number | boolean;
    /** Selected option index (for multiple choice) */
    selectedIndex?: number;
    /** Whether this was an interruption */
    wasInterrupted: boolean;
    /** Timestamp of response */
    timestamp: number;
}
/**
 * Function to validate a response
 */
export type QueryValidator = (response: string, query: IPendingQuery) => IValidationResult;
/**
 * Result of validating a response
 */
export interface IValidationResult {
    /** Whether the response is valid */
    valid: boolean;
    /** Error message if invalid */
    message?: string;
    /** Normalized/parsed response value */
    normalized?: any;
    /** Hint for the player */
    hint?: string;
}
/**
 * Handler for processing query responses
 */
export interface IQueryHandler {
    /** Query types this handler can process */
    canHandle: (query: IPendingQuery) => boolean;
    /** Process a validated response */
    handleResponse: (response: IQueryResponse, query: IPendingQuery) => void;
    /** Handle query timeout */
    handleTimeout?: (query: IPendingQuery) => void;
    /** Handle query cancellation */
    handleCancel?: (query: IPendingQuery) => void;
}
/**
 * Query manager state
 */
export interface IQueryState {
    /** Currently active query */
    pendingQuery?: IPendingQuery;
    /** Stack of queries waiting to be presented */
    queryStack: IPendingQuery[];
    /** History of recent queries and responses */
    history: Array<{
        query: IPendingQuery;
        response?: IQueryResponse;
        result: 'answered' | 'timeout' | 'cancelled';
    }>;
    /** Whether input is currently being routed to query system */
    interceptingInput: boolean;
}
/**
 * Events emitted by the query system
 */
export interface IQueryEvents {
    /** A new query needs to be presented to the player */
    'query:pending': (query: IPendingQuery) => void;
    /** A query was answered */
    'query:answered': (response: IQueryResponse, query: IPendingQuery) => void;
    /** A query timed out */
    'query:timeout': (query: IPendingQuery) => void;
    /** A query was cancelled */
    'query:cancelled': (query: IPendingQuery) => void;
    /** A query was interrupted by a command */
    'query:interrupted': (query: IPendingQuery, command: string) => void;
    /** Validation failed for a response */
    'query:invalid': (response: string, result: IValidationResult, query: IPendingQuery) => void;
}
/**
 * Standard validators
 */
export declare const StandardValidators: {
    /** Validate yes/no responses */
    yesNo: (response: string) => IValidationResult;
    /** Validate numeric responses */
    numeric: (response: string, min?: number, max?: number) => IValidationResult;
    /** Validate multiple choice responses */
    multipleChoice: (response: string, options: string[]) => IValidationResult;
};
```

### query/query-manager

```typescript
/**
 * Query Manager - Manages pending queries and routes responses
 *
 * This is the core component of the PC communication system (ADR-018).
 * It tracks pending queries, validates responses, and routes them to
 * appropriate handlers.
 */
import EventEmitter from 'eventemitter3';
import { IPendingQuery, IQueryResponse, IQueryState, IQueryHandler, QueryValidator, IQueryEvents } from './types';
import { ISemanticEventSource } from '../events';
/**
 * Query Manager implementation
 */
export declare class QueryManager extends EventEmitter {
    private state;
    private handlers;
    private validators;
    private timeouts;
    private eventSource;
    constructor();
    /**
     * Register a query handler
     */
    registerHandler(id: string, handler: IQueryHandler): void;
    /**
     * Register a response validator
     */
    registerValidator(name: string, validator: QueryValidator): void;
    /**
     * Present a query to the player
     */
    askQuery(query: IPendingQuery): Promise<IQueryResponse | null>;
    /**
     * Process input while a query is pending
     */
    processInput(input: string): 'handled' | 'interrupt' | 'pass';
    /**
     * Cancel the current query
     */
    cancelCurrentQuery(): void;
    /**
     * Get current state
     */
    getState(): Readonly<IQueryState>;
    /**
     * Get event source for connecting to engine
     */
    getEventSource(): ISemanticEventSource;
    /**
     * Check if there's a pending query
     */
    hasPendingQuery(): boolean;
    /**
     * Get the current pending query
     */
    getCurrentQuery(): IPendingQuery | undefined;
    /**
     * Clear all queries
     */
    clearAll(): void;
    /**
     * Handle query timeout
     */
    private handleTimeout;
    /**
     * Interrupt a query with a command
     */
    private interruptQuery;
    /**
     * Find handler for a query
     */
    private findHandler;
    /**
     * Check if input looks like a command
     */
    private looksLikeCommand;
}
/**
 * Create a new query manager instance
 */
export declare function createQueryManager(): QueryManager;
/**
 * Type guard for query events
 */
export declare function isQueryEvent<K extends keyof IQueryEvents>(event: string | symbol, key: K): event is K;
```

### random/seeded-random

```typescript
/**
 * Seeded Random Number Generator Interface
 *
 * Provides deterministic randomness for reproducible game behavior.
 */
/**
 * Seeded random number generator interface
 */
export interface SeededRandom {
    /** Get a random number between 0 and 1 */
    next(): number;
    /** Get a random integer between min and max (inclusive) */
    int(min: number, max: number): number;
    /** Return true with given probability (0-1) */
    chance(probability: number): boolean;
    /** Pick a random element from an array */
    pick<T>(array: T[]): T;
    /** Shuffle an array */
    shuffle<T>(array: T[]): T[];
    /** Get the current seed */
    getSeed(): number;
    /** Set a new seed */
    setSeed(seed: number): void;
}
/**
 * Create a seeded random number generator
 *
 * Uses a Linear Congruential Generator (LCG) for deterministic randomness.
 * This ensures reproducible behavior for testing and save/load.
 */
export declare function createSeededRandom(seed?: number): SeededRandom;
```
