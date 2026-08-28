// packages/core/src/events/types.ts

import { EntityId } from '../types/entity.js';

/**
 * The player's presence relative to where an event happened (ADR-328 D3,
 * ADR-144's vocabulary): `present` — co-located and visible; `absent` —
 * elsewhere; `concealed` — co-located but hidden. Stamped by the engine's
 * enrichment funnel on actor-sourced events that carry a producer-set
 * `entities.location`; the client decides what to show.
 */
export type Presence = 'present' | 'absent' | 'concealed';

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

  /**
   * Whether the player witnessed this event (ADR-328 D3). Present only on
   * actor-sourced events whose producer stamped `entities.location`; the
   * enrichment funnel computes it against the player at emit time. Absent
   * means "not tagged" — shown by default — not "absent from the room".
   */
  presence?: Presence;

  /**
   * Additional metadata for event processing
   */
  metadata?: Record<string, unknown>;
}

// EventSource interface moved to semantic-event-source.ts
// Re-export for backwards compatibility
export { ISemanticEventSource as EventSource } from './semantic-event-source.js';

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
