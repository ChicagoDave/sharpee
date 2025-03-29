// packages/core/src/world-model/implementations/event-emitter.ts

/**
 * Event type for type safety in event handling
 */
export type EventType = string;

/**
 * Base event interface
 */
export interface Event {
  /**
   * Type of the event
   */
  type: EventType;
  
  /**
   * Timestamp when the event was created
   */
  timestamp: number;
  
  /**
   * Optional additional data
   */
  payload?: unknown;
}

/**
 * Event listener function signature
 */
export type EventListener<T = unknown> = (event: Event & { payload?: T }) => void;

/**
 * Configuration options for listener registration
 */
export interface ListenerOptions {
  /**
   * Whether to only call the listener once
   */
  once?: boolean;
  
  /**
   * Priority of the listener (higher numbers execute first)
   */
  priority?: number;
}

/**
 * Internal representation of a listener registration
 */
interface ListenerRegistration {
  /**
   * The event listener function
   */
  listener: EventListener;
  
  /**
   * Whether this is a one-time listener
   */
  once: boolean;
  
  /**
   * Execution priority (higher executes first)
   */
  priority: number;
}

/**
 * Default standard events that the system emits
 */
export enum StandardEvents {
  STATE_UPDATED = 'state:updated',
  ENTITY_CREATED = 'entity:created',
  ENTITY_UPDATED = 'entity:updated',
  ENTITY_REMOVED = 'entity:removed',
  RELATIONSHIP_CREATED = 'relationship:created',
  RELATIONSHIP_REMOVED = 'relationship:removed',
  ERROR = 'system:error',
}

/**
 * Standard event payloads
 */
export interface StandardEventPayloads {
  [StandardEvents.STATE_UPDATED]: {
    previousState: unknown;
    currentState: unknown;
    description?: string;
  };
  [StandardEvents.ENTITY_CREATED]: {
    entityId: string;
    entityType: string;
  };
  [StandardEvents.ENTITY_UPDATED]: {
    entityId: string;
    entityType: string;
    changes: unknown;
  };
  [StandardEvents.ENTITY_REMOVED]: {
    entityId: string;
    entityType: string;
  };
  [StandardEvents.RELATIONSHIP_CREATED]: {
    sourceId: string;
    type: string;
    targetId: string;
  };
  [StandardEvents.RELATIONSHIP_REMOVED]: {
    sourceId: string;
    type: string;
    targetId: string;
  };
  [StandardEvents.ERROR]: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Typed event creation helper
 */
export function createEvent<T extends EventType>(
  type: T,
  payload?: T extends keyof StandardEventPayloads ? StandardEventPayloads[T] : unknown
): Event {
  return {
    type,
    timestamp: Date.now(),
    payload
  };
}

/**
 * Manages event listeners and dispatches events
 */
export class EventEmitter {
  /**
   * Map of event types to listener registrations
   */
  private listeners: Map<EventType, ListenerRegistration[]> = new Map();
  
  /**
   * Wildcard listeners that receive all events
   */
  private wildcardListeners: ListenerRegistration[] = [];
  
  /**
   * Registers an event listener
   * @param type Event type to listen for, or '*' for all events
   * @param listener Function to call when the event occurs
   * @param options Listener options
   */
  public on<T extends EventType>(
    type: T | '*',
    listener: EventListener<T extends keyof StandardEventPayloads ? StandardEventPayloads[T] : unknown>,
    options: ListenerOptions = {}
  ): () => void {
    const registration: ListenerRegistration = {
      listener: listener as EventListener,
      once: options.once || false,
      priority: options.priority || 0
    };
    
    if (type === '*') {
      this.wildcardListeners.push(registration);
      // Sort by priority (highest first)
      this.wildcardListeners.sort((a, b) => b.priority - a.priority);
    } else {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }
      
      this.listeners.get(type)!.push(registration);
      // Sort by priority (highest first)
      this.listeners.get(type)!.sort((a, b) => b.priority - a.priority);
    }
    
    // Return a function to remove this listener
    return () => {
      this.off(type, listener);
    };
  }
  
  /**
   * Registers a one-time event listener
   * @param type Event type to listen for, or '*' for all events
   * @param listener Function to call when the event occurs
   * @param priority Listener priority
   */
  public once<T extends EventType>(
    type: T | '*',
    listener: EventListener<T extends keyof StandardEventPayloads ? StandardEventPayloads[T] : unknown>,
    priority: number = 0
  ): () => void {
    return this.on(type, listener, { once: true, priority });
  }
  
  /**
   * Removes an event listener
   * @param type Event type the listener was registered for
   * @param listener The listener function to remove
   */
  public off<T = unknown>(type: EventType | '*', listener: EventListener<T>): void {
    if (type === '*') {
      this.wildcardListeners = this.wildcardListeners.filter(
        reg => reg.listener !== listener
      );
    } else if (this.listeners.has(type)) {
      this.listeners.set(
        type,
        this.listeners.get(type)!.filter(reg => reg.listener !== listener)
      );
    }
  }
  
  /**
   * Emits an event to all registered listeners
   * @param event The event to emit
   */
  public emit(event: Event): void {
    // Make a copy of the event to prevent modification
    const eventCopy = { ...event, timestamp: event.timestamp || Date.now() };
    
    // Call type-specific listeners
    if (this.listeners.has(event.type)) {
      const typeListeners = [...this.listeners.get(event.type)!];
      
      for (const registration of typeListeners) {
        try {
          registration.listener(eventCopy);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
        
        // Remove one-time listeners
        if (registration.once) {
          this.off(event.type, registration.listener);
        }
      }
    }
    
    // Call wildcard listeners
    const wildcardListenersCopy = [...this.wildcardListeners];
    
    for (const registration of wildcardListenersCopy) {
      try {
        registration.listener(eventCopy);
      } catch (error) {
        console.error(`Error in wildcard event listener for ${event.type}:`, error);
      }
      
      // Remove one-time listeners
      if (registration.once) {
        this.off('*', registration.listener);
      }
    }
  }
  
  /**
   * Helper method to emit a typed event
   * @param type Event type
   * @param payload Event payload
   */
  public emitTyped<T extends EventType>(
    type: T,
    payload?: T extends keyof StandardEventPayloads ? StandardEventPayloads[T] : unknown
  ): void {
    this.emit(createEvent(type, payload));
  }
  
  /**
   * Removes all listeners for a specific event type
   * @param type Event type to clear listeners for, or undefined for all events
   */
  public removeAllListeners(type?: EventType): void {
    if (type) {
      if (type === '*') {
        this.wildcardListeners = [];
      } else {
        this.listeners.delete(type);
      }
    } else {
      this.listeners.clear();
      this.wildcardListeners = [];
    }
  }
  
  /**
   * Gets the number of listeners for a specific event type
   * @param type Event type to count listeners for, or '*' for wildcard listeners
   */
  public listenerCount(type: EventType | '*'): number {
    if (type === '*') {
      return this.wildcardListeners.length;
    }
    
    return this.listeners.has(type) ? this.listeners.get(type)!.length : 0;
  }
}

/**
 * Creates a new EventEmitter
 */
export function createEventEmitter(): EventEmitter {
  return new EventEmitter();
}