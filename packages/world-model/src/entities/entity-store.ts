// packages/world-model/src/entities/entity-store.ts

import { IFEntity } from './if-entity';

/**
 * Entity store that works with IFEntity instances.
 * Provides trait-aware entity management.
 */
export class EntityStore {
  private ifEntities: Map<string, IFEntity>;
  
  constructor() {
    this.ifEntities = new Map();
  }
  
  /**
   * Add an IF entity to the store
   */
  add(entity: IFEntity): void {
    this.ifEntities.set(entity.id, entity);
  }
  
  /**
   * Get an IF entity by ID
   */
  get(id: string): IFEntity | undefined {
    return this.ifEntities.get(id);
  }
  
  /**
   * Check if an entity exists
   */
  has(id: string): boolean {
    return this.ifEntities.has(id);
  }
  
  /**
   * Remove an entity from the store
   */
  remove(id: string): boolean {
    const entity = this.ifEntities.get(id);
    if (entity) {
      entity.clearTraits(); // Cleanup traits before removal
    }
    return this.ifEntities.delete(id);
  }
  
  /**
   * Get all entities
   */
  getAll(): IFEntity[] {
    return Array.from(this.ifEntities.values());
  }
  
  /**
   * Get entities by type
   */
  getByType(type: string): IFEntity[] {
    return this.getAll().filter(entity => entity.type === type);
  }
  
  /**
   * Find entities with a specific trait
   */
  findWithTrait(traitType: string): IFEntity[] {
    return this.getAll().filter(entity => entity.has(traitType));
  }
  
  /**
   * Find entities with all specified traits
   */
  findWithAllTraits(...traitTypes: string[]): IFEntity[] {
    return this.getAll().filter(entity => entity.hasAll(...traitTypes));
  }
  
  /**
   * Find entities with any of the specified traits
   */
  findWithAnyTraits(...traitTypes: string[]): IFEntity[] {
    return this.getAll().filter(entity => entity.hasAny(...traitTypes));
  }
  
  /**
   * Clear all entities from the store
   */
  clear(): void {
    // Cleanup all entities
    for (const entity of this.ifEntities.values()) {
      entity.clearTraits();
    }
    this.ifEntities.clear();
  }
  
  /**
   * Get the number of entities in the store
   */
  get size(): number {
    return this.ifEntities.size;
  }
  
  /**
   * Iterate over all entities
   */
  [Symbol.iterator](): Iterator<IFEntity> {
    return this.ifEntities.values();
  }
  
  /**
   * Serialize all entities to JSON
   */
  toJSON(): any[] {
    return this.getAll().map(entity => entity.toJSON());
  }
  
  /**
   * Load entities from JSON data
   */
  static fromJSON(json: any[]): EntityStore {
    const store = new EntityStore();
    
    if (Array.isArray(json)) {
      for (const entityData of json) {
        const entity = IFEntity.fromJSON(entityData);
        store.add(entity);
      }
    }
    
    return store;
  }
}
