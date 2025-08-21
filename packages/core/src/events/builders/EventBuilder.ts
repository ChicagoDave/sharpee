/**
 * Base class for building semantic events with typed data
 */

import { ISemanticEvent } from '../types';
import { EntityId } from '../../types/entity';

/**
 * Base builder for creating semantic events with proper typing
 */
export abstract class EventBuilder<TData = unknown> {
  protected type: string;
  protected data?: TData;
  protected entities: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
    others?: EntityId[];
  } = {};
  protected tags: string[] = [];
  protected priority: number = 0;
  protected narrate: boolean = true;

  constructor(type: string) {
    this.type = type;
  }

  /**
   * Set the event data
   */
  withData(data: TData): this {
    this.data = data;
    return this;
  }

  /**
   * Set the actor entity
   */
  withActor(actor: EntityId): this {
    this.entities.actor = actor;
    return this;
  }

  /**
   * Set the target entity
   */
  withTarget(target: EntityId): this {
    this.entities.target = target;
    return this;
  }

  /**
   * Set the instrument entity
   */
  withInstrument(instrument: EntityId): this {
    this.entities.instrument = instrument;
    return this;
  }

  /**
   * Set the location entity
   */
  withLocation(location: EntityId): this {
    this.entities.location = location;
    return this;
  }

  /**
   * Add other related entities
   */
  withOthers(others: EntityId[]): this {
    this.entities.others = others;
    return this;
  }

  /**
   * Add tags to the event
   */
  withTags(...tags: string[]): this {
    this.tags.push(...tags);
    return this;
  }

  /**
   * Set the priority
   */
  withPriority(priority: number): this {
    this.priority = priority;
    return this;
  }

  /**
   * Set whether this event should be narrated
   */
  withNarrate(narrate: boolean): this {
    this.narrate = narrate;
    return this;
  }

  /**
   * Build the final event
   */
  build(): ISemanticEvent {
    return {
      id: this.generateId(),
      type: this.type,
      timestamp: Date.now(),
      entities: this.entities,
      data: this.data,
      tags: this.tags,
      priority: this.priority,
      narrate: this.narrate
    };
  }

  /**
   * Generate a unique event ID
   */
  protected generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}