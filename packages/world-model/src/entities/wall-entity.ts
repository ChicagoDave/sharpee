// packages/world-model/src/entities/wall-entity.ts

/**
 * Wall entity primitive (ADR-173).
 *
 * A wall is an IFEntity-derived entity expressing a physical adjacency
 * between exactly two distinct rooms. It carries whole-wall traits (the
 * entity's regular trait map — symmetric properties of the wall as a
 * physical object) and per-side data (asymmetric interface properties
 * keyed by the room id you encounter the wall from).
 *
 * Public interface: `IWallSideData`, `IWallSpec`, `WallEntity`. Authors
 * do not instantiate `WallEntity` directly — they use `WorldModel.createWall`,
 * which constructs the entity, runs validation, and maintains reciprocal
 * references on both rooms.
 *
 * Owner context: `@sharpee/world-model` — entities / spatial primitives.
 */

import { EntityId, IEntityCreationParams } from '@sharpee/core';
import { IFEntity } from './if-entity';
import { ITrait } from '../traits/trait';

/**
 * Per-side data for a wall (ADR-173).
 *
 * Keyed by the room id the player is in when looking at the wall.
 */
export interface IWallSideData {
  /**
   * The adjective the parser uses to disambiguate this wall from other
   * walls visible from the same room (e.g. 'oak', 'brick'). Required.
   * Must be unique within any single room across all walls visible
   * from that room.
   */
  adjective: string;

  /**
   * Optional per-side description, rendered when the player examines
   * the wall from this side.
   */
  description?: string;

  /**
   * Optional reference to an entity that obstructs capability access
   * to this side of the wall (e.g. a bookcase against the parlor side).
   * Per ADR-173, the obstructor's own traits declare which capabilities
   * it modifies (the "generalized obstructor protocol"). Must reference
   * an entity that exists and is located in the appropriate room at
   * world-load time; runtime evaluation re-checks the obstructor's
   * current location.
   */
  obstructedBy?: EntityId;
}

/**
 * Author-supplied specification for `WorldModel.createWall` (ADR-173).
 *
 * `between` is two distinct rooms (passed as either entities or ids).
 * `whole` carries traits applied to the wall as a single object —
 * symmetric properties (acoustic cost, structural material). `sides`
 * carries the per-side data, keyed by each room's id.
 */
export interface IWallSpec {
  between: [IFEntity | EntityId, IFEntity | EntityId];
  whole?: ITrait[];
  sides: Record<EntityId, IWallSideData>;
}

/**
 * Author-supplied specification for `WorldModel.createWalls` (ADR-173).
 *
 * Fans out into one wall entity per element of `to`. `sides` is a
 * function called once per pair to produce that side's data; the
 * caller is given the room id and may produce per-room-distinct
 * adjectives or descriptions.
 */
export interface IWallsSpec {
  from: IFEntity | EntityId;
  to: ReadonlyArray<IFEntity | EntityId>;
  whole?: ITrait[];
  sides: (roomId: EntityId) => IWallSideData;
}

/**
 * IFEntity subclass for walls. Adds the `between` relation and the
 * per-side data map. Whole-wall traits live on the entity's existing
 * trait map (`entity.add(trait)`); per-side state is held here because
 * it is keyed by room id rather than trait type.
 */
export class WallEntity extends IFEntity {
  /**
   * The two rooms this wall borders. Exactly two distinct room ids.
   * Invariant established by `WorldModel.createWall` and held for the
   * wall's lifetime — there is no API to mutate `between`.
   */
  readonly between: [EntityId, EntityId];

  /**
   * Per-side data keyed by room id. Always has exactly the two keys in
   * `between`; populated by `WorldModel.createWall`.
   */
  readonly sides: Map<EntityId, IWallSideData>;

  constructor(
    id: string,
    between: [EntityId, EntityId],
    params?: Partial<IEntityCreationParams>,
  ) {
    super(id, 'wall', params);
    this.between = between;
    this.sides = new Map();
  }

  /**
   * Returns the per-side data for the side facing `roomId`, or undefined
   * if `roomId` is not one of the wall's two rooms.
   */
  getSide(roomId: EntityId): IWallSideData | undefined {
    return this.sides.get(roomId);
  }

  /**
   * Returns the id of the room on the other side of the wall from
   * `roomId`, or undefined if `roomId` is not one of the wall's two
   * rooms.
   */
  otherRoom(roomId: EntityId): EntityId | undefined {
    if (roomId === this.between[0]) return this.between[1];
    if (roomId === this.between[1]) return this.between[0];
    return undefined;
  }
}

/**
 * `IWallEntity` is the structural shape consumers code against.
 * `WallEntity` is the concrete class produced by `WorldModel.createWall`.
 */
export type IWallEntity = WallEntity;
