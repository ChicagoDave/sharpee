/**
 * AuthorModel — unrestricted world model access for authoring and setup.
 *
 * Public interface: Implements IWorldModel. Entity creation and movement
 * bypass validation. All other methods delegate to the backing WorldModel.
 *
 * Owner context: packages/world-model. Used during initializeWorld() for
 * setup that requires bypassing game rules (placing items in closed
 * containers, etc.).
 */

import { IFEntity } from '../entities/if-entity';
import { TraitType } from '../traits/trait-types';
import { SpatialIndex } from './SpatialIndex';
import { ITrait } from '../traits/trait';
import { OpenableTrait } from '../traits/openable/openableTrait';
import { LockableTrait } from '../traits/lockable/lockableTrait';
import { ICapabilityStore } from './capabilities';
import type {
  IWorldModel,
  EventHandler,
  EventValidator,
  EventPreviewer,
  EventChainHandler,
  ChainEventOptions,
} from './WorldModel';
import type { ScoreEntry } from './ScoreLedger';
import type { ISemanticEvent } from '@sharpee/core';
import type {
  WorldState,
  ContentsOptions,
  WorldChange,
  IEventProcessorWiring,
  GamePrompt,
  IGrammarVocabularyProvider,
} from '@sharpee/if-domain';
import type { DirectionType } from '../constants/directions';
import type { ScopeRegistry } from '../scope/scope-registry';
import type { IScopeRule } from '../scope/scope-rule';
import type {
  ICapabilityData,
  ICapabilityRegistration,
} from './capabilities';

/**
 * Data store shared between WorldModel and AuthorModel.
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
 * Item specification for bulk creation.
 */
export interface IItemSpec {
  name: string;
  type?: string;
  attributes?: Record<string, any>;
  traits?: TraitType[];
}

/**
 * AuthorModel provides unrestricted access to the world state for authoring,
 * testing, and world setup. It bypasses validation rules for entity creation
 * and movement. All other IWorldModel methods delegate to the backing WorldModel.
 *
 * @example
 * ```typescript
 * const author = new AuthorModel(world.getDataStore(), world);
 * const medicine = author.createEntity('Aspirin', 'item');
 * author.moveEntity(medicine.id, closedCabinet.id); // Works even though closed
 * ```
 */
export class AuthorModel implements IWorldModel {
  private dataStore: IDataStore;
  private worldModel: IWorldModel;

  constructor(dataStore: IDataStore, worldModel: IWorldModel) {
    this.dataStore = dataStore;
    this.worldModel = worldModel;
  }

  /**
   * Get the shared data store.
   */
  getDataStore(): IDataStore {
    return this.dataStore;
  }

  // ========== Overridden Methods (bypass validation) ==========

  /**
   * Create a new entity without validation.
   *
   * @param name - Display name for the entity
   * @param type - Entity type (room, item, actor, etc.)
   * @returns The created entity
   */
  createEntity(name: string, type: string = 'object'): IFEntity {
    const id = this.generateId(type);
    const entity = new IFEntity(id, type, {
      attributes: {
        displayName: name,
        name: name,
        entityType: type
      }
    });

    this.dataStore.entities.set(id, entity);
    return entity;
  }

  /**
   * Move an entity without validation. Can move into closed/locked containers.
   *
   * @param entityId - ID of entity to move
   * @param targetId - ID of target location (null to remove from world)
   * @returns Always true (no validation to fail)
   */
  moveEntity(entityId: string, targetId: string | null): boolean {
    const currentLocation = this.dataStore.spatialIndex.getParent(entityId);
    if (currentLocation) {
      this.dataStore.spatialIndex.removeChild(currentLocation, entityId);
    }

    if (targetId !== null) {
      this.dataStore.spatialIndex.addChild(targetId, entityId);
    }

    return true;
  }

  // ========== Delegated Methods ==========

  // Entity Management
  getEntity(id: string): IFEntity | undefined {
    return this.dataStore.entities.get(id);
  }

  hasEntity(id: string): boolean {
    return this.dataStore.entities.has(id);
  }

  removeEntity(id: string): boolean {
    return this.worldModel.removeEntity(id);
  }

  getAllEntities(): IFEntity[] {
    return Array.from(this.dataStore.entities.values());
  }

  updateEntity(entityId: string, updater: (entity: IFEntity) => void): void {
    this.worldModel.updateEntity(entityId, updater);
  }

  // Spatial Management
  getLocation(entityId: string): string | undefined {
    return this.dataStore.spatialIndex.getParent(entityId);
  }

  getContents(containerId: string, options?: ContentsOptions): IFEntity[] {
    return this.worldModel.getContents(containerId, options);
  }

  canMoveEntity(entityId: string, targetId: string | null): boolean {
    return true; // AuthorModel always allows moves
  }

  getContainingRoom(entityId: string): IFEntity | undefined {
    return this.worldModel.getContainingRoom(entityId);
  }

  getAllContents(entityId: string, options?: ContentsOptions): IFEntity[] {
    return this.worldModel.getAllContents(entityId, options);
  }

  // World State Management
  getState(): WorldState {
    return { ...this.dataStore.state };
  }

  setState(state: WorldState): void {
    Object.assign(this.dataStore.state, state);
  }

  getStateValue(key: string): any {
    return this.dataStore.state[key];
  }

  setStateValue(key: string, value: any): void {
    this.dataStore.state[key] = value;
  }

  // Prompt
  getPrompt(): GamePrompt {
    return this.worldModel.getPrompt();
  }

  setPrompt(prompt: GamePrompt): void {
    this.worldModel.setPrompt(prompt);
  }

  // Query Operations
  findByTrait(traitType: TraitType): IFEntity[] {
    return this.worldModel.findByTrait(traitType);
  }

  findByType(entityType: string): IFEntity[] {
    return this.worldModel.findByType(entityType);
  }

  findWhere(predicate: (entity: IFEntity) => boolean): IFEntity[] {
    return this.worldModel.findWhere(predicate);
  }

  getVisible(observerId: string): IFEntity[] {
    return this.worldModel.getVisible(observerId);
  }

  getInScope(observerId: string): IFEntity[] {
    return this.worldModel.getInScope(observerId);
  }

  canSee(observerId: string, targetId: string): boolean {
    return this.worldModel.canSee(observerId, targetId);
  }

  // Relationship Queries
  getRelated(entityId: string, relationshipType: string): string[] {
    return this.worldModel.getRelated(entityId, relationshipType);
  }

  areRelated(entity1Id: string, entity2Id: string, relationshipType: string): boolean {
    return this.worldModel.areRelated(entity1Id, entity2Id, relationshipType);
  }

  addRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void {
    this.worldModel.addRelationship(entity1Id, entity2Id, relationshipType);
  }

  removeRelationship(entity1Id: string, entity2Id: string, relationshipType: string): void {
    this.worldModel.removeRelationship(entity1Id, entity2Id, relationshipType);
  }

  // Utility Methods
  getTotalWeight(entityId: string): number {
    return this.worldModel.getTotalWeight(entityId);
  }

  wouldCreateLoop(entityId: string, targetId: string): boolean {
    return this.worldModel.wouldCreateLoop(entityId, targetId);
  }

  findPath(fromRoomId: string, toRoomId: string): string[] | null {
    return this.worldModel.findPath(fromRoomId, toRoomId);
  }

  getPlayer(): IFEntity | undefined {
    return this.worldModel.getPlayer();
  }

  setPlayer(entityId: string): void {
    this.worldModel.setPlayer(entityId);
  }

  // Convenience Creators
  connectRooms(room1Id: string, room2Id: string, direction: DirectionType): void {
    this.worldModel.connectRooms(room1Id, room2Id, direction);
  }

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
    return this.worldModel.createDoor(displayName, opts);
  }

  // Capability Management
  registerCapability(name: string, registration: Partial<ICapabilityRegistration>): void {
    this.worldModel.registerCapability(name, registration);
  }

  updateCapability(name: string, data: Partial<ICapabilityData>): void {
    this.worldModel.updateCapability(name, data);
  }

  getCapability(name: string): ICapabilityData | undefined {
    return this.worldModel.getCapability(name);
  }

  hasCapability(name: string): boolean {
    return this.worldModel.hasCapability(name);
  }

  // Score Ledger
  awardScore(id: string, points: number, description: string): boolean {
    return this.worldModel.awardScore(id, points, description);
  }

  revokeScore(id: string): boolean {
    return this.worldModel.revokeScore(id);
  }

  hasScore(id: string): boolean {
    return this.worldModel.hasScore(id);
  }

  getScore(): number {
    return this.worldModel.getScore();
  }

  getScoreEntries(): ScoreEntry[] {
    return this.worldModel.getScoreEntries();
  }

  setMaxScore(max: number): void {
    this.worldModel.setMaxScore(max);
  }

  getMaxScore(): number {
    return this.worldModel.getMaxScore();
  }

  // Persistence
  toJSON(): string {
    return this.worldModel.toJSON();
  }

  loadJSON(json: string): void {
    this.worldModel.loadJSON(json);
  }

  clear(): void {
    this.worldModel.clear();
  }

  // Event System
  registerEventHandler(eventType: string, handler: EventHandler): void {
    this.worldModel.registerEventHandler(eventType, handler);
  }

  unregisterEventHandler(eventType: string): void {
    this.worldModel.unregisterEventHandler(eventType);
  }

  registerEventValidator(eventType: string, validator: EventValidator): void {
    this.worldModel.registerEventValidator(eventType, validator);
  }

  registerEventPreviewer(eventType: string, previewer: EventPreviewer): void {
    this.worldModel.registerEventPreviewer(eventType, previewer);
  }

  connectEventProcessor(wiring: IEventProcessorWiring): void {
    this.worldModel.connectEventProcessor(wiring);
  }

  chainEvent(triggerType: string, handler: EventChainHandler, options?: ChainEventOptions): void {
    this.worldModel.chainEvent(triggerType, handler, options);
  }

  applyEvent(event: ISemanticEvent): void {
    this.worldModel.applyEvent(event);
  }

  canApplyEvent(event: ISemanticEvent): boolean {
    return this.worldModel.canApplyEvent(event);
  }

  previewEvent(event: ISemanticEvent): WorldChange[] {
    return this.worldModel.previewEvent(event);
  }

  getAppliedEvents(): ISemanticEvent[] {
    return this.worldModel.getAppliedEvents();
  }

  getEventsSince(timestamp: number): ISemanticEvent[] {
    return this.worldModel.getEventsSince(timestamp);
  }

  clearEventHistory(): void {
    this.worldModel.clearEventHistory();
  }

  // Scope Management
  getScopeRegistry(): ScopeRegistry {
    return this.worldModel.getScopeRegistry();
  }

  addScopeRule(rule: IScopeRule): void {
    this.worldModel.addScopeRule(rule);
  }

  removeScopeRule(ruleId: string): boolean {
    return this.worldModel.removeScopeRule(ruleId);
  }

  evaluateScope(actorId: string, actionId?: string): string[] {
    return this.worldModel.evaluateScope(actorId, actionId);
  }

  // Vocabulary Management
  getGrammarVocabularyProvider(): IGrammarVocabularyProvider {
    return this.worldModel.getGrammarVocabularyProvider();
  }

  // ========== Author-Only Convenience Methods ==========

  /**
   * Move multiple entities to a container in one operation.
   */
  populate(containerId: string, entityIds: string[]): void {
    for (const entityId of entityIds) {
      this.moveEntity(entityId, containerId);
    }
  }

  /**
   * Add a trait to an entity.
   */
  addTrait(entityId: string, trait: ITrait): void {
    const entity = this.dataStore.entities.get(entityId);
    if (entity) {
      entity.add(trait);
    }
  }

  /**
   * Remove a trait from an entity.
   */
  removeTrait(entityId: string, traitType: TraitType): void {
    const entity = this.dataStore.entities.get(entityId);
    if (entity) {
      entity.remove(traitType);
    }
  }

  // ========== Private Helpers ==========

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
}
