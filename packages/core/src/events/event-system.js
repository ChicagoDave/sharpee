// packages/core/src/events/event-system.ts
/**
 * Create a new semantic event
 */
export function createEvent(type, payload, options = {}) {
    return {
        id: generateEventId(),
        type,
        timestamp: Date.now(),
        entities: {
            actor: options.actor,
            target: options.target,
            instrument: options.instrument,
            location: options.location,
            others: options.others
        },
        payload,
        tags: options.tags || [],
        priority: options.priority ?? 0,
        narrate: options.narrate ?? true
    };
}
/**
 * Implementation of the EventSource interface
 */
export class EventSourceImpl {
    constructor(emitter) {
        this.events = [];
        this.emitter = emitter || new EventEmitterImpl();
    }
    /**
     * Add an event to the source
     */
    addEvent(event) {
        this.events.push(event);
        this.emitter.emit(event);
    }
    /**
     * Get all events in the source
     */
    getAllEvents() {
        return [...this.events];
    }
    /**
     * Get events of a specific type
     */
    getEventsByType(type) {
        return this.events.filter(event => event.type === type);
    }
    /**
     * Get events involving a specific entity
     */
    getEventsByEntity(entityId) {
        return this.events.filter(event => {
            const entities = event.entities;
            return (entities.actor === entityId ||
                entities.target === entityId ||
                entities.instrument === entityId ||
                entities.location === entityId ||
                (entities.others && entities.others.includes(entityId)));
        });
    }
    /**
     * Get events with a specific tag
     */
    getEventsByTag(tag) {
        return this.events.filter(event => event.tags && event.tags.includes(tag));
    }
    /**
     * Clear all events
     */
    clearEvents() {
        this.events = [];
    }
    /**
     * Apply a filter to the events
     */
    filter(predicate) {
        return this.events.filter(predicate);
    }
    /**
     * Get the event emitter
     */
    getEmitter() {
        return this.emitter;
    }
}
/**
 * Implementation of the EventEmitter interface
 */
export class EventEmitterImpl {
    constructor() {
        this.listeners = new Map();
        this.globalListeners = new Set();
    }
    /**
     * Add an event listener
     */
    on(type, listener) {
        // For global listeners
        if (type === '*') {
            this.globalListeners.add(listener);
            return;
        }
        // For specific event types
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(listener);
    }
    /**
     * Remove an event listener
     */
    off(type, listener) {
        // For global listeners
        if (type === '*') {
            this.globalListeners.delete(listener);
            return;
        }
        // For specific event types
        const typeListeners = this.listeners.get(type);
        if (typeListeners) {
            typeListeners.delete(listener);
            if (typeListeners.size === 0) {
                this.listeners.delete(type);
            }
        }
    }
    /**
     * Emit an event
     */
    emit(event) {
        // Call type-specific listeners
        const typeListeners = this.listeners.get(event.type);
        if (typeListeners) {
            for (const listener of typeListeners) {
                try {
                    listener(event);
                }
                catch (error) {
                    console.error(`Error in event listener for ${event.type}:`, error);
                }
            }
        }
        // Call global listeners
        for (const listener of this.globalListeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error(`Error in global event listener for ${event.type}:`, error);
            }
        }
    }
}
/**
 * Generate a unique ID for an event
 */
function generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Create a new event source
 */
export function createEventSource() {
    return new EventSourceImpl();
}
/**
 * Create a new event emitter
 */
export function createEventEmitter() {
    return new EventEmitterImpl();
}
//# sourceMappingURL=event-system.js.map