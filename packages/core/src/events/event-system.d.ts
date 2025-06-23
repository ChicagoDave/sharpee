import { SemanticEvent, EventSource, EventEmitter, EventListener, EntityId } from './types';
/**
 * Create a new semantic event
 */
export declare function createEvent(type: string, payload?: Record<string, unknown>, options?: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
    others?: EntityId[];
    tags?: string[];
    priority?: number;
    narrate?: boolean;
}): SemanticEvent;
/**
 * Implementation of the EventSource interface
 */
export declare class EventSourceImpl implements EventSource {
    private events;
    private emitter;
    constructor(emitter?: EventEmitterImpl);
    /**
     * Add an event to the source
     */
    addEvent(event: SemanticEvent): void;
    /**
     * Get all events in the source
     */
    getAllEvents(): SemanticEvent[];
    /**
     * Get events of a specific type
     */
    getEventsByType(type: string): SemanticEvent[];
    /**
     * Get events involving a specific entity
     */
    getEventsByEntity(entityId: EntityId): SemanticEvent[];
    /**
     * Get events with a specific tag
     */
    getEventsByTag(tag: string): SemanticEvent[];
    /**
     * Clear all events
     */
    clearEvents(): void;
    /**
     * Apply a filter to the events
     */
    filter(predicate: (event: SemanticEvent) => boolean): SemanticEvent[];
    /**
     * Get the event emitter
     */
    getEmitter(): EventEmitter;
}
/**
 * Implementation of the EventEmitter interface
 */
export declare class EventEmitterImpl implements EventEmitter {
    private listeners;
    private globalListeners;
    /**
     * Add an event listener
     */
    on(type: string, listener: EventListener): void;
    /**
     * Remove an event listener
     */
    off(type: string, listener: EventListener): void;
    /**
     * Emit an event
     */
    emit(event: SemanticEvent): void;
}
/**
 * Create a new event source
 */
export declare function createEventSource(): EventSource;
/**
 * Create a new event emitter
 */
export declare function createEventEmitter(): EventEmitter;
