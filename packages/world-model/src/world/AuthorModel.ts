/**
 * The author's view of the live world: unrestricted access for world
 * construction and setup. Creating an entity and moving it bypass the
 * validation the runtime applies, so a closed container can be filled at
 * load; a move is always allowed; three helpers make setup terse. Everything
 * else is the live WorldModel itself. The view is a Proxy over that one
 * instance, so a registration made through the view (a capability, an
 * interceptor, an event handler) lands where the engine reads it, and a new
 * world method reaches the view with no edit here.
 *
 * Why a Proxy and not Object.create(world) with a few overrides: a world
 * method that writes `this.field` would land the field on the derived object
 * and shadow the world's own on the next read. The proxy binds every method
 * to the world, so a write reaches the one instance. A bound method is
 * cached per member per view; a non-function member is read through live, so
 * the view never holds a copy of world state.
 *
 * Public interface: AuthorModel (the type, and a constructor taking the
 *   shared data store and the world so `new AuthorModel(store, world)` stays
 *   a working spelling), createAuthorModel, AuthorHelpers, IDataStore,
 *   IItemSpec.
 * Owner context: packages/world-model — world.
 *
 * References:
 *   ADR-016 — the author model bypasses rules during setup, emitting no events.
 *   ADR-338 D1 — a view of the live world, not a copy of its surface.
 *   docs/work/refactoring-survey/assessment-20260907-umbrella.md — the cached bind, and canMoveEntity kept.
 */

import { IFEntity } from '../entities/if-entity.js';
import type { SpatialIndex } from './SpatialIndex.js';
import type { ITrait } from '../traits/trait.js';
import type { TraitType } from '../traits/trait-types.js';
import type { ICapabilityStore } from './capabilities.js';
import type { WorldModel, IWorldModel } from './WorldModel.js';

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

/** The three setup conveniences the author's view adds to the world. */
export interface AuthorHelpers {
  /** Move multiple entities to a container in one operation. */
  populate(containerId: string, entityIds: string[]): void;
  /** Add a trait to an entity. */
  addTrait(entityId: string, trait: ITrait): void;
  /** Remove a trait from an entity. */
  removeTrait(entityId: string, traitType: TraitType): void;
}

/** The author's view: the live world plus the author helpers. */
export type AuthorModel = WorldModel & AuthorHelpers;

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

/**
 * Create the author's view of a world.
 *
 * @param worldModel - The live world; the view forwards to this one instance
 * @returns A Proxy over the world carrying the two bypasses and the three helpers
 */
export function createAuthorModel(worldModel: IWorldModel): AuthorModel {
  const world = worldModel as WorldModel;
  const dataStore = world.getDataStore();

  function generateId(type: string): string {
    const prefix = TYPE_PREFIXES[type] || TYPE_PREFIXES['object'];
    const counter = dataStore.idCounters.get(prefix) || 0;
    const nextCounter = counter + 1;

    if (nextCounter > 1295) {
      throw new Error(`ID overflow for type '${type}' (prefix '${prefix}')`);
    }

    dataStore.idCounters.set(prefix, nextCounter);
    const base36 = nextCounter.toString(36).padStart(2, '0');
    return `${prefix}${base36}`;
  }

  /**
   * Create a new entity without validation.
   *
   * @param name - Display name for the entity
   * @param type - Entity type (room, item, actor, etc.)
   * @returns The created entity
   */
  function createEntity(name: string, type: string = 'object'): IFEntity {
    const id = generateId(type);
    const entity = new IFEntity(id, type, {
      attributes: {
        displayName: name,
        name: name,
        entityType: type
      }
    });

    dataStore.entities.set(id, entity);
    return entity;
  }

  /**
   * Move an entity without validation. Can move into closed/locked containers.
   *
   * @param entityId - ID of entity to move
   * @param targetId - ID of target location (null to remove from world)
   * @returns Always true (no validation to fail)
   */
  function moveEntity(entityId: string, targetId: string | null): boolean {
    const currentLocation = dataStore.spatialIndex.getParent(entityId);
    if (currentLocation) {
      dataStore.spatialIndex.removeChild(currentLocation, entityId);
    }

    if (targetId !== null) {
      dataStore.spatialIndex.addChild(targetId, entityId);
    }

    return true;
  }

  /** The author's view always allows a move; a placement never fails. */
  function canMoveEntity(_entityId: string, _targetId: string | null): boolean {
    return true;
  }

  const helpers: AuthorHelpers = {
    populate(containerId: string, entityIds: string[]): void {
      for (const entityId of entityIds) {
        moveEntity(entityId, containerId);
      }
    },
    addTrait(entityId: string, trait: ITrait): void {
      const entity = dataStore.entities.get(entityId);
      if (entity) {
        entity.add(trait);
      }
    },
    removeTrait(entityId: string, traitType: TraitType): void {
      const entity = dataStore.entities.get(entityId);
      if (entity) {
        entity.remove(traitType);
      }
    },
  };

  const overrides: Record<string, unknown> = Object.assign(Object.create(null), helpers, {
    createEntity,
    moveEntity,
    canMoveEntity,
  });

  const bound = new Map<PropertyKey, unknown>();
  return new Proxy(world, {
    get(target, key) {
      if (typeof key === 'string' && key in overrides) return overrides[key];
      const hit = bound.get(key);
      if (hit !== undefined) return hit;
      const value = Reflect.get(target, key, target);
      if (typeof value !== 'function') return value;
      const member = (value as (...args: unknown[]) => unknown).bind(target);
      bound.set(key, member);
      return member;
    },
  }) as AuthorModel;
}

/**
 * The constructor spelling: `new AuthorModel(world.getDataStore(), world)`
 * returns the same view createAuthorModel returns. The data store argument is
 * accepted for the callers that pass it and is not read; the view takes the
 * live store from the world.
 */
export const AuthorModel = function AuthorModel(
  this: unknown,
  _dataStore: IDataStore,
  worldModel: IWorldModel,
): AuthorModel {
  return createAuthorModel(worldModel);
} as unknown as { new (dataStore: IDataStore, worldModel: IWorldModel): AuthorModel };
