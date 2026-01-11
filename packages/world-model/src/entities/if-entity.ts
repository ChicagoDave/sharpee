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
   * Author-controlled disambiguation priorities per action
   * Higher priority = more likely to be selected when ambiguous
   * Key is action ID (e.g., 'if.action.eating')
   * Value is priority (default 100, higher = preferred)
   */
  private scopePriorities: Map<string, number> = new Map();

  /**
   * Author-controlled minimum scope levels
   * Allows entities to be "in scope" regardless of spatial location.
   * Key is room ID (or '*' for all rooms)
   * Value is minimum scope level (0=UNAWARE, 1=AWARE, 2=VISIBLE, 3=REACHABLE, 4=CARRIED)
   *
   * Example uses:
   * - sky.setMinimumScope(2) - always visible everywhere
   * - mountain.setMinimumScope(2, ['overlook']) - visible from specific room
   * - butterfly.setMinimumScope(3, ['garden']) - reachable in garden
   */
  private minimumScopes: Map<string, number> = new Map();

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
    
    // Warn and ignore if trait already exists
    if (this.traits.has(trait.type as TraitType)) {
      console.warn(`Entity "${this.id}" already has trait: ${trait.type} - ignoring duplicate add`);
      return this;
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

  // ========== Disambiguation Scoring ==========

  /**
   * Get or set author-controlled disambiguation priority for an action.
   *
   * When multiple entities match a command, higher priority entities are
   * preferred for automatic disambiguation.
   *
   * @param actionId - The action ID (e.g., 'if.action.eating')
   * @param priority - Optional priority to set (100 = default, higher = preferred)
   * @returns The current priority for this action (default 100)
   *
   * @example
   * // Make real apple preferred for eating over wax apple
   * realApple.scope('if.action.eating', 150);
   * waxApple.scope('if.action.eating', 50);
   *
   * @example
   * // Get current priority
   * const priority = apple.scope('if.action.eating');  // Returns 150
   */
  scope(actionId: string, priority?: number): number {
    if (priority !== undefined) {
      this.scopePriorities.set(actionId, priority);
    }
    return this.scopePriorities.get(actionId) ?? 100;  // Default priority is 100
  }

  /**
   * Clear disambiguation priority for an action (resets to default)
   */
  clearScope(actionId: string): void {
    this.scopePriorities.delete(actionId);
  }

  /**
   * Clear all disambiguation priorities
   */
  clearAllScopes(): void {
    this.scopePriorities.clear();
  }

  /**
   * Get all scope priorities for serialization
   */
  getScopePriorities(): Record<string, number> {
    return Object.fromEntries(this.scopePriorities);
  }

  // ========== Minimum Scope (Author-Controlled Scope Additions) ==========

  /**
   * Set minimum scope level for this entity.
   *
   * Makes an entity "in scope" regardless of its spatial location.
   * The scope resolver will return the maximum of the physical scope
   * and the minimum scope (additive only - can raise scope, not lower it).
   *
   * Scope levels (numeric values match ScopeLevel enum in stdlib):
   * - 0: UNAWARE - not in scope
   * - 1: AWARE - can hear/smell but not see
   * - 2: VISIBLE - can see but not reach
   * - 3: REACHABLE - can physically interact
   * - 4: CARRIED - in inventory (rarely used for minimum)
   *
   * @param level The minimum scope level (0-4)
   * @param rooms Optional array of room IDs where this applies. If omitted, applies everywhere.
   *
   * @example
   * // Sky is always visible everywhere
   * sky.setMinimumScope(2);
   *
   * // Mountain visible only from overlook and trail
   * mountain.setMinimumScope(2, ['overlook', 'mountain_trail']);
   *
   * // Butterfly reachable (but may escape) in garden areas
   * butterfly.setMinimumScope(3, ['garden', 'meadow', 'pond']);
   *
   * // Ticking clock audible from adjacent rooms
   * clock.setMinimumScope(1, ['hallway', 'study']);
   */
  setMinimumScope(level: number, rooms?: string[]): this {
    if (rooms && rooms.length > 0) {
      // Set for specific rooms
      for (const roomId of rooms) {
        this.minimumScopes.set(roomId, level);
      }
    } else {
      // Set for all rooms (use '*' as wildcard)
      this.minimumScopes.set('*', level);
    }
    return this;
  }

  /**
   * Get the minimum scope level for this entity in a specific room.
   *
   * @param roomId The room to check (or null to get global minimum)
   * @returns The minimum scope level, or 0 (UNAWARE) if not set
   */
  getMinimumScope(roomId: string | null): number {
    // Check specific room first
    if (roomId && this.minimumScopes.has(roomId)) {
      return this.minimumScopes.get(roomId)!;
    }
    // Fall back to global wildcard
    if (this.minimumScopes.has('*')) {
      return this.minimumScopes.get('*')!;
    }
    // No minimum set
    return 0;
  }

  /**
   * Clear minimum scope for specific rooms or all rooms.
   *
   * @param rooms Optional array of room IDs to clear. If omitted, clears all.
   */
  clearMinimumScope(rooms?: string[]): void {
    if (rooms && rooms.length > 0) {
      for (const roomId of rooms) {
        this.minimumScopes.delete(roomId);
      }
    } else {
      this.minimumScopes.clear();
    }
  }

  /**
   * Get all minimum scopes for serialization
   */
  getMinimumScopes(): Record<string, number> {
    return Object.fromEntries(this.minimumScopes);
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

    // Clone scope priorities
    for (const [actionId, priority] of this.scopePriorities) {
      cloned.scopePriorities.set(actionId, priority);
    }

    // Clone minimum scopes
    for (const [roomId, level] of this.minimumScopes) {
      cloned.minimumScopes.set(roomId, level);
    }

    return cloned;
  }
  
  /**
   * Serialize entity and traits to JSON
   */
  toJSON(): any {
    const json: any = {
      id: this.id,
      type: this.type,
      attributes: this.attributes,
      relationships: this.relationships,
      traits: Array.from(this.traits.entries()).map(([_, trait]) => ({
        ...trait
      })),
      // Include version for future compatibility
      version: 3
    };

    // Include scope priorities if any
    if (this.scopePriorities.size > 0) {
      json.scopePriorities = Object.fromEntries(this.scopePriorities);
    }

    // Include minimum scopes if any
    if (this.minimumScopes.size > 0) {
      json.minimumScopes = Object.fromEntries(this.minimumScopes);
    }

    return json;
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

    // Restore scope priorities (version 3+)
    if (json.scopePriorities && typeof json.scopePriorities === 'object') {
      for (const [actionId, priority] of Object.entries(json.scopePriorities)) {
        entity.scopePriorities.set(actionId, priority as number);
      }
    }

    // Restore minimum scopes (version 3+)
    if (json.minimumScopes && typeof json.minimumScopes === 'object') {
      for (const [roomId, level] of Object.entries(json.minimumScopes)) {
        entity.minimumScopes.set(roomId, level as number);
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
   * Check if this can be entered by actors
   * Vehicles are inherently enterable (boats, baskets, etc.)
   */
  get enterable(): boolean {
    return this.has(TraitType.ENTERABLE) || this.has(TraitType.VEHICLE);
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
