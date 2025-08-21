/**
 * Builder for creating entity snapshot data for atomic events
 */

import { EventBuilder } from './EventBuilder';
import { EntityId } from '../../types/entity';

/**
 * Snapshot of an entity's state at a point in time
 */
export interface EntitySnapshot {
  id: EntityId;
  name: string;
  description?: string;
  attributes?: Record<string, unknown>;
  state?: Record<string, unknown>;
  
  /**
   * Optional provider function for dynamic descriptions
   */
  getDescription?: () => string;
}

/**
 * Builder for events that include entity snapshots
 */
export class EntitySnapshotBuilder extends EventBuilder<{
  entity?: EntitySnapshot;
  entities?: EntitySnapshot[];
  [key: string]: unknown;
}> {
  
  /**
   * Create a snapshot of a single entity
   */
  static fromEntity(entity: any): EntitySnapshot {
    return {
      id: entity.id,
      name: entity.attributes?.name || entity.name || 'unknown',
      description: entity.attributes?.description || entity.description,
      attributes: { ...entity.attributes },
      state: entity.state ? { ...entity.state } : undefined
    };
  }

  /**
   * Create snapshots of multiple entities
   */
  static fromEntities(entities: any[]): EntitySnapshot[] {
    return entities.map(entity => EntitySnapshotBuilder.fromEntity(entity));
  }

  /**
   * Add a single entity snapshot to the event
   */
  withEntitySnapshot(entity: any): this {
    const snapshot = EntitySnapshotBuilder.fromEntity(entity);
    if (!this.data) {
      this.data = {};
    }
    this.data.entity = snapshot;
    return this;
  }

  /**
   * Add multiple entity snapshots to the event
   */
  withEntitiesSnapshot(entities: any[]): this {
    const snapshots = EntitySnapshotBuilder.fromEntities(entities);
    if (!this.data) {
      this.data = {};
    }
    this.data.entities = snapshots;
    return this;
  }

  /**
   * Add a provider function for dynamic content
   */
  withProvider(key: string, provider: () => unknown): this {
    if (!this.data) {
      this.data = {};
    }
    this.data[key] = provider;
    return this;
  }
}