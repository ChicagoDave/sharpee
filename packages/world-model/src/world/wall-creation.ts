// packages/world-model/src/world/wall-creation.ts

/**
 * Wall creation primitives (ADR-173).
 *
 * Implements the authoring API from ADR-173 §"Authoring API":
 * `createWall` (single wall between two rooms) and `createWalls`
 * (convenience helper that fans out into N walls between one room and
 * many destination rooms). Both APIs run wall-validation first, then
 * mutate the world to add the wall entity and update both rooms'
 * reciprocal `walls` collections.
 *
 * Public interface: `createWall`, `createWalls`. Both take a
 * `IWallCreationWorld` — a narrow surface of `WorldModel` exposing
 * only what wall creation needs, so mutation is bounded.
 *
 * Owner context: `@sharpee/world-model` — world / spatial primitives.
 */

import { EntityId } from '@sharpee/core';
import { IFEntity } from '../entities/if-entity.js';
import {
  WallEntity,
  IWallSpec,
  IWallsSpec,
  IWallSideData,
} from '../entities/wall-entity.js';
import { TraitType } from '../traits/trait-types.js';
import { RoomTrait } from '../traits/room/roomTrait.js';
import { ITrait } from '../traits/trait.js';
import { validateWallSpec } from './wall-validation.js';

/**
 * The narrow world surface required for wall creation. Implemented by
 * `WorldModel`; not part of the public IWorldModel interface.
 */
export interface IWallCreationWorld {
  getEntity(id: string): IFEntity | undefined;
  getLocation(entityId: string): string | undefined;
  generateWallId(): string;
  registerWall(wall: WallEntity): void;
}

function refToId(ref: IFEntity | EntityId): EntityId {
  return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Creates a single wall between exactly two distinct rooms (ADR-173).
 *
 * Validates the spec (cardinality, per-side adjectives, per-room
 * adjective uniqueness, obstructor resolution), builds a `WallEntity`
 * carrying any whole-wall traits and per-side data, registers it in
 * the world, and pushes its id into both rooms' `RoomTrait.walls`
 * collections.
 *
 * @throws Error on any validation failure (see `validateWallSpec`).
 */
export function createWall(
  world: IWallCreationWorld,
  spec: IWallSpec,
): WallEntity {
  const { roomAId, roomBId, roomA, roomB } = validateWallSpec(spec, world);

  const wallId = world.generateWallId();

  const wall = new WallEntity(wallId, [roomAId, roomBId], {
    attributes: {
      displayName: 'wall',
      name: 'wall',
      entityType: 'wall',
    },
  });

  if (spec.whole) {
    for (const trait of spec.whole) {
      wall.add(trait);
    }
  }

  wall.sides.set(roomAId, { ...spec.sides[roomAId] });
  wall.sides.set(roomBId, { ...spec.sides[roomBId] });

  // ADR-173 Phase 3 — make the wall reachable for parser/validator scope from
  // either connecting room. Walls have no spatial containment, so the default
  // scope rules (room contents + the room itself) do not include them. Numeric
  // 2 corresponds to ScopeLevel.VISIBLE (see if-entity.ts setMinimumScope).
  wall.setMinimumScope(2, [roomAId, roomBId]);

  world.registerWall(wall);

  pushWallId(roomA, wallId);
  pushWallId(roomB, wallId);

  return wall;
}

/**
 * Convenience helper that fans out into N walls between `from` and
 * each room in `to` (ADR-173 §Authoring API). Each underlying wall is
 * created with the supplied whole-wall traits (cloned per call to
 * avoid sharing trait instances across walls) and per-side data
 * produced by the `sides` callback.
 *
 * Walls are created sequentially. If validation fails on the K-th
 * pair, walls 0..K-1 are already in the world — author is expected
 * to fix the offending pair and re-run only the bad declaration, in
 * keeping with ADR-173's load-time-failure model.
 */
export function createWalls(
  world: IWallCreationWorld,
  spec: IWallsSpec,
): WallEntity[] {
  const fromId = refToId(spec.from);
  const walls: WallEntity[] = [];

  for (const toRef of spec.to) {
    const toId = refToId(toRef);
    const sides: Record<EntityId, IWallSideData> = {
      [fromId]: spec.sides(fromId),
      [toId]: spec.sides(toId),
    };
    const whole = spec.whole ? cloneTraits(spec.whole) : undefined;
    const wall = createWall(world, {
      between: [fromId, toId],
      whole,
      sides,
    });
    walls.push(wall);
  }

  return walls;
}

function pushWallId(room: IFEntity, wallId: string): void {
  const trait = room.get<RoomTrait>(TraitType.ROOM);
  if (!trait) {
    throw new Error(
      `wall-creation: room '${room.id}' lost its RoomTrait between validation and mutation`,
    );
  }
  if (!trait.walls) {
    trait.walls = [];
  }
  trait.walls.push(wallId);
}

function cloneTraits(traits: ITrait[]): ITrait[] {
  return traits.map((t) => {
    const proto = Object.getPrototypeOf(t);
    const copy = Object.assign(Object.create(proto), t);
    return copy as ITrait;
  });
}
