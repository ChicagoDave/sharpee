/**
 * IWorldModel augmentation — adds EntityQuery entry points via declaration merging.
 *
 * Importing this module patches WorldModel.prototype with getter properties
 * and methods that return EntityQuery instances. This activates the fluent
 * query API on any WorldModel instance (including through IWorldModel references).
 *
 * Entry points: entities, rooms, actors, objects, scenes, regions,
 * contents(), allContents(), having(), visible(), inScope()
 *
 * Owner context: @sharpee/queries (ADR-150)
 */

import { WorldModel, IWorldModel, EntityType, IFEntity, TraitType } from '@sharpee/world-model';
import type { ContentsOptions } from '@sharpee/if-domain';
import { EntityQuery } from './entity-query';

// ---------------------------------------------------------------------------
// ADR-149 forward declarations
// ---------------------------------------------------------------------------

/**
 * Forward-declared entity type constants for Region and Scene.
 * These match the values ADR-149 will register. Until ADR-149 is
 * implemented, no entities of these types exist, so the corresponding
 * entry points return empty queries.
 */
const ENTITY_TYPE_REGION = 'region';
const ENTITY_TYPE_SCENE = 'scene';

// ---------------------------------------------------------------------------
// Declaration merging — augment both IWorldModel and WorldModel
// ---------------------------------------------------------------------------

// We augment both interfaces so that:
// - Code holding IWorldModel references sees the query methods (most story code)
// - WorldModel satisfies the structural check against IWorldModel (no TS errors
//   when passing WorldModel where IWorldModel is expected)
// The runtime implementation lives on WorldModel.prototype only — the IWorldModel
// declaration is purely for type visibility.

/** Query entry points added by @sharpee/queries. */
interface QueryEntryPoints {
  /** Query all entities in the world. */
  readonly all: EntityQuery;

  /** Query all rooms. */
  readonly rooms: EntityQuery;

  /** Query all actors. */
  readonly actors: EntityQuery;

  /** Query all objects (items, containers, supporters, scenery). */
  readonly objects: EntityQuery;

  /** Query all scenes (ADR-149). Returns empty query if no scenes exist. */
  readonly scenes: EntityQuery;

  /** Query all regions (ADR-149). Returns empty query if no regions exist. */
  readonly regions: EntityQuery;

  /** Query contents of a specific container/room. */
  contents(parentId: string, options?: ContentsOptions): EntityQuery;

  /** Query all contents recursively. */
  allContents(parentId: string, options?: ContentsOptions): EntityQuery;

  /** Query entities with a specific trait. */
  having(traitType: TraitType | string): EntityQuery;

  /** Query entities visible to an observer. */
  visible(observerId: string): EntityQuery;

  /** Query entities in interaction scope for an observer. */
  inScope(observerId: string): EntityQuery;
}

declare module '@sharpee/world-model' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IWorldModel extends QueryEntryPoints {}
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface WorldModel extends QueryEntryPoints {}
}

// ---------------------------------------------------------------------------
// Prototype patches
// ---------------------------------------------------------------------------

const proto = WorldModel.prototype as any;

// ── Readonly getters ─────────────────────────────────────────────────────

Object.defineProperty(proto, 'all', {
  get(this: IWorldModel): EntityQuery {
    return new EntityQuery(this.getAllEntities());
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(proto, 'rooms', {
  get(this: IWorldModel): EntityQuery {
    return new EntityQuery(this.findByType(EntityType.ROOM));
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(proto, 'actors', {
  get(this: IWorldModel): EntityQuery {
    return new EntityQuery(this.findByType(EntityType.ACTOR));
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(proto, 'objects', {
  get(this: IWorldModel): EntityQuery {
    // Objects = everything that isn't a room or actor
    return new EntityQuery(this.getAllEntities().filter(
      (e: IFEntity) => e.type !== EntityType.ROOM
        && e.type !== EntityType.ACTOR
        && e.type !== ENTITY_TYPE_REGION
        && e.type !== ENTITY_TYPE_SCENE,
    ));
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(proto, 'scenes', {
  get(this: IWorldModel): EntityQuery {
    return new EntityQuery(this.findByType(ENTITY_TYPE_SCENE));
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(proto, 'regions', {
  get(this: IWorldModel): EntityQuery {
    return new EntityQuery(this.findByType(ENTITY_TYPE_REGION));
  },
  enumerable: true,
  configurable: true,
});

// ── Methods ──────────────────────────────────────────────────────────────

proto.contents = function (this: IWorldModel, parentId: string, options?: ContentsOptions): EntityQuery {
  return new EntityQuery(this.getContents(parentId, options));
};

proto.allContents = function (this: IWorldModel, parentId: string, options?: ContentsOptions): EntityQuery {
  return new EntityQuery(this.getAllContents(parentId, options));
};

proto.having = function (this: IWorldModel, traitType: TraitType | string): EntityQuery {
  return new EntityQuery(this.findByTrait(traitType as TraitType));
};

proto.visible = function (this: IWorldModel, observerId: string): EntityQuery {
  return new EntityQuery(this.getVisible(observerId));
};

proto.inScope = function (this: IWorldModel, observerId: string): EntityQuery {
  return new EntityQuery(this.getInScope(observerId));
};

// Re-export EntityQuery so consumers get it from the augmentation import
export { EntityQuery } from './entity-query';
