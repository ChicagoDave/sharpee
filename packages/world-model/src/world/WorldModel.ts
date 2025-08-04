// WorldModel.ts - Core world model interface and implementation for Sharpee IF Platform

import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { SemanticEvent, SemanticEventSource } from '@sharpee/core';
import { SpatialIndex } from './SpatialIndex';
import { VisibilityBehavior } from './VisibilityBehavior';
import { DataStore } from './AuthorModel';
import { canContain } from '../traits/container/container-utils';
import {
  CapabilityStore,
  CapabilityData,
  CapabilitySchema,
  CapabilityRegistration
} from './capabilities';
import {
  WorldState,
  WorldConfig,
  FindOptions,
  ContentsOptions,
  WorldChange
} from '@sharpee/if-domain';
import { ScopeRegistry } from '../scope/scope-registry';
import { ScopeEvaluator } from '../scope/scope-evaluator';
import { ScopeRule, ScopeContext } from '../scope/scope-rule';

// Event handler types - these are tightly coupled to WorldModel
export type EventHandler = (event: SemanticEvent, world: WorldModel) => void;
export type EventValidator = (event: SemanticEvent, world: WorldModel) => boolean;
export type EventPreviewer = (event: SemanticEvent, world: WorldModel) => WorldChange[];

// Re-export domain types for backward compatibility
export {
  WorldState,
  WorldConfig,
  FindOptions,
  ContentsOptions,
  WorldChange
} from '@sharpee/if-domain';

// Interface and class with same name in same file - TypeScript standard pattern
export interface WorldModel {
  // Get the data store for sharing with AuthorModel
  getDataStore(): DataStore;
  
  // Capability Management
  registerCapability(name: string, registration: Partial<CapabilityRegistration>): void;
  updateCapability(name: string, data: Partial<CapabilityData>): void;
  getCapability(name: string): CapabilityData | undefined;
  hasCapability(name: string): boolean;
  
  // Entity Management
  createEntity(displayName: string, type?: string): IFEntity;
  getEntity(id: string): IFEntity | undefined;
  hasEntity(id: string): boolean;
  removeEntity(id: string): boolean;
  getAllEntities(): IFEntity[];
  updateEntity(entityId: string, updater: (entity: IFEntity) => void): void;

  // Spatial Management
  getLocation(entityId: string): string | undefined;
  getContents(containerId: string, options?: ContentsOptions): IFEntity[];
  moveEntity(entityId: string, targetId: string | null): boolean;
  canMoveEntity(entityId: string, targetId: string | null): boolean;
  getContainingRoom(entityId: string): IFEntity | undefined;
  getAllContents(entityId: string, options?: ContentsOptions): IFEntity[];

  // World State Management
  getState(): WorldState;
  setState(state: WorldState): void;
  getStateValue(key: string): any;
  setStateValue(key: string, value: any): void;

  // Query Operations
  findByTrait(traitType: TraitType, options?: FindOptions): IFEntity[];
  findByType(entityType: string, options?: FindOptions): IFEntity[];
  findWhere(predicate: (entity: IFEntity) => boolean, options?: FindOptions): IFEntity[];
  getVisible(observerId: string): IFEntity[];
  getInScope(observerId: string): IFEntity[];
  canSee(observerId: string, targetId: string): boolean;

  // Relationship Queries
  getRelated(entityId: string, relationshipType: string): string[];
  areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean;
  addRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;
  removeRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void;

  // Utility Methods
  getTotalWeight(entityId: string): number;
  wouldCreateLoop(entityId: string, targetId: string): boolean;
  findPath(fromRoomId: string, toRoomId: string): string[] | null;
  getPlayer(): IFEntity | undefined;
  setPlayer(entityId: string): void;

  // Persistence
  toJSON(): string;
  loadJSON(json: string): void;
  clear(): void;

  // Event Sourcing Support
  registerEventHandler(eventType: string, handler: EventHandler): void;
  unregisterEventHandler(eventType: string): void;
  registerEventValidator(eventType: string, validator: EventValidator): void;
  registerEventPreviewer(eventType: string, previewer: EventPreviewer): void;
  
  applyEvent(event: SemanticEvent): void;
  canApplyEvent(event: SemanticEvent): boolean;
  previewEvent(event: SemanticEvent): WorldChange[];
  
  // Event History (optional)
  getAppliedEvents(): SemanticEvent[];
  getEventsSince(timestamp: number): SemanticEvent[];
  clearEventHistory(): void;
  
  // Scope Management
  getScopeRegistry(): ScopeRegistry;
  addScopeRule(rule: ScopeRule): void;
  removeScopeRule(ruleId: string): boolean;
  evaluateScope(actorId: string, actionId?: string): string[];
}

// Type prefixes for entity ID generation
const TYPE_PREFIXES: Record<string, string> = {
  'room': 'r',
  'door': 'd',
  'item': 'i',
  'actor': 'a',
  'container': 'c',
  'supporter': 's',
  'scenery': 'y',
  'exit': 'e',
  'object': 'o'  // default
};

export class WorldModel implements WorldModel {
  private entities: Map<string, IFEntity> = new Map();
  private state: WorldState = {};
  private playerId: string | undefined;
  private spatialIndex: SpatialIndex;
  private config: WorldConfig;
  private capabilities: CapabilityStore = {};
  
  // ID generation
  private idCounters: Map<string, number> = new Map();
  
  // Event sourcing support
  private eventHandlers = new Map<string, EventHandler>();
  private eventValidators = new Map<string, EventValidator>();
  private eventPreviewers = new Map<string, EventPreviewer>();
  private appliedEvents: SemanticEvent[] = [];
  private maxEventHistory = 1000; // Configurable limit

  private platformEvents?: SemanticEventSource;
  
  // Scope system
  private scopeRegistry: ScopeRegistry;
  private scopeEvaluator: ScopeEvaluator;

  constructor(config: WorldConfig = {}, platformEvents?: SemanticEventSource) {
    this.config = {
      enableSpatialIndex: true,
      maxDepth: 10,
      strictMode: false,
      ...config
    };
    this.spatialIndex = new SpatialIndex();
    this.platformEvents = platformEvents;
    
    // Initialize scope system
    this.scopeRegistry = new ScopeRegistry();
    this.scopeEvaluator = new ScopeEvaluator(this.scopeRegistry);
    
    // Register default scope rules
    this.registerDefaultScopeRules();
  }

  // Platform event emission helper
  private emitPlatformEvent(type: string, data: any): void {
    if (this.platformEvents) {
      this.platformEvents.addEvent({
        id: `world_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: `platform.world.${type}`,
        entities: {},
        payload: { 
          subsystem: 'world',
          ...data 
        },
        tags: ['platform', 'world', 'debug'],
        priority: 0,
        narrate: false
      });
    }
  }

  // Capability Management
  registerCapability(name: string, registration: Partial<CapabilityRegistration> = {}): void {
    if (this.capabilities[name]) {
      if (this.config.strictMode) {
        throw new Error(`Capability '${name}' is already registered`);
      }
      return;
    }

    // Initialize capability with schema and initial data
    const initialData: CapabilityData = {};
    
    // Apply schema defaults
    if (registration.schema) {
      for (const [field, fieldDef] of Object.entries(registration.schema)) {
        if (fieldDef.default !== undefined) {
          initialData[field] = fieldDef.default;
        }
      }
    }
    
    // Override with provided initial data
    if (registration.initialData) {
      Object.assign(initialData, registration.initialData);
    }
    
    this.capabilities[name] = {
      data: initialData,
      schema: registration.schema
    };
  }

  updateCapability(name: string, updates: Partial<CapabilityData>): void {
    const capability = this.capabilities[name];
    if (!capability) {
      if (this.config.strictMode) {
        throw new Error(`Capability '${name}' is not registered`);
      }
      return;
    }

    // Validate updates against schema if present
    if (capability.schema) {
      for (const [field, value] of Object.entries(updates)) {
        const fieldDef = capability.schema[field];
        if (fieldDef) {
          // Basic type validation
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== fieldDef.type && value !== null && value !== undefined) {
            if (this.config.strictMode) {
              throw new Error(`Invalid type for capability '${name}' field '${field}': expected ${fieldDef.type}, got ${actualType}`);
            }
          }
        }
      }
    }

    // Apply updates
    Object.assign(capability.data, updates);
  }

  getCapability(name: string): CapabilityData | undefined {
    return this.capabilities[name]?.data;
  }

  hasCapability(name: string): boolean {
    return name in this.capabilities;
  }

  // ID Generation
  private generateId(type: string): string {
    const prefix = TYPE_PREFIXES[type] || TYPE_PREFIXES['object'];
    const counter = this.idCounters.get(prefix) || 0;
    
    // Increment counter
    const nextCounter = counter + 1;
    
    // Check for overflow (base36 with 2 chars = 1296 max)
    if (nextCounter > 1295) {
      throw new Error(`ID overflow for type '${type}' (prefix '${prefix}'). Maximum 1296 entities per type.`);
    }
    
    this.idCounters.set(prefix, nextCounter);
    
    // Convert to base36 and pad to 2 characters
    const base36 = nextCounter.toString(36).padStart(2, '0');
    return `${prefix}${base36}`;
  }

  // Entity Management
  createEntity(displayName: string, type: string = 'object'): IFEntity {
    // Generate ID based on type
    const id = this.generateId(type);

    const entity = new IFEntity(id, type, {
      attributes: {
        displayName: displayName,
        name: displayName, // For compatibility
        entityType: type
      }
    });
    
    // Add to entity map
    this.entities.set(id, entity);
    
    return entity;
  }

  getEntity(id: string): IFEntity | undefined {
    return this.entities.get(id);
  }

  hasEntity(id: string): boolean {
    return this.entities.has(id);
  }

  removeEntity(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    // Remove from spatial index
    this.spatialIndex.remove(id);

    // Remove from any containers
    const location = this.getLocation(id);
    if (location) {
      this.moveEntity(id, null);
    }

    // Remove entity
    return this.entities.delete(id);
  }

  getAllEntities(): IFEntity[] {
    return Array.from(this.entities.values());
  }

  updateEntity(entityId: string, updater: (entity: IFEntity) => void): void {
    const entity = this.getEntity(entityId);
    if (!entity) {
      if (this.config.strictMode) {
        throw new Error(`Cannot update non-existent entity: ${entityId}`);
      }
      return;
    }
    
    // Call the updater - entity is mutable so changes happen in place
    updater(entity);
    
    // Future: Could emit change events here for reactive systems
    // this.emitChange({ type: 'entity-updated', entityId });
  }

  // Spatial Management
  getLocation(entityId: string): string | undefined {
    return this.spatialIndex.getParent(entityId);
  }

  getContents(containerId: string, options: ContentsOptions = {}): IFEntity[] {
    const contents = this.spatialIndex.getChildren(containerId);
    let entities = contents
      .map(id => this.getEntity(id))
      .filter((e): e is IFEntity => e !== undefined);

    if (options.visibleOnly) {
      // Filter to only visible entities
      entities = entities.filter(e => {
        const scenery = e.getTrait(TraitType.SCENERY);
        return !scenery || (scenery as any).visible !== false;
      });
    }

    if (!options.includeWorn) {
      // Filter out worn items (check both WEARABLE and CLOTHING traits)
      entities = entities.filter(e => {
        const wearable = e.getTrait(TraitType.WEARABLE);
        const clothing = e.getTrait(TraitType.CLOTHING);
        const wornFromWearable = wearable && (wearable as any).isWorn;
        const wornFromClothing = clothing && (clothing as any).isWorn;
        return !(wornFromWearable || wornFromClothing);
      });
    }

    return entities;
  }

  moveEntity(entityId: string, targetId: string | null): boolean {
    if (!this.canMoveEntity(entityId, targetId)) {
      this.emitPlatformEvent('move_entity_failed', {
        entityId,
        targetId,
        reason: 'cannot_move'
      });
      return false;
    }

    // Remove from current location
    const currentLocation = this.getLocation(entityId);
    if (currentLocation) {
      this.spatialIndex.removeChild(currentLocation, entityId);
    }

    // Add to new location
    if (targetId) {
      this.spatialIndex.addChild(targetId, entityId);
    }
    
    // Emit platform event
    this.emitPlatformEvent('entity_moved', {
      entityId,
      fromLocation: currentLocation,
      toLocation: targetId
    });

    return true;
  }

  canMoveEntity(entityId: string, targetId: string | null): boolean {
    const entity = this.getEntity(entityId);
    if (!entity) return false;

    // Can always remove from world
    if (targetId === null) return true;

    const target = this.getEntity(targetId);
    if (!target) return false;

    // Check for containment loops
    if (this.wouldCreateLoop(entityId, targetId)) {
      return false;
    }

    // Check if target can contain - using our new utility
    if (!canContain(target)) {
      return false;
    }

    // Check container constraints
    if (target.hasTrait(TraitType.CONTAINER) && target.hasTrait(TraitType.OPENABLE)) {
      const openable = target.getTrait(TraitType.OPENABLE);
      if (openable && !(openable as any).isOpen) {
        return false;
      }
    }

    return true;
  }

  getContainingRoom(entityId: string): IFEntity | undefined {
    let current = entityId;
    let depth = 0;

    while (current && depth < this.config.maxDepth!) {
      const parent = this.getLocation(current);
      if (!parent) return undefined;

      const parentEntity = this.getEntity(parent);
      if (parentEntity?.hasTrait(TraitType.ROOM)) {
        return parentEntity;
      }

      current = parent;
      depth++;
    }

    return undefined;
  }

  getAllContents(entityId: string, options: ContentsOptions = {}): IFEntity[] {
    const result: IFEntity[] = [];
    const visited = new Set<string>();

    const traverse = (id: string, depth: number = 0, isRoot: boolean = false) => {
      if (visited.has(id) || depth > this.config.maxDepth!) return;
      visited.add(id);

      // For the root entity, use the provided options
      // For recursive calls, always include worn items to get complete contents
      const contentsOptions = isRoot ? {
        visibleOnly: options.visibleOnly,
        includeWorn: options.includeWorn
      } : {
        visibleOnly: options.visibleOnly,
        includeWorn: true  // Always include worn items when recursing
      };
      
      const contents = this.getContents(id, contentsOptions);
      result.push(...contents);

      if (options.recursive) {
        contents.forEach(item => traverse(item.id, depth + 1, false));
      }
    };

    traverse(entityId, 0, true);
    return result;
  }

  // World State Management
  getState(): WorldState {
    return { ...this.state };
  }

  setState(state: WorldState): void {
    this.state = { ...state };
  }

  getStateValue(key: string): any {
    return this.state[key];
  }

  setStateValue(key: string, value: any): void {
    this.state[key] = value;
  }

  // Query Operations
  findByTrait(traitType: TraitType, options: FindOptions = {}): IFEntity[] {
    return this.findWhere(e => e.hasTrait(traitType), options);
  }

  findByType(entityType: string, options: FindOptions = {}): IFEntity[] {
    return this.findWhere(e => e.type === entityType, options);
  }

  findWhere(predicate: (entity: IFEntity) => boolean, options: FindOptions = {}): IFEntity[] {
    let entities = Array.from(this.entities.values()).filter(predicate);

    if (!options.includeScenery) {
      entities = entities.filter(e => !e.hasTrait(TraitType.SCENERY));
    }

    // Only filter out invisible items if includeInvisible is explicitly false
    // When includeInvisible is undefined or true, include all items
    if (options.includeInvisible === false) {
      entities = entities.filter(e => {
        const scenery = e.getTrait(TraitType.SCENERY);
        // If entity has scenery trait and visible is false, filter it out
        if (scenery && (scenery as any).visible === false) {
          return false;
        }
        return true;
      });
    }

    return entities;
  }

  // Scope methods moved to end of class to use new scope system

  // Relationship Queries
  private relationships = new Map<string, Map<string, Set<string>>>();

  getRelated(entityId: string, relationshipType: string): string[] {
    const entityRels = this.relationships.get(entityId);
    if (!entityRels) return [];

    const related = entityRels.get(relationshipType);
    return related ? Array.from(related) : [];
  }

  areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean {
    const related = this.getRelated(entity1Id, relationshipType);
    return related.includes(entity2Id);
  }

  addRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void {
    // Ensure entities exist
    if (!this.hasEntity(entity1Id) || !this.hasEntity(entity2Id)) {
      if (this.config.strictMode) {
        throw new Error('Cannot add relationship between non-existent entities');
      }
      return;
    }

    // Add forward relationship
    if (!this.relationships.has(entity1Id)) {
      this.relationships.set(entity1Id, new Map());
    }
    const entityRels = this.relationships.get(entity1Id)!;
    
    if (!entityRels.has(relationshipType)) {
      entityRels.set(relationshipType, new Set());
    }
    entityRels.get(relationshipType)!.add(entity2Id);
  }

  removeRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void {
    const entityRels = this.relationships.get(entity1Id);
    if (!entityRels) return;

    const related = entityRels.get(relationshipType);
    if (related) {
      related.delete(entity2Id);
      if (related.size === 0) {
        entityRels.delete(relationshipType);
      }
    }

    if (entityRels.size === 0) {
      this.relationships.delete(entity1Id);
    }
  }

  // Utility Methods
  getTotalWeight(entityId: string): number {
    const entity = this.getEntity(entityId);
    if (!entity) return 0;

    let weight = entity.weight || 0;

    // Add weight of all contents
    const contents = this.getAllContents(entityId, { recursive: true });
    for (const item of contents) {
      weight += item.weight || 0;
    }

    return weight;
  }

  wouldCreateLoop(entityId: string, targetId: string): boolean {
    if (entityId === targetId) return true;

    let current = targetId;
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current)) return false; // Already checked this path
      if (current === entityId) return true; // Found a loop
      
      visited.add(current);
      current = this.getLocation(current) || '';
    }

    return false;
  }

  findPath(fromRoomId: string, toRoomId: string): string[] | null {
    if (fromRoomId === toRoomId) return [];

    const fromRoom = this.getEntity(fromRoomId);
    const toRoom = this.getEntity(toRoomId);

    if (!fromRoom?.hasTrait(TraitType.ROOM) || !toRoom?.hasTrait(TraitType.ROOM)) {
      return null;
    }

    // Simple BFS pathfinding
    const queue: { roomId: string; path: string[] }[] = [{ roomId: fromRoomId, path: [] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { roomId, path } = queue.shift()!;
      
      if (visited.has(roomId)) continue;
      visited.add(roomId);

      // Get exits from this room
      const room = this.getEntity(roomId);
      if (!room) continue;

      const exits = (room.getTrait(TraitType.ROOM) as any)?.exits || {};
      
      for (const [direction, exitInfo] of Object.entries(exits)) {
        let targetRoom: string | undefined;
        let pathElement: string | undefined;
        
        if (typeof exitInfo === 'string') {
          // Simple string - treat as direct room connection
          targetRoom = exitInfo;
          pathElement = exitInfo; // For now, use room ID as path element
        } else if (typeof exitInfo === 'object') {
          // ExitInfo object
          if ((exitInfo as any).via) {
            // Has a door/exit entity
            const exitEntity = this.getEntity((exitInfo as any).via);
            if (!exitEntity) continue;
            
            pathElement = (exitInfo as any).via;
            
            // Get destination based on entity type
            if (exitEntity.hasTrait(TraitType.DOOR)) {
              const door = exitEntity.getTrait(TraitType.DOOR) as any;
              targetRoom = door?.room1 === roomId ? door?.room2 : door?.room1;
            } else if (exitEntity.hasTrait(TraitType.EXIT)) {
              targetRoom = (exitEntity.getTrait(TraitType.EXIT) as any)?.to;
            } else {
              // Not a valid door/exit entity
              continue;
            }
          } else if ((exitInfo as any).destination) {
            // Direct room connection
            targetRoom = (exitInfo as any).destination;
            pathElement = targetRoom; // Use room ID as path element
          }
        }
        
        if (!targetRoom || !pathElement) continue;

        if (targetRoom === toRoomId) {
          // Found the destination - return path
          // For direct connections, return empty array (no doors to pass through)
          if (pathElement === targetRoom && path.length === 0) {
            return [];
          }
          return [...path, pathElement];
        }

        if (!visited.has(targetRoom)) {
          // For direct connections, don't add room ID to path
          const newPath = pathElement === targetRoom ? path : [...path, pathElement];
          queue.push({ roomId: targetRoom, path: newPath });
        }
      }
    }

    return null;
  }

  getPlayer(): IFEntity | undefined {
    return this.playerId ? this.getEntity(this.playerId) : undefined;
  }

  setPlayer(entityId: string): void {
    if (!this.hasEntity(entityId)) {
      throw new Error(`Cannot set player to non-existent entity: ${entityId}`);
    }
    this.playerId = entityId;
  }

  // Persistence
  toJSON(): string {
    const data = {
      entities: Array.from(this.entities.entries()).map(([id, entity]) => ({
        id,
        entity: entity.toJSON()
      })),
      state: this.state,
      playerId: this.playerId,
      spatialIndex: this.spatialIndex.toJSON(),
      relationships: Array.from(this.relationships.entries()).map(([entityId, rels]) => ({
        entityId,
        relationships: Array.from(rels.entries()).map(([type, related]) => ({
          type,
          related: Array.from(related)
        }))
      })),
      // Add ID system data
      idCounters: Array.from(this.idCounters.entries()),
      // Add capabilities
      capabilities: Object.entries(this.capabilities).map(([name, cap]) => ({
        name,
        data: cap.data,
        schema: cap.schema
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  loadJSON(json: string): void {
    const data = JSON.parse(json);
    
    // Clear current state
    this.clear();

    // Restore entities
    for (const { id, entity } of data.entities) {
      const newEntity = IFEntity.fromJSON(entity);
      this.entities.set(id, newEntity);
    }

    // Restore state
    this.state = data.state || {};
    this.playerId = data.playerId;

    // Restore spatial index
    if (data.spatialIndex) {
      this.spatialIndex.loadJSON(data.spatialIndex);
    }

    // Restore relationships
    if (data.relationships) {
      for (const { entityId, relationships } of data.relationships) {
        const entityRels = new Map<string, Set<string>>();
        for (const { type, related } of relationships) {
          entityRels.set(type, new Set(related));
        }
        this.relationships.set(entityId, entityRels);
      }
    }

    // Restore ID system data
    if (data.idCounters) {
      this.idCounters = new Map(data.idCounters);
    } else {
      // Rebuild ID counters from existing entities for backward compatibility
      this.rebuildIdCounters();
    }

    // Restore capabilities
    if (data.capabilities) {
      for (const { name, data: capData, schema } of data.capabilities) {
        this.capabilities[name] = {
          data: capData,
          schema
        };
      }
    }
  }

  clear(): void {
    this.entities.clear();
    this.state = {};
    this.playerId = undefined;
    this.spatialIndex.clear();
    this.relationships.clear();
    this.appliedEvents = [];
    this.idCounters.clear();
    this.capabilities = {};
  }

  // Event Sourcing Implementation
  registerEventHandler(eventType: string, handler: EventHandler): void {
    this.eventHandlers.set(eventType, handler);
  }

  unregisterEventHandler(eventType: string): void {
    this.eventHandlers.delete(eventType);
  }

  registerEventValidator(eventType: string, validator: EventValidator): void {
    this.eventValidators.set(eventType, validator);
  }

  registerEventPreviewer(eventType: string, previewer: EventPreviewer): void {
    this.eventPreviewers.set(eventType, previewer);
  }

  applyEvent(event: SemanticEvent): void {
    // First validate if we can apply this event
    if (!this.canApplyEvent(event)) {
      throw new Error(`Cannot apply event of type '${event.type}': validation failed`);
    }

    // Look up handler for this event type
    const handler = this.eventHandlers.get(event.type);
    if (!handler) {
      // No handler registered - event is recorded but has no effect
      // Silent when no handler - this is a valid use case
    } else {
      // Apply the event through the handler
      handler(event, this);
    }

    // Record the event in history
    this.appliedEvents.push(event);
    
    // Trim history if it exceeds the limit
    if (this.appliedEvents.length > this.maxEventHistory) {
      this.appliedEvents = this.appliedEvents.slice(-this.maxEventHistory);
    }
  }

  canApplyEvent(event: SemanticEvent): boolean {
    // Check if there's a validator for this event type
    const validator = this.eventValidators.get(event.type);
    
    // If no validator registered, assume event is valid
    if (!validator) {
      return true;
    }

    // Run the validator
    return validator(event, this);
  }

  previewEvent(event: SemanticEvent): WorldChange[] {
    // Check if there's a previewer for this event type
    const previewer = this.eventPreviewers.get(event.type);
    
    // If no previewer registered, return empty array
    if (!previewer) {
      return [];
    }

    // Run the previewer
    return previewer(event, this);
  }

  getAppliedEvents(): SemanticEvent[] {
    return [...this.appliedEvents];
  }

  getEventsSince(timestamp: number): SemanticEvent[] {
    return this.appliedEvents.filter(event => event.timestamp > timestamp);
  }

  clearEventHistory(): void {
    this.appliedEvents = [];
  }

  // Rebuild ID counters by analyzing existing entities
  private rebuildIdCounters(): void {
    // Clear counters
    this.idCounters.clear();
    
    // Find the highest ID for each prefix
    for (const entity of this.entities.values()) {
      const id = entity.id;
      if (id.length >= 3) {
        const prefix = id[0];
        const numPart = id.substring(1);
        
        // Parse the numeric part (base36)
        const num = parseInt(numPart, 36);
        if (!isNaN(num)) {
          const currentMax = this.idCounters.get(prefix) || 0;
          if (num > currentMax) {
            this.idCounters.set(prefix, num);
          }
        }
      }
    }
  }

  // Get the data store for sharing with AuthorModel
  getDataStore(): DataStore {
    // Return a reference to the WorldModel's internal state
    // AuthorModel will share these same objects
    return {
      entities: this.entities,
      spatialIndex: this.spatialIndex,
      state: this.state,
      playerId: this.playerId,
      relationships: this.relationships,
      idCounters: this.idCounters,
      capabilities: this.capabilities
    };
  }

  // Scope Management Methods
  getScopeRegistry(): ScopeRegistry {
    return this.scopeRegistry;
  }

  addScopeRule(rule: ScopeRule): void {
    this.scopeRegistry.addRule(rule);
    this.emitPlatformEvent('scope_rule_added', { 
      ruleId: rule.id,
      fromLocations: rule.fromLocations,
      forActions: rule.forActions
    });
  }

  removeScopeRule(ruleId: string): boolean {
    const removed = this.scopeRegistry.removeRule(ruleId);
    if (removed) {
      this.emitPlatformEvent('scope_rule_removed', { ruleId });
    }
    return removed;
  }

  evaluateScope(actorId: string, actionId?: string): string[] {
    const actor = this.getEntity(actorId);
    if (!actor) {
      console.warn('evaluateScope: No actor found for ID:', actorId);
      return [];
    }

    const currentLocation = this.getLocation(actorId);
    if (!currentLocation) {
      console.warn('evaluateScope: No location found for actor:', actorId);
      return [];
    }

    const context: ScopeContext = {
      world: this,
      actorId,
      actionId,
      currentLocation
    };

    const result = this.scopeEvaluator.evaluate(context);
    return Array.from(result.entityIds);
  }

  /**
   * Register default scope rules for standard visibility
   */
  private registerDefaultScopeRules(): void {
    // Basic visibility rule - entities in same room
    this.addScopeRule({
      id: 'default_room_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        const room = this.getEntity(context.currentLocation);
        if (!room) {
          console.warn('No room found for location:', context.currentLocation);
          return [];
        }
        
        // Get all entities in the room
        const contents = this.getContents(context.currentLocation);
        const entityIds = contents.map(e => e.id);
        
        // Add the room itself
        entityIds.push(context.currentLocation);
        
        // Add nested contents (in containers, on supporters)
        for (const entity of contents) {
          const nested = this.getAllContents(entity.id);
          entityIds.push(...nested.map(e => e.id));
        }
        
        return entityIds;
      },
      priority: 50,
      source: 'core'
    });

    // Carried items are always in scope
    this.addScopeRule({
      id: 'default_inventory_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        const carried = this.getContents(context.actorId);
        const entityIds = carried.map(e => e.id);
        
        // Add nested contents of carried items
        for (const entity of carried) {
          const nested = this.getAllContents(entity.id);
          entityIds.push(...nested.map(e => e.id));
        }
        
        return entityIds;
      },
      priority: 100,
      source: 'core'
    });
  }

  /**
   * Get physically visible entities using VisibilityBehavior (line-of-sight)
   * 
   * Returns entities that can actually be seen by the observer based on:
   * - Physical location (must be in same room)
   * - Container state (can't see inside closed opaque containers)
   * - Lighting conditions (limited visibility in darkness)
   * - Scenery visibility flags
   * 
   * This is for perception and display purposes. For command resolution,
   * use getInScope() instead which includes entities that can be referenced
   * even if not visible.
   * 
   * @param observerId - The entity doing the observing
   * @returns Array of entities that are physically visible
   */
  getVisible(observerId: string): IFEntity[] {
    const observer = this.getEntity(observerId);
    if (!observer) return [];
    return VisibilityBehavior.getVisible(observer, this);
  }

  /**
   * Get entities in scope for command resolution using the scope system
   * 
   * Returns entities that can be referenced in commands, including:
   * - All entities in the current room
   * - Items in containers (even closed ones)
   * - Carried items and their contents
   * - Entities made available by scope rules (e.g., through windows)
   * 
   * This is for parser/command resolution. For physical visibility,
   * use getVisible() instead.
   * 
   * @param observerId - The entity whose scope to evaluate
   * @returns Array of entities that can be referenced in commands
   */
  getInScope(observerId: string): IFEntity[] {
    const entityIds = this.evaluateScope(observerId);
    return entityIds
      .map(id => this.getEntity(id))
      .filter((e): e is IFEntity => e !== undefined);
  }

  /**
   * Check if observer can physically see target (line-of-sight)
   * 
   * Uses VisibilityBehavior to determine if target is visible based on:
   * - Physical location
   * - Container state
   * - Lighting conditions
   * 
   * This is for perception checks. To check if an entity can be
   * referenced in commands, check if it's in getInScope() instead.
   * 
   * @param observerId - The entity doing the observing
   * @param targetId - The entity being observed
   * @returns true if observer can see target
   */
  canSee(observerId: string, targetId: string): boolean {
    const observer = this.getEntity(observerId);
    const target = this.getEntity(targetId);
    if (!observer || !target) return false;
    return VisibilityBehavior.canSee(observer, target, this);
  }
}
