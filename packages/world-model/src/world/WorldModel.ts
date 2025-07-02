// WorldModel.ts - Core world model interface and implementation for Sharpee IF Platform

import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { SemanticEvent } from '@sharpee/core';
import { SpatialIndex } from './SpatialIndex';
import { VisibilityBehavior } from './VisibilityBehavior';

// Re-export types that were in the interface file
export interface WorldState {
  [key: string]: any;
}

export interface WorldConfig {
  enableSpatialIndex?: boolean;
  maxDepth?: number; // Maximum containment depth
  strictMode?: boolean; // Strict validation
}

export interface FindOptions {
  includeScenery?: boolean;
  includeInvisible?: boolean;
  maxDepth?: number;
}

export interface ContentsOptions {
  recursive?: boolean;
  includeWorn?: boolean;
  visibleOnly?: boolean;
}

export interface WorldChange {
  type: 'move' | 'create' | 'delete' | 'modify' | 'relate' | 'unrelate';
  entityId: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
}

export type EventHandler = (event: SemanticEvent, world: WorldModel) => void;
export type EventValidator = (event: SemanticEvent, world: WorldModel) => boolean;
export type EventPreviewer = (event: SemanticEvent, world: WorldModel) => WorldChange[];

// Interface and class with same name in same file - TypeScript standard pattern
export interface WorldModel {
  // Entity Management
  createEntity(id: string, displayName: string): IFEntity;
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
}

export class WorldModel implements WorldModel {
  private entities: Map<string, IFEntity> = new Map();
  private state: WorldState = {};
  private playerId: string | undefined;
  private spatialIndex: SpatialIndex;
  private config: WorldConfig;
  
  // Event sourcing support
  private eventHandlers = new Map<string, EventHandler>();
  private eventValidators = new Map<string, EventValidator>();
  private eventPreviewers = new Map<string, EventPreviewer>();
  private appliedEvents: SemanticEvent[] = [];
  private maxEventHistory = 1000; // Configurable limit

  constructor(config: WorldConfig = {}) {
    this.config = {
      enableSpatialIndex: true,
      maxDepth: 10,
      strictMode: false,
      ...config
    };
    this.spatialIndex = new SpatialIndex();
  }

  // Entity Management
  createEntity(id: string, displayName: string): IFEntity {
    if (this.entities.has(id)) {
      throw new Error(`Entity with id '${id}' already exists`);
    }

    const entity = new IFEntity(id, displayName);
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
      entities = entities.filter(e => !e.hasTrait(TraitType.SCENERY) || (e.getTrait(TraitType.SCENERY) as any)?.visible);
    }

    if (!options.includeWorn) {
      // Filter out worn items
      entities = entities.filter(e => {
        const wearable = e.getTrait(TraitType.WEARABLE);
        return !wearable || !(wearable as any).isWorn;
      });
    }

    return entities;
  }

  moveEntity(entityId: string, targetId: string | null): boolean {
    if (!this.canMoveEntity(entityId, targetId)) {
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

    // Check if target can contain
    if (!target.hasTrait(TraitType.CONTAINER) && !target.hasTrait(TraitType.SUPPORTER)) {
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

    const traverse = (id: string, depth: number = 0) => {
      if (visited.has(id) || depth > this.config.maxDepth!) return;
      visited.add(id);

      const contents = this.getContents(id, options);
      result.push(...contents);

      if (options.recursive) {
        contents.forEach(item => traverse(item.id, depth + 1));
      }
    };

    traverse(entityId);
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

    if (!options.includeInvisible) {
      entities = entities.filter(e => {
        const scenery = e.getTrait(TraitType.SCENERY);
        return !scenery || (scenery as any).visible !== false;
      });
    }

    return entities;
  }

  getVisible(observerId: string): IFEntity[] {
    const observer = this.getEntity(observerId);
    if (!observer) return [];

    return this.getAllEntities().filter(entity => 
      this.canSee(observerId, entity.id)
    );
  }

  getInScope(observerId: string): IFEntity[] {
    const observer = this.getEntity(observerId);
    if (!observer) return [];

    const room = this.getContainingRoom(observerId);
    if (!room) return [];

    // Get all entities in the same room
    const inScope: IFEntity[] = [];
    
    // Add room itself
    inScope.push(room);

    // Add room contents recursively
    const roomContents = this.getAllContents(room.id, { recursive: true });
    inScope.push(...roomContents);

    // Add carried items
    const carried = this.getAllContents(observerId, { recursive: true });
    inScope.push(...carried);

    // Filter to unique entities
    const unique = new Map<string, IFEntity>();
    inScope.forEach(e => unique.set(e.id, e));
    
    return Array.from(unique.values());
  }

  canSee(observerId: string, targetId: string): boolean {
    const observer = this.getEntity(observerId);
    const target = this.getEntity(targetId);
    
    if (!observer || !target) return false;
    if (observerId === targetId) return true;

    return VisibilityBehavior.canSee(observer, target, this);
  }

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
        // Exit can be either a string ID or an object with destination/via
        const exitId = typeof exitInfo === 'string' ? exitInfo : (exitInfo as any).via || (exitInfo as any).destination;
        if (!exitId) continue;
        
        const exit = this.getEntity(exitId as string);
        if (!exit) continue;

        // Handle doors
        let targetRoom: string | undefined;
        if (exit.hasTrait(TraitType.DOOR)) {
          const door = exit.getTrait(TraitType.DOOR) as any;
          targetRoom = door?.room1 === roomId ? door?.room2 : door?.room1;
        } else if (exit.hasTrait(TraitType.EXIT)) {
          targetRoom = (exit.getTrait(TraitType.EXIT) as any)?.destination;
        } else if (typeof exitInfo === 'object' && (exitInfo as any).destination) {
          targetRoom = (exitInfo as any).destination;
        }

        if (targetRoom === toRoomId) {
          return [...path, exitId as string];
        }

        if (targetRoom && !visited.has(targetRoom)) {
          queue.push({ roomId: targetRoom, path: [...path, exitId as string] });
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
  }

  clear(): void {
    this.entities.clear();
    this.state = {};
    this.playerId = undefined;
    this.spatialIndex.clear();
    this.relationships.clear();
    this.appliedEvents = [];
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
      console.warn(`No handler registered for event type '${event.type}'`);
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
}
