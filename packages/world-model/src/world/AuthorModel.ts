// AuthorModel.ts - Unrestricted world model access for authoring and setup

import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { SpatialIndex } from './SpatialIndex';
import { ITrait } from '../traits/trait';
import { OpenableTrait } from '../traits/openable/openableTrait';
import { LockableTrait } from '../traits/lockable/lockableTrait';
import { ICapabilityStore } from './capabilities';
import type { IWorldModel } from './WorldModel';

/**
 * Data store shared between WorldModel and AuthorModel
 */
export interface IDataStore {
  entities: Map<string, IFEntity>;
  spatialIndex: SpatialIndex;
  state: Record<string, any>;
  playerId?: string;
  relationships: Map<string, Map<string, Set<string>>>;
  idCounters: Map<string, number>;
  capabilities: ICapabilityStore;
}

/**
 * Item specification for bulk creation
 */
export interface IItemSpec {
  name: string;
  type?: string;
  attributes?: Record<string, any>;
  traits?: TraitType[];
}

/**
 * AuthorModel provides unrestricted access to the world state for authoring,
 * testing, and world setup. It bypasses all validation rules and does not
 * emit events (unless explicitly requested).
 * 
 * Use AuthorModel when:
 * - Setting up initial world state
 * - Populating containers (even closed ones)
 * - Loading saved games
 * - Writing tests
 * - Implementing special mechanics (magic, teleportation, etc.)
 * 
 * @example
 * ```typescript
 * const author = new AuthorModel(world.getDataStore());
 * const cabinet = author.createEntity('Medicine Cabinet', 'container');
 * cabinet.add(new OpenableTrait({ isOpen: false }));
 * 
 * // Can place items in closed container!
 * const medicine = author.createEntity('Aspirin', 'item');
 * author.moveEntity(medicine.id, cabinet.id); // Works even though closed
 * ```
 */
export class AuthorModel {
  private dataStore: IDataStore;
  private worldModel?: IWorldModel;
  private eventHandlers = new Map<string, (event: any) => void>();

  constructor(dataStore: IDataStore, worldModel?: IWorldModel) {
    this.dataStore = dataStore;
    this.worldModel = worldModel;
  }

  /**
   * Get the shared data store. This allows creating a WorldModel
   * that shares the same state.
   */
  getDataStore(): IDataStore {
    return this.dataStore;
  }

  // ========== Entity Management ==========

  /**
   * Create a new entity without any validation.
   * @param name Display name for the entity
   * @param type Entity type (room, item, actor, etc.)
   * @param recordEvent If true, emits an 'author:entity:created' event
   */
  createEntity(name: string, type: string = 'object', recordEvent = false): IFEntity {
    const id = this.generateId(type);
    const entity = new IFEntity(id, type, {
      attributes: {
        displayName: name,
        name: name, // For compatibility
        entityType: type
      }
    });
    
    // Add to data store
    this.dataStore.entities.set(id, entity);
    
    if (recordEvent) {
      this.emitEvent('author:entity:created', {
        entityId: id,
        name,
        entityType: type
      });
    }
    
    return entity;
  }

  /**
   * Remove an entity without validation.
   * @param entityId ID of entity to remove
   * @param recordEvent If true, emits an 'author:entity:removed' event
   */
  removeEntity(entityId: string, recordEvent = false): void {
    const entity = this.dataStore.entities.get(entityId);
    if (!entity) return;

    // Remove from spatial index
    this.dataStore.spatialIndex.remove(entityId);

    // Remove from relationships
    this.dataStore.relationships.delete(entityId);
    // Remove as target of relationships
    for (const [, rels] of this.dataStore.relationships) {
      for (const [, targets] of rels) {
        targets.delete(entityId);
      }
    }

    // Remove entity
    this.dataStore.entities.delete(entityId);
    
    if (recordEvent) {
      this.emitEvent('author:entity:removed', {
        entityId,
        name: entity.name
      });
    }
  }

  /**
   * Move an entity to a new location without any validation.
   * Can move entities into closed containers, locked containers, or any location.
   * @param entityId ID of entity to move
   * @param targetId ID of target location (null to remove from world)
   * @param recordEvent If true, emits an 'author:entity:moved' event
   */
  moveEntity(entityId: string, targetId: string | null, recordEvent = false): void {
    // Remove from current location
    const currentLocation = this.dataStore.spatialIndex.getParent(entityId);
    if (currentLocation) {
      this.dataStore.spatialIndex.removeChild(currentLocation, entityId);
    }

    // Add to new location
    if (targetId !== null) {
      this.dataStore.spatialIndex.addChild(targetId, entityId);
    }
    
    if (recordEvent) {
      this.emitEvent('author:entity:moved', {
        entityId,
        from: currentLocation,
        to: targetId
      });
    }
  }

  /**
   * Get an entity by ID
   */
  getEntity(entityId: string): IFEntity | undefined {
    return this.dataStore.entities.get(entityId);
  }

  /**
   * Set an entity property directly without validation
   */
  setEntityProperty(entityId: string, property: string, value: any, recordEvent = false): void {
    const entity = this.dataStore.entities.get(entityId);
    if (!entity) return;
    
    entity.attributes[property] = value;
    
    if (recordEvent) {
      this.emitEvent('author:entity:property:changed', {
        entityId,
        property,
        value
      });
    }
  }

  /**
   * Add a trait to an entity without validation
   */
  addTrait(entityId: string, trait: ITrait, recordEvent = false): void {
    const entity = this.dataStore.entities.get(entityId);
    if (!entity) return;
    
    entity.add(trait);
    
    if (recordEvent) {
      this.emitEvent('author:entity:trait:added', {
        entityId,
        traitType: trait.type
      });
    }
  }

  /**
   * Remove a trait from an entity without validation
   */
  removeTrait(entityId: string, traitType: TraitType, recordEvent = false): void {
    const entity = this.dataStore.entities.get(entityId);
    if (!entity) return;
    
    entity.remove(traitType);
    
    if (recordEvent) {
      this.emitEvent('author:entity:trait:removed', {
        entityId,
        traitType
      });
    }
  }

  // ========== Convenience Methods ==========

  /**
   * Move multiple entities to a container in one operation
   */
  populate(containerId: string, entityIds: string[], recordEvent = false): void {
    for (const entityId of entityIds) {
      this.moveEntity(entityId, containerId, recordEvent);
    }
  }

  /**
   * Create a bidirectional connection between two rooms
   */
  connect(room1Id: string, room2Id: string, direction: string, recordEvent = false): void {
    const room1 = this.dataStore.entities.get(room1Id);
    const room2 = this.dataStore.entities.get(room2Id);
    if (!room1 || !room2) return;

    // Get opposite direction
    const opposites: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'northeast': 'southwest',
      'northwest': 'southeast',
      'southeast': 'northwest',
      'southwest': 'northeast',
      'up': 'down',
      'down': 'up',
      'in': 'out',
      'out': 'in'
    };
    const opposite = opposites[direction] || direction;

    // Add exits to both rooms
    if (!room1.attributes.exits) {
      room1.attributes.exits = {} as Record<string, string>;
    }
    if (!room2.attributes.exits) {
      room2.attributes.exits = {} as Record<string, string>;
    }
    
    // Type assertion since we know exits is now a Record<string, string>
    (room1.attributes.exits as Record<string, string>)[direction] = room2Id;
    (room2.attributes.exits as Record<string, string>)[opposite] = room1Id;
    
    if (recordEvent) {
      this.emitEvent('author:rooms:connected', {
        room1Id,
        room2Id,
        direction,
        opposite
      });
    }
  }

  /**
   * Fill a container with items based on specifications
   */
  fillContainer(containerId: string, itemSpecs: IItemSpec[], recordEvent = false): void {
    for (const spec of itemSpecs) {
      const item = this.createEntity(spec.name, spec.type || 'item', recordEvent);
      
      // Apply attributes
      if (spec.attributes) {
        Object.assign(item.attributes, spec.attributes);
      }
      
      // Add traits
      if (spec.traits) {
        for (const traitType of spec.traits) {
          // Note: In a real implementation, you'd need trait factories
          // For now, we'll skip trait creation
        }
      }
      
      this.moveEntity(item.id, containerId, recordEvent);
    }
  }

  /**
   * Place an actor at a location (convenience method)
   */
  placeActor(actorId: string, locationId: string, recordEvent = false): void {
    this.moveEntity(actorId, locationId, recordEvent);
  }

  /**
   * Set up a container with common properties
   */
  setupContainer(containerId: string, isOpen?: boolean, isLocked?: boolean, keyId?: string, recordEvent = false): void {
    const container = this.dataStore.entities.get(containerId);
    if (!container) return;

    if (isOpen !== undefined) {
      const openable = container.getTrait(TraitType.OPENABLE) as OpenableTrait;
      if (openable) {
        (openable as any).isOpen = isOpen;
      } else {
        const newOpenable = new OpenableTrait();
        (newOpenable as any).isOpen = isOpen;
        this.addTrait(containerId, newOpenable, recordEvent);
      }
    }

    if (isLocked !== undefined) {
      const lockable = container.getTrait(TraitType.LOCKABLE) as LockableTrait;
      if (lockable) {
        (lockable as any).isLocked = isLocked;
        if (keyId) (lockable as any).requiredKey = keyId;
      } else {
        const newLockable = new LockableTrait();
        (newLockable as any).isLocked = isLocked;
        if (keyId) (newLockable as any).requiredKey = keyId;
        this.addTrait(containerId, newLockable, recordEvent);
      }
    }
  }

  // ========== State Management ==========

  /**
   * Set a world state value directly
   */
  setStateValue(key: string, value: any, recordEvent = false): void {
    this.dataStore.state[key] = value;
    
    if (recordEvent) {
      this.emitEvent('author:state:changed', {
        key,
        value
      });
    }
  }

  /**
   * Set the player entity
   */
  setPlayer(entityId: string, recordEvent = false): void {
    if (!this.dataStore.entities.has(entityId)) {
      // AuthorModel doesn't validate, but we should at least check existence
      console.warn(`Setting player to non-existent entity: ${entityId}`);
    }
    
    // If we have a reference to the WorldModel, use its setPlayer method
    if (this.worldModel) {
      (this.worldModel as any).playerId = entityId;
    } else {
      this.dataStore.playerId = entityId;
    }
    
    if (recordEvent) {
      this.emitEvent('author:player:set', {
        playerId: entityId
      });
    }
  }

  // ========== Bulk Operations ==========

  /**
   * Clear all world data
   */
  clear(recordEvent = false): void {
    this.dataStore.entities.clear();
    this.dataStore.spatialIndex.clear();
    // Clear state properties instead of replacing object
    for (const key in this.dataStore.state) {
      delete this.dataStore.state[key];
    }
    if (this.worldModel) {
      (this.worldModel as any).playerId = undefined;
    } else {
      this.dataStore.playerId = undefined;
    }
    this.dataStore.relationships.clear();
    this.dataStore.idCounters.clear();
    this.dataStore.capabilities = {};
    
    if (recordEvent) {
      this.emitEvent('author:world:cleared', {});
    }
  }

  /**
   * Import world data from a serialized format
   */
  import(data: any, recordEvent = false): void {
    // Implementation would depend on the data format
    // For now, this is a placeholder
    
    if (recordEvent) {
      this.emitEvent('author:world:imported', {
        entityCount: this.dataStore.entities.size
      });
    }
  }

  // ========== Private Helpers ==========

  /**
   * Generate an ID for a new entity
   */
  private generateId(type: string): string {
    const TYPE_PREFIXES: Record<string, string> = {
      'room': 'r',
      'door': 'd',
      'item': 'i',
      'actor': 'a',
      'container': 'c',
      'supporter': 's',
      'scenery': 'y',
      'exit': 'e',
      'object': 'o'
    };
    
    const prefix = TYPE_PREFIXES[type] || TYPE_PREFIXES['object'];
    const counter = this.dataStore.idCounters.get(prefix) || 0;
    const nextCounter = counter + 1;
    
    if (nextCounter > 1295) {
      throw new Error(`ID overflow for type '${type}' (prefix '${prefix}')`);
    }
    
    this.dataStore.idCounters.set(prefix, nextCounter);
    const base36 = nextCounter.toString(36).padStart(2, '0');
    return `${prefix}${base36}`;
  }

  /**
   * Emit an author event if event recording is enabled
   */
  private emitEvent(eventType: string, data: any): void {
    const handler = this.eventHandlers.get(eventType);
    if (handler) {
      // Ensure the event has the type field included
      const event = {
        type: eventType,
        timestamp: Date.now(),
        ...data
      };
      handler(event);
    }
  }

  /**
   * Register an event handler for author events
   */
  registerEventHandler(eventType: string, handler: (event: any) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Unregister an event handler
   */
  unregisterEventHandler(eventType: string): void {
    this.eventHandlers.delete(eventType);
  }
}
