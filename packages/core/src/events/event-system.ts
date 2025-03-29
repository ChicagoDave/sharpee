// packages/core/src/events/event-system.ts

import { EntityId } from '../world-model/types';
import { SemanticEvent, EventSource, EventEmitter, EventListener } from './types';
import { StandardEventTypes } from './standard-events';

/**
 * Create a new semantic event
 */
export function createEvent(
  type: string,
  payload?: Record<string, unknown>,
  options: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
    others?: EntityId[];
    tags?: string[];
    priority?: number;
    narrate?: boolean;
  } = {}
): SemanticEvent {
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
export class EventSourceImpl implements EventSource {
  private events: SemanticEvent[] = [];
  private emitter: EventEmitterImpl;

  constructor(emitter?: EventEmitterImpl) {
    this.emitter = emitter || new EventEmitterImpl();
  }

  /**
   * Add an event to the source
   */
  public addEvent(event: SemanticEvent): void {
    this.events.push(event);
    this.emitter.emit(event);
  }

  /**
   * Get all events in the source
   */
  public getAllEvents(): SemanticEvent[] {
    return [...this.events];
  }

  /**
   * Get events of a specific type
   */
  public getEventsByType(type: string): SemanticEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events involving a specific entity
   */
  public getEventsByEntity(entityId: EntityId): SemanticEvent[] {
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

  /**
   * Get events with a specific tag
   */
  public getEventsByTag(tag: string): SemanticEvent[] {
    return this.events.filter(event => event.tags && event.tags.includes(tag));
  }

  /**
   * Clear all events
   */
  public clearEvents(): void {
    this.events = [];
  }

  /**
   * Apply a filter to the events
   */
  public filter(predicate: (event: SemanticEvent) => boolean): SemanticEvent[] {
    return this.events.filter(predicate);
  }

  /**
   * Get the event emitter
   */
  public getEmitter(): EventEmitter {
    return this.emitter;
  }
}

/**
 * Implementation of the EventEmitter interface
 */
export class EventEmitterImpl implements EventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private globalListeners: Set<EventListener> = new Set();

  /**
   * Add an event listener
   */
  public on(type: string, listener: EventListener): void {
    // For global listeners
    if (type === '*') {
      this.globalListeners.add(listener);
      return;
    }

    // For specific event types
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove an event listener
   */
  public off(type: string, listener: EventListener): void {
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
  public emit(event: SemanticEvent): void {
    // Call type-specific listeners
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

    // Call global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in global event listener for ${event.type}:`, error);
      }
    }
  }
}

/**
 * Generate a unique ID for an event
 */
function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new event source
 */
export function createEventSource(): EventSource {
  return new EventSourceImpl();
}

/**
 * Create a new event emitter
 */
export function createEventEmitter(): EventEmitter {
  return new EventEmitterImpl();
}