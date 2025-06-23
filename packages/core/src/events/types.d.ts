/**
 * Generic entity ID type
 */
export type EntityId = string;
/**
 * Represents a semantic event in the system
 */
export interface SemanticEvent {
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
     * Additional data related to the event
     */
    payload?: Record<string, unknown>;
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
    /**
     * Legacy support for data property (same as payload)
     */
    data?: Record<string, unknown>;
    /**
     * Legacy support for metadata property
     */
    metadata?: Record<string, unknown>;
}
/**
 * Interface for event source that collects and manages events
 */
export interface EventSource {
    /**
     * Add an event to the source
     */
    addEvent: (event: SemanticEvent) => void;
    /**
     * Get all events in the source
     */
    getAllEvents: () => SemanticEvent[];
    /**
     * Get events of a specific type
     */
    getEventsByType: (type: string) => SemanticEvent[];
    /**
     * Get events involving a specific entity
     */
    getEventsByEntity: (entityId: EntityId) => SemanticEvent[];
    /**
     * Get events with a specific tag
     */
    getEventsByTag: (tag: string) => SemanticEvent[];
    /**
     * Clear all events
     */
    clearEvents: () => void;
    /**
     * Apply a filter to the events
     */
    filter: (predicate: (event: SemanticEvent) => boolean) => SemanticEvent[];
    /**
     * Get the event emitter associated with this source
     */
    getEmitter: () => EventEmitter;
}
/**
 * Event listener for semantic events
 */
export type EventListener = (event: SemanticEvent) => void;
/**
 * Event emitter for semantic events
 */
export interface EventEmitter {
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
    emit: (event: SemanticEvent) => void;
}
/**
 * Configuration options for the event system
 */
export interface EventSystemOptions {
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
    emitFilter?: (event: SemanticEvent) => boolean;
}
