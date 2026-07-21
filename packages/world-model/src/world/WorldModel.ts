// WorldModel.ts - Core world model interface and implementation for Sharpee IF Platform

import { IFEntity } from '../entities/if-entity.js';
import { EntityType, isEntityType } from '../entities/entity-types.js';
import { WallEntity, IWallSpec, IWallsSpec } from '../entities/wall-entity.js';
import { createWall as createWallImpl, createWalls as createWallsImpl } from './wall-creation.js';
import { TraitType } from '../traits/trait-types.js';
import { RoomTrait } from '../traits/room/index.js';
import { RoomBehavior } from '../traits/room/roomBehavior.js';
import { RegionTrait, IRegionData } from '../traits/region/regionTrait.js';
import { SceneTrait } from '../traits/scene/sceneTrait.js';
import { DoorTrait } from '../traits/door/index.js';
import { SceneryTrait } from '../traits/scenery/index.js';
import { DEFAULT_TRAITS } from './default-trait-registry.js';
import { IdentityTrait } from '../traits/identity/identityTrait.js';
import { OpenableTrait } from '../traits/openable/openableTrait.js';
import { LockableTrait } from '../traits/lockable/lockableTrait.js';
import { WearableBehavior } from '../traits/wearable/wearableBehavior.js';
import { ExitTrait } from '../traits/exit/exitTrait.js';
import { DirectionType, getOppositeDirection } from '../constants/directions.js';
import { ISemanticEvent, ISemanticEventSource } from '@sharpee/core';
import { SpatialIndex } from './SpatialIndex.js';
import { VisibilityBehavior } from './VisibilityBehavior.js';
import { WorldSerializer } from './WorldSerializer.js';
import { IDataStore } from './AuthorModel.js';
import { canContain } from '../traits/container/container-utils.js';
import {
  ICapabilityStore,
  ICapabilityData,
  ICapabilitySchema,
  ICapabilityRegistration
} from './capabilities.js';
import { ITrait, ITraitConstructor } from '../traits/trait.js';
import type { CapabilityBehavior } from '../capabilities/capability-behavior.js';
import type {
  TraitBehaviorBinding,
  BehaviorRegistrationOptions
} from '../capabilities/capability-binding.js';
import { capabilityBindingKey } from '../capabilities/capability-binding.js';
import type { ActionInterceptor } from '../capabilities/action-interceptor.js';
import type {
  TraitInterceptorBinding,
  InterceptorRegistrationOptions,
  InterceptorLookupResult
} from '../capabilities/interceptor-binding.js';
import { interceptorBindingKey } from '../capabilities/interceptor-binding.js';
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
import { ScopeRegistry } from '../scope/scope-registry.js';
import { RuleScopeEvaluator } from '../scope/scope-evaluator.js';
import { IScopeRule, IScopeContext } from '../scope/scope-rule.js';

// Event system — extracted to WorldEventSystem.ts, re-exported for backward compat
import {
  WorldEventSystem,
  EventHandler,
  EventValidator,
  EventPreviewer,
  EventChainHandler,
  ChainEventOptions,
} from './WorldEventSystem.js';
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

// Scene management (ADR-149, ADR-186)

/**
 * Context passed to a scene reaction callback (ADR-186). Carries the typed
 * data a callback needs to react to a scene transition — no `any` on the
 * author path.
 */
export interface SceneEventContext {
  /** The world model, for querying state in the reaction. */
  world: IWorldModel;
  /** The scene entity's id. */
  sceneId: string;
  /** The scene's human-readable name. */
  sceneName: string;
  /** The turn number on which the transition occurred. */
  turn: number;
  /** Turns the scene was active. Present only for onEnd. */
  totalTurns?: number;
}

/**
 * A player-visible reaction returned by a scene callback (ADR-186). Either
 * direct story-owned prose (`text`) or a lang-routed message (`messageId`).
 */
export type SceneReaction =
  | { text: string }
  | { messageId: string; params?: Record<string, unknown> };

/**
 * A scene reaction callback (ADR-186). Invoked by SceneEvaluationPlugin at
 * the begin/end transition. Returning nothing is valid (a state-only beat).
 */
export type SceneCallback =
  (ctx: SceneEventContext) => SceneReaction[] | SceneReaction | void;

export interface SceneOptions {
  /** Human-readable scene name. */
  name: string;
  /** Returns true when the scene should begin. Evaluated each turn when state is 'waiting'. */
  begin: (world: IWorldModel) => boolean;
  /** Returns true when the scene should end. Evaluated each turn when state is 'active'. */
  end: (world: IWorldModel) => boolean;
  /** Whether the scene can activate more than once. Default: false. */
  recurring?: boolean;
  /** Optional reaction invoked when the scene begins (ADR-186). */
  onBegin?: SceneCallback;
  /** Optional reaction invoked when the scene ends (ADR-186). */
  onEnd?: SceneCallback;
}

/** Stored condition closures for a scene (not serializable). */
export interface SceneConditions {
  begin: (world: IWorldModel) => boolean;
  end: (world: IWorldModel) => boolean;
  /** Optional reaction invoked when the scene begins (ADR-186). */
  onBegin?: SceneCallback;
  /** Optional reaction invoked when the scene ends (ADR-186). */
  onEnd?: SceneCallback;
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
import { ScoreLedger, ScoreEntry } from './ScoreLedger.js';
export { ScoreEntry } from './ScoreLedger.js';

/**
 * Pre-removal observer (ADR-213 §1).
 *
 * Invoked synchronously inside `removeEntity`, exactly once per SUCCESSFUL
 * removal, BEFORE any mutation — the entity is still live and fully queryable,
 * and `lastRoomId` is its containing room at that moment (`null` for a
 * locationless entity). Observers cannot veto (removal is already decided —
 * this is a fact notification); a throwing observer is logged and neither
 * aborts the removal nor starves later observers. Never fired on orphaning
 * (`moveEntity(id, null)`) or on a failed removal (unknown id).
 *
 * Registration is in-memory and ordered; nothing is serialized — callers
 * re-register every story load (the ADR-211/ADR-212 registry lifecycle).
 *
 * @param entity - The live entity about to be removed.
 * @param lastRoomId - Its containing room id at removal time, or `null`.
 */
export type EntityRemovalObserver = (entity: IFEntity, lastRoomId: string | null) => void;

// Interface and class with same name in same file - TypeScript standard pattern
export interface IWorldModel {
  // Get the data store for sharing with AuthorModel
  getDataStore(): IDataStore;

  // Capability Management (ADR-129 data capabilities — scoring, save-blob
  // fields, etc. Distinct from the ADR-090/ADR-207 capability-behavior
  // binding map below; both are named "capability" for historical reasons.)
  /**
   * Register a data capability. THREE RULES (2026-07-02, regression
   * findings P6):
   *
   * 1. **Register-once.** If `name` is already registered this is a no-op
   *    (strict mode: throws) — data is never reset or merged by
   *    re-registration.
   * 2. **`initialData` is DEEP-copied.** The stored data object is built
   *    from schema defaults + a deep copy of `initialData`; mutating the
   *    object you passed in afterward changes nothing. Capability data must
   *    be plain serializable values — it lands in the save blob (never store
   *    service/class instances here).
   * 3. **Mutate via the returned/live object or `updateCapability`.** The
   *    return value IS the live stored data object (also what
   *    `getCapability` returns) — mutating it persists.
   *
   * @returns The live stored data object (the existing one when `name` was
   *   already registered).
   */
  registerCapability(name: string, registration?: Partial<ICapabilityRegistration>): ICapabilityData;
  /** Merge `data` into the capability's stored data. No-op (strict: throws) when unregistered. */
  updateCapability(name: string, data: Partial<ICapabilityData>): void;
  /** Returns the LIVE stored data object (not a copy) — mutations persist. */
  getCapability(name: string): ICapabilityData | undefined;
  hasCapability(name: string): boolean;

  // Capability-Behavior Binding Management (ADR-090 dispatch, ADR-207 ownership)
  /**
   * Register a behavior for a (traitType, capability) binding on this world.
   *
   * Idempotent: re-registering the same (traitType, capability) key
   * overwrites the previous binding (last-registration-wins) rather than
   * throwing. Scoped to this `WorldModel` instance only — two worlds may
   * bind the same key to different behaviors.
   *
   * @param traitType - The trait type identifier (e.g. a trait's static `type`)
   * @param capability - The action ID (capability) this binding handles
   * @param behavior - The stateless behavior definition to bind
   * @param options - Optional priority/resolution/mode overrides (ADR-090)
   */
  registerCapabilityBehavior<T extends ITrait = ITrait>(
    traitType: string,
    capability: string,
    behavior: CapabilityBehavior,
    options?: BehaviorRegistrationOptions<T>
  ): void;

  // Evaluator Registry (ADR-240 — live derived state)
  /**
   * Register a named world-evaluator on this world. Read points consult
   * evaluators at the moment of use ("mutations are instant; anything
   * checking state gets the most current results") — nothing is cached,
   * so nothing can go stale. Key conventions are owned by each read
   * point's module (e.g. `dark.<roomId>`, `exit.blocked.<roomId>.<dir>`).
   *
   * Idempotent: re-registering a key overwrites the previous evaluator
   * (last-registration-wins). Scoped to this world instance only.
   *
   * @param key - Namespaced evaluator key (built by the read point's exported key builder)
   * @param fn - Evaluated against the live world at every consult
   */
  registerEvaluator(key: string, fn: (world: IWorldModel) => unknown): void;
  /**
   * Evaluate the named registered evaluator against the live world.
   *
   * @param key - The evaluator key
   * @returns The evaluator's result, or `undefined` when nothing is
   *   registered under the key (the caller's signal to fall through to
   *   its static behavior)
   */
  evaluate(key: string): unknown;
  /**
   * Resolve the behavior bound to a trait instance's capability on this world.
   *
   * @param trait - The trait instance claiming the capability
   * @param capability - The action ID (capability) to resolve
   * @returns The bound behavior, or `undefined` if this world has no binding
   *   for the trait's type + capability (the caller's normal "can't do that"
   *   rejection path handles this — never throws for a missing binding).
   */
  getBehaviorForCapability(trait: ITrait, capability: string): CapabilityBehavior | undefined;
  /**
   * Resolve the full binding (behavior + priority/resolution/mode overrides)
   * for a (traitType, capability) pair on this world.
   *
   * @param traitType - The trait type identifier
   * @param capability - The action ID (capability) to resolve
   * @returns The binding, or `undefined` if none is registered on this world
   */
  getBehaviorBinding(traitType: string, capability: string): TraitBehaviorBinding | undefined;
  /**
   * Enumerate every capability-behavior binding registered on this world,
   * keyed by `traitType:capability` (see `capabilityBindingKey`).
   *
   * Read-only introspection surface (IDE/debug summaries) — register through
   * `registerCapabilityBehavior`, never by mutating the returned map.
   *
   * @returns The world's binding map as a read-only view
   */
  getAllCapabilityBindings(): ReadonlyMap<string, TraitBehaviorBinding>;

  // Action-Interceptor Binding Management (ADR-118 hooks, ADR-208 ownership —
  // a third, distinct "wiring" surface: not ADR-129 data capabilities, not
  // the ADR-090/207 capability-behavior bindings above.)
  /**
   * Register an interceptor for a (traitType, actionId) binding on this world.
   *
   * Idempotent: re-registering the same (traitType, actionId) key overwrites
   * the previous binding (last-registration-wins) rather than throwing.
   * Scoped to this `WorldModel` instance only — two worlds may bind the same
   * key to different interceptors.
   *
   * @param traitType - The trait type identifier (e.g. a trait's static `type`)
   * @param actionId - The action ID this interceptor hooks (e.g. 'if.action.taking')
   * @param interceptor - The stateless interceptor definition to bind (ADR-118)
   * @param options - Optional priority override (higher = checked first)
   */
  registerActionInterceptor(
    traitType: string,
    actionId: string,
    interceptor: ActionInterceptor,
    options?: InterceptorRegistrationOptions
  ): void;
  /**
   * Resolve the interceptor for an entity + action on this world.
   *
   * Scans the entity's traits for interceptor bindings registered for the
   * action and returns the highest-priority match (ADR-118 resolution).
   *
   * @param entity - The entity whose traits are checked
   * @param actionId - The action ID to resolve
   * @returns The interceptor, its declaring trait, and the binding — or
   *   `undefined` if this world has no binding for any of the entity's
   *   traits + action (the standard action proceeds unintercepted — never
   *   throws for a missing binding).
   */
  getInterceptorForAction(
    entity: { traits: Map<string, ITrait> },
    actionId: string
  ): InterceptorLookupResult | undefined;
  /**
   * Resolve the full binding (interceptor + priority) for a
   * (traitType, actionId) pair on this world.
   *
   * @param traitType - The trait type identifier
   * @param actionId - The action ID
   * @returns The binding, or `undefined` if none is registered on this world
   */
  getInterceptorBinding(traitType: string, actionId: string): TraitInterceptorBinding | undefined;
  /**
   * Enumerate every action-interceptor binding registered on this world,
   * keyed by `traitType:actionId` (see `interceptorBindingKey`).
   *
   * Read-only introspection surface (IDE/debug summaries) — register through
   * `registerActionInterceptor`, never by mutating the returned map.
   *
   * @returns The world's binding map as a read-only view
   */
  getAllActionInterceptors(): ReadonlyMap<string, TraitInterceptorBinding>;

  // Entity Management
  createEntity(displayName: string, type?: string, opts?: { defaultTraits?: boolean }): IFEntity;
  getEntity(id: string): IFEntity | undefined;
  hasEntity(id: string): boolean;
  removeEntity(id: string): boolean;
  /**
   * Register a pre-removal observer (ADR-213 §1). See
   * {@link EntityRemovalObserver} for the invocation contract.
   *
   * @param observer - Appended to the in-memory observer list (registration order).
   */
  onEntityRemoved(observer: EntityRemovalObserver): void;
  getAllEntities(): IFEntity[];
  updateEntity(entityId: string, updater: (entity: IFEntity) => void): void;

  // Spatial Management
  getLocation(entityId: string): string | undefined;
  getContents(containerId: string, options?: ContentsOptions): IFEntity[];
  moveEntity(entityId: string, targetId: string | null): boolean;
  canMoveEntity(entityId: string, targetId: string | null): boolean;
  getContainingRoom(entityId: string): IFEntity | undefined;
  getAllContents(entityId: string, options?: ContentsOptions): IFEntity[];
  /** ADR-247: partition a holder's direct contents into held-not-worn and worn. */
  getCarriedAndWorn(holderId: string): { carried: IFEntity[]; worn: IFEntity[] };

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
  connectRooms(room1Id: string, room2Id: string, direction: DirectionType, doorId?: string): void;
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

  // Wall Adjacency (ADR-173)
  createWall(spec: IWallSpec): WallEntity;
  createWalls(spec: IWallsSpec): WallEntity[];

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
  'wall': 'w',
  'object': 'o'  // default
};

export class WorldModel implements IWorldModel {
  private entities: Map<string, IFEntity> = new Map();
  /** Pre-removal observers (ADR-213 §1) — registration order, never serialized. */
  private removalObservers: EntityRemovalObserver[] = [];
  private state: WorldState = {};
  private playerId: string | undefined;
  private spatialIndex: SpatialIndex;
  private config: WorldConfig;
  private capabilities: ICapabilityStore = {};

  // Capability-behavior binding map (ADR-090 dispatch, ADR-207 ownership).
  // Per-world, in-memory only — not serialized (see AC-9: bindings are code
  // wiring re-established by story init, not save-game state). Not to be
  // confused with `capabilities` above (ADR-129 data capabilities — a
  // different, unrelated "capability" concept).
  private capabilityBindings: Map<string, TraitBehaviorBinding> = new Map();

  // Action-interceptor binding map (ADR-118 hooks, ADR-208 ownership).
  // Per-world, in-memory only — not serialized (AC-9: bindings are code
  // wiring re-established by story init, not save-game state). Distinct
  // from both maps above despite the shared "wiring" flavor.
  private interceptorBindings: Map<string, TraitInterceptorBinding> = new Map();

  /**
   * ADR-240: the per-world evaluator registry — named world-evaluators
   * consulted at point of use (live derived state; no cached derivations).
   * Lives and dies with this WorldModel instance, like the binding maps.
   */
  private evaluators: Map<string, (world: IWorldModel) => unknown> = new Map();

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
  registerCapability(name: string, registration: Partial<ICapabilityRegistration> = {}): ICapabilityData {
    if (this.capabilities[name]) {
      if (this.config.strictMode) {
        throw new Error(`Capability '${name}' is already registered`);
      }
      // Register-once: return the EXISTING live data object so
      // register-then-mutate is correct in both branches.
      return this.capabilities[name].data;
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

    // Override with a DEEP copy of the provided initial data — capability
    // data must be plain serializable values (it lands in the save blob),
    // and a shallow copy gave nesting-depth-dependent semantics: top-level
    // fields detached from the caller's object while nested objects stayed
    // shared (regression findings P6, Trap A′). structuredClone throws on
    // functions/class instances, which is the honest failure for data that
    // could never serialize anyway.
    if (registration.initialData) {
      Object.assign(initialData, structuredClone(registration.initialData));
    }

    this.capabilities[name] = {
      data: initialData,
      schema: registration.schema
    };

    // Return the LIVE stored object — mutations to it persist (it is the
    // same object getCapability returns).
    return initialData;
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

  // Capability-Behavior Binding Management (ADR-090 dispatch, ADR-207 ownership)
  //
  // The binding map lives on this WorldModel instance — created with the
  // world, garbage-collected with it, never shared across games (AC-1, AC-2).
  // Registration is idempotent: re-registering a (traitType, capability) key
  // overwrites the previous binding rather than throwing (AC-4).

  registerCapabilityBehavior<T extends ITrait = ITrait>(
    traitType: string,
    capability: string,
    behavior: CapabilityBehavior,
    options?: BehaviorRegistrationOptions<T>
  ): void {
    const key = capabilityBindingKey(traitType, capability);
    this.capabilityBindings.set(key, {
      traitType,
      capability,
      behavior,
      priority: options?.priority ?? 0,
      resolution: options?.resolution,
      mode: options?.mode,
      validateBinding: options?.validateBinding as ((trait: ITrait) => boolean) | undefined
    });
  }

  // Evaluator Registry (ADR-240 — live derived state). Same ownership model
  // as the binding maps above: per-world, idempotent last-wins, never
  // serialized (registrars re-register on every load).

  registerEvaluator(key: string, fn: (world: IWorldModel) => unknown): void {
    this.evaluators.set(key, fn);
  }

  evaluate(key: string): unknown {
    const fn = this.evaluators.get(key);
    return fn ? fn(this) : undefined;
  }

  getBehaviorBinding(traitType: string, capability: string): TraitBehaviorBinding | undefined {
    return this.capabilityBindings.get(capabilityBindingKey(traitType, capability));
  }

  getAllCapabilityBindings(): ReadonlyMap<string, TraitBehaviorBinding> {
    return this.capabilityBindings;
  }

  getBehaviorForCapability(trait: ITrait, capability: string): CapabilityBehavior | undefined {
    const traitType = (trait.constructor as ITraitConstructor).type;
    const binding = this.getBehaviorBinding(traitType, capability);

    // No binding registered on this world for this trait+capability — the
    // caller's normal rejection path handles this (AC-10). Never throw for
    // an absent binding; a trait can statically declare a capability without
    // this particular world having wired up a behavior for it.
    if (!binding) {
      return undefined;
    }

    if (binding.validateBinding && !binding.validateBinding(trait)) {
      throw new Error(
        `Behavior validation failed for trait "${traitType}", capability "${capability}"`
      );
    }

    return binding.behavior;
  }

  // Action-Interceptor Binding Management (ADR-118 hooks, ADR-208 ownership)
  //
  // The binding map lives on this WorldModel instance — created with the
  // world, garbage-collected with it, never shared across games (AC-1, AC-2).
  // Registration is idempotent: re-registering a (traitType, actionId) key
  // overwrites the previous binding rather than throwing (AC-4).

  registerActionInterceptor(
    traitType: string,
    actionId: string,
    interceptor: ActionInterceptor,
    options?: InterceptorRegistrationOptions
  ): void {
    const key = interceptorBindingKey(traitType, actionId);
    this.interceptorBindings.set(key, {
      traitType,
      actionId,
      interceptor,
      priority: options?.priority ?? 0
    });
  }

  getInterceptorForAction(
    entity: { traits: Map<string, ITrait> },
    actionId: string
  ): InterceptorLookupResult | undefined {
    // Find all traits on the entity that have an interceptor bound for this
    // action on this world (lookup by trait type string — more reliable than
    // a static constructor property across module copies).
    const candidates: Array<{ trait: ITrait; binding: TraitInterceptorBinding }> = [];

    for (const trait of entity.traits.values()) {
      const binding = this.interceptorBindings.get(
        interceptorBindingKey(trait.type, actionId)
      );
      if (binding) {
        candidates.push({ trait, binding });
      }
    }

    // No binding on this world for any of the entity's traits — the standard
    // action proceeds unintercepted (AC-10). Never throw for a missing binding.
    if (candidates.length === 0) {
      return undefined;
    }

    // Highest priority wins (ADR-118 resolution semantics, unchanged).
    candidates.sort((a, b) => b.binding.priority - a.binding.priority);

    const { trait, binding } = candidates[0];
    return {
      interceptor: binding.interceptor,
      trait,
      binding
    };
  }

  getInterceptorBinding(traitType: string, actionId: string): TraitInterceptorBinding | undefined {
    return this.interceptorBindings.get(interceptorBindingKey(traitType, actionId));
  }

  getAllActionInterceptors(): ReadonlyMap<string, TraitInterceptorBinding> {
    return this.interceptorBindings;
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
  createEntity(displayName: string, type: string = 'object', opts?: { defaultTraits?: boolean }): IFEntity {
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

    // ADR-189: give the entity its type's default traits (e.g. SCENERY -> SceneryTrait)
    // unless the caller opts out. Each factory yields a fresh instance; an author can
    // override later via add() (replace-on-same-type).
    if (opts?.defaultTraits !== false) {
      const factories = DEFAULT_TRAITS.get(type);
      if (factories) {
        for (const factory of factories) {
          entity.add(factory());
        }
      }
    }

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

    // ADR-213 §1: capture the containing room and notify observers BEFORE the
    // first real mutation (spatialIndex.remove clears the parent pointer, so
    // the room is unrecoverable afterward). Observers see the live entity and
    // cannot veto; one observer's exception is logged and neither aborts the
    // removal nor stops the remaining observers (AC-5).
    const lastRoomId = this.getContainingRoom(id)?.id ?? null;
    for (const observer of this.removalObservers) {
      try {
        observer(entity, lastRoomId);
      } catch (error) {
        console.error(`onEntityRemoved observer threw during removeEntity('${id}'):`, error);
      }
    }

    // Remove from spatial index
    this.spatialIndex.remove(id);

    // Remove from any containers
    // NOTE (ADR-213 investigation, 2026-07-14): dead branch — spatialIndex
    // .remove() above already cleared the parent pointer, so getLocation(id)
    // is always undefined here. Left as-is deliberately (flagged, not
    // silently removed).
    const location = this.getLocation(id);
    if (location) {
      this.moveEntity(id, null);
    }

    // Remove entity
    return this.entities.delete(id);
  }

  /**
   * Register a pre-removal observer (ADR-213 §1).
   *
   * Observers run synchronously inside `removeEntity`, in registration order,
   * once per successful removal, before any mutation — never on orphaning
   * (`moveEntity(id, null)`) and never on a failed removal. In-memory only;
   * nothing is serialized, so callers re-register every story load.
   *
   * @param observer - The observer to append.
   */
  onEntityRemoved(observer: EntityRemovalObserver): void {
    this.removalObservers.push(observer);
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

    // ADR-247: worn items are contents — returned unconditionally. Callers
    // needing the carried/worn split use getCarriedAndWorn(), not a filter.
    return entities;
  }

  getCarriedAndWorn(holderId: string): { carried: IFEntity[]; worn: IFEntity[] } {
    // ADR-247: the one partition method. `carried` is held-not-worn (the
    // old filtered-default semantics); `worn` is the worn subset. For a
    // holder with no wearables, `worn` is empty.
    const carried: IFEntity[] = [];
    const worn: IFEntity[] = [];
    for (const e of this.getContents(holderId)) {
      (WearableBehavior.isWorn(e) ? worn : carried).push(e);
    }
    return { carried, worn };
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

      // ADR-247: worn items are always included now, so root and recursive
      // calls share one options shape (visibleOnly still varies by caller).
      const contents = this.getContents(id, { visibleOnly: options.visibleOnly });
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

    // A door is present at BOTH of its rooms (ADR-234 AC-3; David's ruling
    // 2026-07-18): referenceable from either side. Only the door enters
    // scope this way — the far room and its contents never do.
    this.addScopeRule({
      id: 'default_door_visibility',
      fromLocations: '*',
      includeEntities: (context) =>
        this.findByTrait(TraitType.DOOR)
          .filter((door) => {
            const doorTrait = door.get(TraitType.DOOR) as DoorTrait | undefined;
            return doorTrait !== undefined
              && (doorTrait.room1 === context.currentLocation || doorTrait.room2 === context.currentLocation);
          })
          .map((door) => door.id),
      priority: 50,
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
   *
   * With `doorId` (ADR-237 D4) this is the platform's one door-wiring
   * implementation: the door id is stamped on both exits (`via`) and the
   * door entity is placed in room1 for scope resolution. Throws if the id
   * resolves to no entity or to an entity without DoorTrait, or if the
   * trait's room pair disagrees with the rooms passed — the primitive owns
   * the invariant that DoorTrait and the exits never disagree.
   */
  connectRooms(room1Id: string, room2Id: string, direction: DirectionType, doorId?: string): void {
    const room1 = this.getEntity(room1Id);
    const room2 = this.getEntity(room2Id);
    if (!room1 || !room2) {
      throw new Error(`connectRooms: both rooms must exist (${room1Id}, ${room2Id})`);
    }

    const opposite = getOppositeDirection(direction);

    if (doorId === undefined) {
      RoomBehavior.setExit(room1, direction, room2Id);
      RoomBehavior.setExit(room2, opposite, room1Id);
      return;
    }

    const door = this.getEntity(doorId);
    if (!door) {
      throw new Error(`connectRooms: door must exist (${doorId})`);
    }
    const doorTrait = door.get(TraitType.DOOR) as DoorTrait | undefined;
    if (!doorTrait) {
      throw new Error(`connectRooms: \`${doorId}\` has no DoorTrait — compose the trait before wiring`);
    }
    // DoorTrait's constructor requires both rooms, so the pair is always
    // pre-set: verify it names the rooms being wired (room1 = placement).
    if (doorTrait.room1 !== room1Id || doorTrait.room2 !== room2Id) {
      throw new Error(
        `connectRooms: DoorTrait on \`${doorId}\` connects (${doorTrait.room1}, ${doorTrait.room2}), not (${room1Id}, ${room2Id})`
      );
    }

    RoomBehavior.setExit(room1, direction, room2Id, doorId);
    RoomBehavior.setExit(room2, opposite, room1Id, doorId);

    // Place door in room1 for scope resolution
    this.moveEntity(doorId, room1Id);
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
        ...(opts.keyId ? { keyId: opts.keyId } : {}),
      }));
    }

    // One wiring path (ADR-237 D4)
    this.connectRooms(opts.room1Id, opts.room2Id, opts.direction, door.id);

    return door;
  }

  // ── Wall Adjacency (ADR-173) ─────────────────────────────────────

  /**
   * Creates a single wall between exactly two distinct rooms.
   * Validates cardinality, per-side adjective presence, per-room
   * adjective uniqueness, and `obstructedBy` resolution before
   * registering the wall and updating both rooms' `walls` collections.
   *
   * @throws Error on any validation failure (per ADR-173 §"Rejection rules").
   */
  createWall(spec: IWallSpec): WallEntity {
    return createWallImpl(this.wallCreationSurface(), spec);
  }

  /**
   * Creates N walls between `from` and each room in `to` (ADR-173
   * §Authoring API). Each wall is independently validated; a failure
   * on the K-th pair leaves walls 0..K-1 in the world.
   */
  createWalls(spec: IWallsSpec): WallEntity[] {
    return createWallsImpl(this.wallCreationSurface(), spec);
  }

  /**
   * Adapter exposing the narrow surface `wall-creation` requires
   * without coupling it to the full `WorldModel` API.
   */
  private wallCreationSurface() {
    return {
      getEntity: (id: string) => this.getEntity(id),
      getLocation: (entityId: string) => this.getLocation(entityId),
      generateWallId: () => this.generateId(EntityType.WALL),
      registerWall: (wall: WallEntity) => {
        this.entities.set(wall.id, wall);
      },
    };
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

    // Store condition closures separately (not serializable). Reaction
    // callbacks (ADR-186) ride alongside the conditions so the engine's
    // SceneEvaluationPlugin can reach them via getAllSceneConditions().
    this.sceneConditions.set(id, {
      begin: options.begin,
      end: options.end,
      onBegin: options.onBegin,
      onEnd: options.onEnd,
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
