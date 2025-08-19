// packages/world-model/src/entities/if-entity.ts

import { IEntity, EntityId, IEntityCreationParams } from '@sharpee/core';
import { ITrait, ITraitConstructor, isTrait } from '../traits/trait';
import { TraitType } from '../traits/trait-types';
import { IEventHandlers } from '../events/types';

/**
 * Interactive Fiction Entity with trait-based composition.
 * Implements the core Entity interface and adds trait management capabilities.
 */
export class IFEntity implements IEntity {
  readonly id: EntityId;
  readonly type: string;
  attributes: Record<string, unknown>;
  relationships: Record<string, EntityId[]>;
  traits: Map<TraitType, ITrait>;
  
  /**
   * Event handlers for this entity
   * Key is the event type (e.g., 'if.event.pushed')
   * Value is the handler function
   */
  on?: IEventHandlers;
  
  constructor(id: string, type: string, params?: Partial<IEntityCreationParams>) {
    this.id = id;
    this.type = type;
    this.attributes = params?.attributes ? { ...params.attributes } : {};
    this.relationships = params?.relationships || {};
    this.traits = new Map();
    
    // Store entityType in attributes when created by WorldModel
    // (params?.attributes will contain it when set by WorldModel.createEntity)
  }
  
  /**
   * Check if entity has a specific trait
   */
  has(type: TraitType | string): boolean {
    return this.traits.has(type as TraitType);
  }
  
  /**
   * Get a typed trait from the entity
   */
  get<T extends ITrait>(type: TraitType | string | ITraitConstructor<T>): T | undefined {
    const traitType = typeof type === 'string' ? type as TraitType : 
                     typeof type === 'function' ? (type as any).type : type;
    return this.traits.get(traitType) as T | undefined;
  }
  
  /**
   * Alias for get() method - for backwards compatibility
   */
  getTrait<T extends ITrait>(type: TraitType | string | ITraitConstructor<T>): T | undefined {
    return this.get<T>(type);
  }
  
  /**
   * Add a trait to the entity
   */
  add(trait: ITrait): this {
    if (!isTrait(trait)) {
      throw new Error('Invalid trait: must have a type property');
    }
    
    // Remove existing trait of same type if present
    if (this.traits.has(trait.type as TraitType)) {
      this.remove(trait.type);
    }
    
    this.traits.set(trait.type as TraitType, trait);
    return this;
  }
  
  /**
   * Remove a trait from the entity
   */
  remove(type: TraitType | string): boolean {
    return this.traits.delete(type as TraitType);
  }
  
  /**
   * Check if entity has all specified traits
   */
  hasAll(...types: (TraitType | string)[]): boolean {
    return types.every(type => this.traits.has(type as TraitType));
  }
  
  /**
   * Check if entity has any of the specified traits
   */
  hasAny(...types: (TraitType | string)[]): boolean {
    return types.some(type => this.traits.has(type as TraitType));
  }
  
  /**
   * Get all traits on this entity
   */
  getTraits(): ITrait[] {
    return Array.from(this.traits.values());
  }
  
  /**
   * Get all trait types on this entity
   */
  getTraitTypes(): (TraitType | string)[] {
    return Array.from(this.traits.keys());
  }
  
  /**
   * Clear all traits from the entity
   */
  clearTraits(): void {
    this.traits.clear();
  }
  
  /**
   * Clone this entity with all its traits
   */
  clone(newId: string): IFEntity {
    const cloned = new IFEntity(newId, this.type, {
      attributes: JSON.parse(JSON.stringify(this.attributes)),
      relationships: JSON.parse(JSON.stringify(this.relationships)) // Deep copy
    });
    
    // Clone traits (deep copy)
    for (const [type, trait] of this.traits) {
      cloned.traits.set(type, JSON.parse(JSON.stringify(trait)));
    }
    
    return cloned;
  }
  
  /**
   * Serialize entity and traits to JSON
   */
  toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      attributes: this.attributes,
      relationships: this.relationships,
      traits: Array.from(this.traits.entries()).map(([_, trait]) => ({
        ...trait
      })),
      // Include version for future compatibility
      version: 2
    };
  }
  
  /**
   * Create entity from JSON data
   */
  static fromJSON(json: any): IFEntity {
    // Determine type - use stored type or try to infer from ID
    let type = json.type || 'object';
    
    // If loading old format without explicit type, try to infer from attributes
    if (!json.version && json.attributes) {
      if (json.attributes.entityType) {
        type = json.attributes.entityType;
      } else if (json.id && json.id.match(/^[a-z][0-9a-z]{2}$/)) {
        // Try to infer type from ID prefix for new format IDs
        const prefix = json.id[0];
        const typeMap: Record<string, string> = {
          'r': 'room',
          'd': 'door',
          'i': 'item',
          'a': 'actor',
          'c': 'container',
          's': 'supporter',
          'y': 'scenery',
          'e': 'exit',
          'o': 'object'
        };
        type = typeMap[prefix] || 'object';
      }
    }
    
    const entity = new IFEntity(json.id, type, {
      attributes: json.attributes,
      relationships: json.relationships
    });
    
    if (json.traits && Array.isArray(json.traits)) {
      for (const traitData of json.traits) {
        entity.traits.set(traitData.type, traitData);
      }
    }
    
    return entity;
  }
  
  // ========== Convenience Properties ==========
  
  /**
   * Check if this is a room
   */
  get isRoom(): boolean {
    return this.has(TraitType.ROOM);
  }
  
  /**
   * Check if this can contain other entities
   */
  get canContain(): boolean {
    return this.has(TraitType.CONTAINER) || this.has(TraitType.SUPPORTER) || 
           this.has(TraitType.ROOM) || this.has(TraitType.ACTOR);
  }
  
  /**
   * Check if this is takeable (default behavior unless has scenery trait)
   */
  get isTakeable(): boolean {
    return !this.has(TraitType.SCENERY) && !this.has(TraitType.ROOM) && !this.has(TraitType.DOOR);
  }
  
  /**
   * Check if this is fixed in place (has scenery trait)
   */
  get isScenery(): boolean {
    return this.has(TraitType.SCENERY);
  }
  
  /**
   * Check if this can be opened
   */
  get isOpenable(): boolean {
    return this.has(TraitType.OPENABLE);
  }
  
  /**
   * Check if this is currently open
   */
  get isOpen(): boolean {
    const openable = this.get(TraitType.OPENABLE);
    return openable ? (openable as any).isOpen : false;
  }
  
  /**
   * Check if this can be locked
   */
  get isLockable(): boolean {
    return this.has(TraitType.LOCKABLE);
  }
  
  /**
   * Check if this is currently locked
   */
  get isLocked(): boolean {
    const lockable = this.get(TraitType.LOCKABLE);
    return lockable ? (lockable as any).isLocked : false;
  }
  
  /**
   * Check if this is a container
   */
  get isContainer(): boolean {
    return this.has(TraitType.CONTAINER);
  }
  
  /**
   * Check if this is a supporter
   */
  get isSupporter(): boolean {
    return this.has(TraitType.SUPPORTER);
  }
  
  /**
   * Check if this is a door
   */
  get isDoor(): boolean {
    return this.has(TraitType.DOOR);
  }
  
  /**
   * Check if this is an actor
   */
  get isActor(): boolean {
    return this.has(TraitType.ACTOR);
  }
  
  /**
   * Check if this is the player
   */
  get isPlayer(): boolean {
    const actor = this.get(TraitType.ACTOR);
    return actor ? (actor as any).isPlayer : false;
  }
  
  /**
   * Check if this provides light
   */
  get providesLight(): boolean {
    const lightSource = this.get(TraitType.LIGHT_SOURCE);
    return lightSource ? (lightSource as any).isLit : false;
  }
  
  /**
   * Check if this is switchable
   */
  get isSwitchable(): boolean {
    return this.has(TraitType.SWITCHABLE);
  }
  
  /**
   * Check if this is switched on
   */
  get isOn(): boolean {
    const switchable = this.get(TraitType.SWITCHABLE);
    return switchable ? (switchable as any).isOn : false;
  }
  
  /**
   * Get the name of this entity
   */
  get name(): string {
    // First check for displayName (new system)
    if (this.attributes.displayName) {
      return this.attributes.displayName as string;
    }
    
    // Then check identity trait
    const identity = this.get(TraitType.IDENTITY);
    if (identity && (identity as any).name) {
      return (identity as any).name;
    }
    
    // Fall back to name attribute
    if (this.attributes.name) {
      return this.attributes.name as string;
    }
    
    // Last resort: use ID
    return this.id;
  }
  
  /**
   * Get the description of this entity
   */
  get description(): string | undefined {
    const identity = this.get(TraitType.IDENTITY);
    return identity ? (identity as any).description : undefined;
  }
  
  /**
   * Get the weight of this entity
   */
  get weight(): number {
    return (this.attributes.weight as number) || 0;
  }
  
  /**
   * Alias for has() method - for backwards compatibility
   */
  hasTrait(type: TraitType | string): boolean {
    return this.has(type);
  }
}
