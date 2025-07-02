/**
 * Semantic event source - specialized event source for story events
 * Builds on the generic event source infrastructure
 */

import { GenericEventSource, SimpleEventSource } from './event-source';
import { SemanticEvent, EventEmitter, EventListener } from './types';
import { EntityId } from '../types/entity';

/**
 * Specialized event source for semantic (story) events
 * Provides additional filtering and query capabilities
 */
export interface SemanticEventSource extends GenericEventSource<SemanticEvent> {
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
   * Get the event emitter associated with this source
   */
  getEmitter(): EventEmitter;
}

/**
 * Implementation of semantic event source
 */
export class SemanticEventSourceImpl extends SimpleEventSource<SemanticEvent> implements SemanticEventSource {
  private events: SemanticEvent[] = [];
  private eventEmitter: EventEmitterImpl;
  private lastProcessedIndex: number = 0;

  constructor() {
    super();
    this.eventEmitter = new EventEmitterImpl();
    
    // Bridge between generic event source and semantic event emitter
    this.subscribe((event) => {
      this.eventEmitter.emit(event);
    });
  }

  addEvent(event: SemanticEvent): void {
    this.events.push(event);
    this.emit(event);
  }

  getAllEvents(): SemanticEvent[] {
    return [...this.events];
  }

  getEventsByType(type: string): SemanticEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getEventsByEntity(entityId: EntityId): SemanticEvent[] {
    return this.events.filter(event => {
      const entities = event.entities;
      return (
        entities.actor === entityId ||
        entities.target === entityId ||
        entities.instrument === entityId ||
        entities.location === entityId ||
        (entities.others && entities.others.includes(entityId))
      );
    });
  }

  getEventsByTag(tag: string): SemanticEvent[] {
    return this.events.filter(event => event.tags && event.tags.includes(tag));
  }

  filter(predicate: (event: SemanticEvent) => boolean): SemanticEvent[] {
    return this.events.filter(predicate);
  }

  clearEvents(): void {
    this.events = [];
  }

  getEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * Get events since a specific event ID
   */
  getEventsSince(eventId?: string): SemanticEvent[] {
    if (!eventId) {
      return this.getAllEvents();
    }
    
    const index = this.events.findIndex(e => e.id === eventId);
    if (index === -1) {
      return this.getAllEvents();
    }
    
    return this.events.slice(index + 1);
  }

  /**
   * Get unprocessed events and mark them as processed
   */
  getUnprocessedEvents(): SemanticEvent[] {
    const unprocessed = this.events.slice(this.lastProcessedIndex);
    this.lastProcessedIndex = this.events.length;
    return unprocessed;
  }
}

/**
 * Implementation of the EventEmitter interface
 */
class EventEmitterImpl implements EventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private globalListeners: Set<EventListener> = new Set();

  on(type: string, listener: EventListener): void {
    if (type === '*') {
      this.globalListeners.add(listener);
      return;
    }

    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  off(type: string, listener: EventListener): void {
    if (type === '*') {
      this.globalListeners.delete(listener);
      return;
    }

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
      if (typeListeners.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  emit(event: SemanticEvent): void {
    // Emit to specific type listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      }
    }

    // Emit to global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in global event listener:`, error);
      }
    }
  }
}

/**
 * Create a new semantic event source
 */
export function createSemanticEventSource(): SemanticEventSource {
  return new SemanticEventSourceImpl();
}

/**
 * Type alias for backwards compatibility
 * @deprecated Use SemanticEventSource instead
 */
export type EventSource = SemanticEventSource;

/**
 * Create event source for backwards compatibility
 * @deprecated Use createSemanticEventSource instead
 */
export function createEventSource(): EventSource {
  return createSemanticEventSource();
}
