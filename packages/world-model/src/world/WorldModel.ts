// WorldModel.ts - Core world model interface and implementation for Sharpee IF Platform

import { IFEntity } from '../entities/if-entity';
import { EntityType, isEntityType } from '../entities/entity-types';
import { TraitType } from '../traits/trait-types';
import { RoomTrait } from '../traits/room';
import { RoomBehavior } from '../traits/room/roomBehavior';
import { RegionTrait, IRegionData } from '../traits/region/regionTrait';
import { SceneTrait } from '../traits/scene/sceneTrait';
import { DoorTrait } from '../traits/door';
import { SceneryTrait } from '../traits/scenery';
import { IdentityTrait } from '../traits/identity/identityTrait';
import { OpenableTrait } from '../traits/openable/openableTrait';
import { LockableTrait } from '../traits/lockable/lockableTrait';
import { WearableTrait } from '../traits/wearable/wearableTrait';
import { ClothingTrait } from '../traits/clothing/clothingTrait';
import { ExitTrait } from '../traits/exit/exitTrait';
import { DirectionType, getOppositeDirection } from '../constants/directions';
import { ISemanticEvent, ISemanticEventSource } from '@sharpee/core';
import { SpatialIndex } from './SpatialIndex';
import { VisibilityBehavior } from './VisibilityBehavior';
import { WorldSerializer } from './WorldSerializer';
import { IDataStore } from './AuthorModel';
import { canContain } from '../traits/container/container-utils';
import {
  ICapabilityStore,
  ICapabilityData,
  ICapabilitySchema,
  ICapabilityRegistration
} from './capabilities';
import {
  WorldState,
  WorldConfig,
  ContentsOptions,
  WorldChange,
  IGrammarVocabularyProvider,
  GrammarVocabularyProvider,
  IEventProcessorWiring,
  GamePrompt,
  DefaultPrompt,
  PROMPT_STATE_KEY
} from '@sharpee/if-domain';
import { ScopeRegistry } from '../scope/scope-registry';
import { RuleScopeEvaluator } from '../scope/scope-evaluator';
import { IScopeRule, IScopeContext } from '../scope/scope-rule';

// Event system — extracted to WorldEventSystem.ts, re-exported for backward compat
import {
  WorldEventSystem,
  EventHandler,
  EventValidator,
  EventPreviewer,
  EventChainHandler,
  ChainEventOptions,
} from './WorldEventSystem';
export type { EventHandler, EventValidator, EventPreviewer, EventChainHandler, ChainEventOptions };

// Re-export domain types for backward compatibility
export {
  WorldState,
  WorldConfig,
  ContentsOptions,
  WorldChange
} from '@sharpee/if-domain';

// Region management (ADR-149)
export interface RegionOptions {
  /** Human-readable region name. */
  name: string;
  /** Parent region entity ID for nesting. */
  parentRegionId?: string;
  /** Region-wide ambient sound. */
  ambientSound?: string;
  /** Region-wide ambient smell. */
  ambientSmell?: string;
  /** Whether rooms in this region default to dark. */
  defaultDark?: boolean;
}

// Scene management (ADR-149)
export interface SceneOptions {
  /** Human-readable scene name. */
  name: string;
  /** Returns true when the scene should begin. Evaluated each turn when state is 'waiting'. */
  begin: (world: IWorldModel) => boolean;
  /** Returns true when the scene should end. Evaluated each turn when state is 'active'. */
  end: (world: IWorldModel) => boolean;
  /** Whether the scene can activate more than once. Default: false. */
  recurring?: boolean;
}

/** Stored condition closures for a scene (not serializable). */
export interface SceneConditions {
  begin: (world: IWorldModel) => boolean;
  end: (world: IWorldModel) => boolean;
}

/**
 * Result of comparing region hierarchies for two rooms (ADR-149).
 *
 * @param exited - Region IDs exited, innermost first.
 * @param entered - Region IDs entered, outermost first.
 */
export interface RegionCrossings {
  exited: string[];
  entered: string[];
}

// Score Ledger (ADR-129)
import { ScoreLedger, ScoreEntry } from './ScoreLedger';
export { ScoreEntry } from './ScoreLedger';

// Interface and class with same name in same file - TypeScript standard pattern
export interface IWorldModel {
  // Get the data store for sharing with AuthorModel
  getDataStore(): IDataStore;

  // Capability Management
  registerCapability(name: string, registration: Partial<ICapabilityRegistration>): void;
  updateCapability(name: string, data: Partial<ICapabilityData>): void;
  getCapability(name: string): ICapabilityData | undefined;
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

  // Prompt (ADR-137)
  getPrompt(): GamePrompt;
  setPrompt(prompt: GamePrompt): void;

  // Query Operations
  findByTrait(traitType: TraitType): IFEntity[];
  findByType(entityType: string): IFEntity[];
  findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[];
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

  // Convenience Creators
  connectRooms(room1Id: string, room2Id: string, direction: DirectionType): void;
  createDoor(displayName: string, opts: {
    room1Id: string;
    room2Id: string;
    direction: DirectionType;
    description?: string;
    aliases?: string[];
    isOpen?: boolean;
    isLocked?: boolean;
    keyId?: string;
  }): IFEntity;

  // Region Management (ADR-149)
  createRegion(id: string, options: RegionOptions): IFEntity;
  assignRoom(roomId: string, regionId: string): void;
  isInRegion(entityId: string, regionId: string): boolean;
  getRegionCrossings(fromRoomId: string, toRoomId: string): RegionCrossings;

  // Scene Management (ADR-149)
  createScene(id: string, options: SceneOptions): IFEntity;
  getSceneConditions(sceneId: string): SceneConditions | undefined;
  getAllSceneConditions(): Map<string, SceneConditions>;
  isSceneActive(sceneId: string): boolean;
  hasSceneEnded(sceneId: string): boolean;
  hasSceneHappened(sceneId: string): boolean;

  // Score Ledger (ADR-129)
  awardScore(id: string, points: number, description: string): boolean;
  revokeScore(id: string): boolean;
  hasScore(id: string): boolean;
  getScore(): number;
  getScoreEntries(): ScoreEntry[];
  setMaxScore(max: number): void;
  getMaxScore(): number;

  // Persistence
  toJSON(): string;
  loadJSON(json: string): void;
  clear(): void;

  // Event Sourcing Support
  registerEventHandler(eventType: string, handler: EventHandler): void;
  unregisterEventHandler(eventType: string): void;
  registerEventValidator(eventType: string, validator: EventValidator): void;
  registerEventPreviewer(eventType: string, previewer: EventPreviewer): void;

  /**
   * Wire all registered event handlers to the engine's EventProcessor (ADR-086).
   * Called by the engine during initialization to ensure handlers are invoked.
   */
  connectEventProcessor(wiring: IEventProcessorWiring): void;

  /**
   * Register an event chain handler (ADR-094).
   * Chain handlers produce new events when a trigger event occurs.
   * Unlike regular handlers, chains return events to be emitted.
   *
   * @param triggerType - The event type that triggers this chain
   * @param handler - Function that receives the trigger event and returns new events
   * @param options - Chain registration options (mode, key, priority)
   */
  chainEvent(
    triggerType: string,
    handler: EventChainHandler,
    options?: ChainEventOptions
  ): void;

  applyEvent(event: ISemanticEvent): void;
  canApplyEvent(event: ISemanticEvent): boolean;
  previewEvent(event: ISemanticEvent): WorldChange[];

  // Event History (optional)
  getAppliedEvents(): ISemanticEvent[];
  getEventsSince(timestamp: number): ISemanticEvent[];
  clearEventHistory(): void;

  // Scope Management
  getScopeRegistry(): ScopeRegistry;
  addScopeRule(rule: IScopeRule): void;
  removeScopeRule(ruleId: string): boolean;
  evaluateScope(actorId: string, actionId?: string): string[];

  // Vocabulary Management (ADR-082)
  getGrammarVocabularyProvider(): IGrammarVocabularyProvider;

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

export class WorldModel implements IWorldModel {
  private entities: Map<string, IFEntity> = new Map();
  private state: WorldState = {};
  private playerId: string | undefined;
  private spatialIndex: SpatialIndex;
  private config: WorldConfig;
  private capabilities: ICapabilityStore = {};

  // Score Ledger (ADR-129)
  private scoreLedger = new ScoreLedger();

  // Scene condition closures (ADR-149) — not serialized
  private sceneConditions: Map<string, SceneConditions> = new Map();

  // ID generation
  private idCounters: Map<string, number> = new Map();

  // Event system (ADR-086, ADR-094) — delegates to WorldEventSystem
  private eventSystem = new WorldEventSystem();

  // Persistence — delegates to WorldSerializer
  private serializer = new WorldSerializer();

  private platformEvents?: ISemanticEventSource;

  // Scope system
  private scopeRegistry: ScopeRegistry;
  private scopeEvaluator: RuleScopeEvaluator;

  // Vocabulary system (ADR-082)
  private grammarVocabularyProvider: IGrammarVocabularyProvider;

  constructor(config: WorldConfig = {}, platformEvents?: ISemanticEventSource) {
    this.config = {
      enableSpatialIndex: true,
      maxDepth: 10,
      strictMode: false,
      ...config
    };
    this.spatialIndex = new SpatialIndex();
    this.platformEvents = platformEvents;
    this.eventSystem.setWorldRef(this);

    // Initialize scope system
    this.scopeRegistry = new ScopeRegistry();
    this.scopeEvaluator = new RuleScopeEvaluator(this.scopeRegistry);

    // Initialize vocabulary system (ADR-082)
    this.grammarVocabularyProvider = new GrammarVocabularyProvider();

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
        data: {
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
  registerCapability(name: string, registration: Partial<ICapabilityRegistration> = {}): void {
    if (this.capabilities[name]) {
      if (this.config.strictMode) {
        throw new Error(`Capability '${name}' is already registered`);
      }
      return;
    }

    // Initialize capability with schema and initial data
    const initialData: ICapabilityData = {};

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

  updateCapability(name: string, updates: Partial<ICapabilityData>): void {
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

  getCapability(name: string): ICapabilityData | undefined {
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
    // Validate entity type
    if (!isEntityType(type)) {
      throw new Error(`Unknown entity type: '${type}'. Valid types are: ${Object.values(EntityType).join(', ')}`);
    }

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
        const scenery = e.getTrait(SceneryTrait);
        return !scenery || scenery.visible !== false;
      });
    }

    if (!options.includeWorn) {
      // Filter out worn items (check both WEARABLE and CLOTHING traits)
      entities = entities.filter(e => {
        const wearable = e.getTrait(WearableTrait);
        const clothing = e.getTrait(ClothingTrait);
        const wornFromWearable = wearable && wearable.isWorn;
        const wornFromClothing = clothing && clothing.isWorn;
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
      const openable = target.getTrait(OpenableTrait);
      if (openable && !openable.isOpen) {
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

  // Prompt (ADR-137)
  getPrompt(): GamePrompt {
    return this.state[PROMPT_STATE_KEY] ?? DefaultPrompt;
  }

  setPrompt(prompt: GamePrompt): void {
    this.state[PROMPT_STATE_KEY] = prompt;
  }

  // Query Operations
  findByTrait(traitType: TraitType): IFEntity[] {
    return this.findWhere(e => e.hasTrait(traitType));
  }

  findByType(entityType: string): IFEntity[] {
    return this.findWhere(e => e.type === entityType);
  }

  findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[] {
    return Array.from(this.entities.values()).filter(predicate);
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

      const roomTrait = room.getTrait(RoomTrait);
      const exits = roomTrait?.exits || {};

      for (const [direction, exitInfo] of Object.entries(exits)) {
        let targetRoom: string | undefined;
        let pathElement: string | undefined;

        if (typeof exitInfo === 'string') {
          // Simple string - treat as direct room connection
          targetRoom = exitInfo;
          pathElement = exitInfo; // For now, use room ID as path element
        } else if (typeof exitInfo === 'object') {
          // ExitInfo object
          if (exitInfo.via) {
            // Has a door/exit entity
            const exitEntity = this.getEntity(exitInfo.via);
            if (!exitEntity) continue;

            pathElement = exitInfo.via;

            // Get destination based on entity type
            if (exitEntity.hasTrait(TraitType.DOOR)) {
              const door = exitEntity.getTrait(DoorTrait);
              targetRoom = door?.room1 === roomId ? door?.room2 : door?.room1;
            } else if (exitEntity.hasTrait(TraitType.EXIT)) {
              targetRoom = exitEntity.getTrait(ExitTrait)?.to;
            } else {
              // Not a valid door/exit entity
              continue;
            }
          } else if (exitInfo.destination) {
            // Direct room connection
            targetRoom = exitInfo.destination;
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

  // Score Ledger (ADR-129) — delegates to ScoreLedger
  awardScore(id: string, points: number, description: string): boolean {
    return this.scoreLedger.award(id, points, description);
  }

  revokeScore(id: string): boolean {
    return this.scoreLedger.revoke(id);
  }

  hasScore(id: string): boolean {
    return this.scoreLedger.has(id);
  }

  getScore(): number {
    return this.scoreLedger.getTotal();
  }

  getScoreEntries(): ScoreEntry[] {
    return this.scoreLedger.getEntries();
  }

  setMaxScore(max: number): void {
    this.scoreLedger.setMax(max);
  }

  getMaxScore(): number {
    return this.scoreLedger.getMax();
  }

  // Persistence — delegates to WorldSerializer
  toJSON(): string {
    return this.serializer.serialize(this.getSerializableState(), this.scoreLedger);
  }

  loadJSON(json: string): void {
    // Preserve code registrations that aren't part of serialized state
    const savedEventChains = this.eventSystem.preserveChains();
    const savedCapabilities = { ...this.capabilities };

    // Clear current state
    this.clear();

    // Restore code registrations
    this.eventSystem.restoreChains(savedEventChains);
    this.capabilities = savedCapabilities;

    // Delegate deserialization
    const serializableState = this.getSerializableState();
    this.serializer.deserialize(json, serializableState, this.scoreLedger);

    // Sync primitives back (objects are shared by reference)
    this.playerId = serializableState.playerId;
  }

  private getSerializableState() {
    return {
      entities: this.entities,
      spatialIndex: this.spatialIndex,
      state: this.state,
      playerId: this.playerId,
      relationships: this.relationships,
      idCounters: this.idCounters,
      capabilities: this.capabilities,
    };
  }

  clear(): void {
    this.entities.clear();
    this.state = {};
    this.playerId = undefined;
    this.spatialIndex.clear();
    this.relationships.clear();
    this.idCounters.clear();
    this.capabilities = {};
    this.scoreLedger.clear();
    this.grammarVocabularyProvider.clear();
    this.eventSystem.clear();
  }

  // Event system — delegates to WorldEventSystem
  registerEventHandler(eventType: string, handler: EventHandler): void {
    this.eventSystem.registerEventHandler(eventType, handler);
  }

  unregisterEventHandler(eventType: string): void {
    this.eventSystem.unregisterEventHandler(eventType);
  }

  registerEventValidator(eventType: string, validator: EventValidator): void {
    this.eventSystem.registerEventValidator(eventType, validator);
  }

  registerEventPreviewer(eventType: string, previewer: EventPreviewer): void {
    this.eventSystem.registerEventPreviewer(eventType, previewer);
  }

  connectEventProcessor(wiring: IEventProcessorWiring): void {
    this.eventSystem.connectEventProcessor(wiring);
  }

  chainEvent(
    triggerType: string,
    handler: EventChainHandler,
    options: ChainEventOptions = {}
  ): void {
    this.eventSystem.chainEvent(triggerType, handler, options);
  }

  applyEvent(event: ISemanticEvent): void {
    this.eventSystem.applyEvent(event);
  }

  canApplyEvent(event: ISemanticEvent): boolean {
    return this.eventSystem.canApplyEvent(event);
  }

  previewEvent(event: ISemanticEvent): WorldChange[] {
    return this.eventSystem.previewEvent(event);
  }

  getAppliedEvents(): ISemanticEvent[] {
    return this.eventSystem.getAppliedEvents();
  }

  getEventsSince(timestamp: number): ISemanticEvent[] {
    return this.eventSystem.getEventsSince(timestamp);
  }

  clearEventHistory(): void {
    this.eventSystem.clearEventHistory();
  }

  // Get the data store for sharing with AuthorModel
  getDataStore(): IDataStore {
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

  // Vocabulary Management (ADR-082)
  getGrammarVocabularyProvider(): IGrammarVocabularyProvider {
    return this.grammarVocabularyProvider;
  }

  addScopeRule(rule: IScopeRule): void {
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

    const context: IScopeContext = {
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

  // ========== Convenience Creators ==========

  /**
   * Create a bidirectional connection between two rooms.
   * Sets exits in both directions (e.g. NORTH on room1, SOUTH on room2).
   */
  connectRooms(room1Id: string, room2Id: string, direction: DirectionType): void {
    const room1 = this.getEntity(room1Id);
    const room2 = this.getEntity(room2Id);
    if (!room1 || !room2) {
      throw new Error(`connectRooms: both rooms must exist (${room1Id}, ${room2Id})`);
    }

    const opposite = getOppositeDirection(direction);
    RoomBehavior.setExit(room1, direction, room2Id);
    RoomBehavior.setExit(room2, opposite, room1Id);
  }

  /**
   * Create a door entity and wire it into both rooms' exit data.
   * The door is placed in room1 spatially (for scope resolution).
   */
  createDoor(displayName: string, opts: {
    room1Id: string;
    room2Id: string;
    direction: DirectionType;
    description?: string;
    aliases?: string[];
    isOpen?: boolean;
    isLocked?: boolean;
    keyId?: string;
  }): IFEntity {
    const room1 = this.getEntity(opts.room1Id);
    const room2 = this.getEntity(opts.room2Id);
    if (!room1 || !room2) {
      throw new Error(`createDoor: both rooms must exist (${opts.room1Id}, ${opts.room2Id})`);
    }

    const door = this.createEntity(displayName, EntityType.DOOR);
    door.add(new IdentityTrait({
      name: displayName,
      aliases: opts.aliases,
      description: opts.description,
    }));
    door.add(new DoorTrait({
      room1: opts.room1Id,
      room2: opts.room2Id,
    }));
    door.add(new SceneryTrait());
    door.add(new OpenableTrait({ isOpen: opts.isOpen ?? false }));

    if (opts.isLocked !== undefined || opts.keyId) {
      door.add(new LockableTrait({
        isLocked: opts.isLocked ?? true,
        ...(opts.keyId ? { requiredKey: opts.keyId } : {}),
      }));
    }

    // Wire exits through the door
    const opposite = getOppositeDirection(opts.direction);
    RoomBehavior.setExit(room1, opts.direction, opts.room2Id, door.id);
    RoomBehavior.setExit(room2, opposite, opts.room1Id, door.id);

    // Place door in room1 for scope resolution
    this.moveEntity(door.id, opts.room1Id);

    return door;
  }

  // ── Region Management (ADR-149) ──────────────────────────────────

  /**
   * Creates a region entity with RegionTrait atomically.
   *
   * @param id - Explicit entity ID for the region (e.g., 'reg-underground').
   *             Must be unique; throws if already exists.
   * @param options - Region configuration.
   * @returns The created region entity.
   */
  createRegion(id: string, options: RegionOptions): IFEntity {
    if (this.hasEntity(id)) {
      throw new Error(`createRegion: entity '${id}' already exists`);
    }
    if (options.parentRegionId && !this.hasEntity(options.parentRegionId)) {
      throw new Error(`createRegion: parent region '${options.parentRegionId}' not found`);
    }

    const entity = new IFEntity(id, EntityType.REGION, {
      attributes: {
        displayName: options.name,
        name: options.name,
        entityType: EntityType.REGION,
      },
    });
    entity.add(new RegionTrait(options));
    this.entities.set(id, entity);

    return entity;
  }

  /**
   * Assigns a room to a region by setting RoomTrait.regionId.
   *
   * @param roomId - ID of the room entity.
   * @param regionId - ID of the region entity (must exist and have RegionTrait).
   * @throws If room not found, region not found, or types are wrong.
   */
  assignRoom(roomId: string, regionId: string): void {
    const room = this.getEntity(roomId);
    if (!room) {
      throw new Error(`assignRoom: room '${roomId}' not found`);
    }
    const roomTrait = room.get<RoomTrait>(TraitType.ROOM);
    if (!roomTrait) {
      throw new Error(`assignRoom: entity '${roomId}' does not have RoomTrait`);
    }
    const region = this.getEntity(regionId);
    if (!region) {
      throw new Error(`assignRoom: region '${regionId}' not found`);
    }
    if (!region.hasTrait(TraitType.REGION)) {
      throw new Error(`assignRoom: entity '${regionId}' is not a region`);
    }
    roomTrait.regionId = regionId;
  }

  /**
   * Tests whether an entity (or its containing room) is in a region,
   * traversing the parent region hierarchy.
   *
   * @param entityId - The entity to test. If it's a room, checks its regionId.
   *                   Otherwise, resolves the entity's containing room first.
   * @param regionId - The region to test membership against.
   * @returns true if the entity is in the region or any child of it.
   */
  isInRegion(entityId: string, regionId: string): boolean {
    const entity = this.getEntity(entityId);
    if (!entity) return false;

    // If the entity is a room, use its regionId directly.
    // Otherwise, resolve the containing room.
    let roomRegionId: string | undefined;
    if (entity.type === EntityType.ROOM) {
      roomRegionId = entity.get<RoomTrait>(TraitType.ROOM)?.regionId;
    } else {
      const room = this.getContainingRoom(entityId);
      if (!room) return false;
      roomRegionId = room.get<RoomTrait>(TraitType.ROOM)?.regionId;
    }

    if (!roomRegionId) return false;

    // Walk up the parent chain from the room's region
    return this.regionAncestryIncludes(roomRegionId, regionId);
  }

  /**
   * Computes which regions are exited and entered when moving between rooms.
   * Exit list is innermost-first; entry list is outermost-first.
   *
   * @param fromRoomId - The source room entity ID.
   * @param toRoomId - The destination room entity ID.
   * @returns Region IDs exited and entered. Both empty if same region or no regions.
   */
  getRegionCrossings(fromRoomId: string, toRoomId: string): RegionCrossings {
    const fromRoom = this.getEntity(fromRoomId);
    const toRoom = this.getEntity(toRoomId);

    const fromChain = fromRoom
      ? this.getRegionAncestry(fromRoom.get<RoomTrait>(TraitType.ROOM)?.regionId)
      : [];
    const toChain = toRoom
      ? this.getRegionAncestry(toRoom.get<RoomTrait>(TraitType.ROOM)?.regionId)
      : [];

    // Convert to sets for fast lookup
    const fromSet = new Set(fromChain);
    const toSet = new Set(toChain);

    // Exited: regions in fromChain but not in toChain (innermost first — natural order)
    const exited = fromChain.filter(id => !toSet.has(id));

    // Entered: regions in toChain but not in fromChain (outermost first — reverse natural order)
    const entered = toChain.filter(id => !fromSet.has(id)).reverse();

    return { exited, entered };
  }

  // ── Private region helpers ───────────────────────────────────────────

  /**
   * Builds the ancestry chain for a region: [self, parent, grandparent, ...].
   * Returns empty array if regionId is undefined or not found.
   */
  private getRegionAncestry(regionId: string | undefined): string[] {
    const chain: string[] = [];
    let currentId = regionId;
    const visited = new Set<string>(); // guard against cycles

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const region = this.getEntity(currentId);
      if (!region) break;

      const trait = region.get<RegionTrait>(TraitType.REGION);
      if (!trait) break;

      chain.push(currentId);
      currentId = trait.parentRegionId;
    }

    return chain;
  }

  /**
   * Checks whether a region ancestry chain includes a target region.
   */
  private regionAncestryIncludes(startRegionId: string, targetRegionId: string): boolean {
    let currentId: string | undefined = startRegionId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === targetRegionId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const region = this.getEntity(currentId);
      if (!region) return false;

      const trait = region.get<RegionTrait>(TraitType.REGION);
      if (!trait) return false;

      currentId = trait.parentRegionId;
    }

    return false;
  }

  // ── Scene Management (ADR-149) ───────────────────────────────────

  /**
   * Creates a scene entity with SceneTrait and registers condition closures.
   *
   * @param id - Explicit entity ID (e.g., 'scene-flood'). Must be unique.
   * @param options - Scene name, begin/end conditions, recurring flag.
   * @returns The created scene entity.
   */
  createScene(id: string, options: SceneOptions): IFEntity {
    if (this.hasEntity(id)) {
      throw new Error(`createScene: entity '${id}' already exists`);
    }

    const entity = new IFEntity(id, EntityType.SCENE, {
      attributes: {
        displayName: options.name,
        name: options.name,
        entityType: EntityType.SCENE,
      },
    });
    entity.add(new SceneTrait({
      name: options.name,
      recurring: options.recurring,
    }));
    this.entities.set(id, entity);

    // Store condition closures separately (not serializable)
    this.sceneConditions.set(id, {
      begin: options.begin,
      end: options.end,
    });

    return entity;
  }

  /**
   * Retrieves the condition closures for a scene.
   * Returns undefined if the scene has no registered conditions
   * (e.g., after save/restore before re-registration).
   *
   * @param sceneId - The scene entity ID.
   */
  getSceneConditions(sceneId: string): SceneConditions | undefined {
    return this.sceneConditions.get(sceneId);
  }

  /**
   * Returns all registered scene conditions. Used by the engine's
   * scene evaluation phase to iterate over scenes each turn.
   */
  getAllSceneConditions(): Map<string, SceneConditions> {
    return this.sceneConditions;
  }

  /**
   * Returns true if the scene is currently in the 'active' state.
   *
   * @param sceneId - The scene entity ID.
   */
  isSceneActive(sceneId: string): boolean {
    const entity = this.getEntity(sceneId);
    if (!entity) return false;
    return entity.get<SceneTrait>(TraitType.SCENE)?.state === 'active';
  }

  /**
   * Returns true if the scene has reached the 'ended' state.
   * For recurring scenes, this is true only while in the 'ended' state
   * (resets to 'waiting' when the scene re-activates).
   *
   * @param sceneId - The scene entity ID.
   */
  hasSceneEnded(sceneId: string): boolean {
    const entity = this.getEntity(sceneId);
    if (!entity) return false;
    return entity.get<SceneTrait>(TraitType.SCENE)?.state === 'ended';
  }

  /**
   * Returns true if the scene has ever been active (beganAtTurn is set).
   *
   * @param sceneId - The scene entity ID.
   */
  hasSceneHappened(sceneId: string): boolean {
    const entity = this.getEntity(sceneId);
    if (!entity) return false;
    return entity.get<SceneTrait>(TraitType.SCENE)?.beganAtTurn !== undefined;
  }
}
