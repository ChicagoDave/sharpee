/**
 * Semantic event source - specialized event source for story events
 * Builds on the generic event source infrastructure
 */

import { IGenericEventSource, SimpleEventSource } from './event-source';
import { ISemanticEvent, IEventEmitter, EventListener } from './types';
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
export class SemanticEventSourceImpl extends SimpleEventSource<ISemanticEvent> implements ISemanticEventSource {
  private events: ISemanticEvent[] = [];
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

  addEvent(event: ISemanticEvent): void {
    this.events.push(event);
    this.emit(event);
  }

  getAllEvents(): ISemanticEvent[] {
    return [...this.events];
  }

  getEventsByType(type: string): ISemanticEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getEventsByEntity(entityId: EntityId): ISemanticEvent[] {
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

  getEventsByTag(tag: string): ISemanticEvent[] {
    return this.events.filter(event => event.tags && event.tags.includes(tag));
  }

  filter(predicate: (event: ISemanticEvent) => boolean): ISemanticEvent[] {
    return this.events.filter(predicate);
  }

  clearEvents(): void {
    this.events = [];
  }

  getEmitter(): IEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Get events since a specific event ID
   */
  getEventsSince(eventId?: string): ISemanticEvent[] {
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
  getUnprocessedEvents(): ISemanticEvent[] {
    const unprocessed = this.events.slice(this.lastProcessedIndex);
    this.lastProcessedIndex = this.events.length;
    return unprocessed;
  }
}

/**
 * Implementation of the EventEmitter interface
 */
class EventEmitterImpl implements IEventEmitter {
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

  emit(event: ISemanticEvent): void {
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
export function createSemanticEventSource(): ISemanticEventSource {
  return new SemanticEventSourceImpl();
}

/**
 * Type alias for backwards compatibility
 * @deprecated Use SemanticEventSource instead
 */
export type EventSource = ISemanticEventSource;

/**
 * Create event source for backwards compatibility
 * @deprecated Use createSemanticEventSource instead
 */
export function createEventSource(): EventSource {
  return createSemanticEventSource();
}
