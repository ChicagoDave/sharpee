// packages/world-model/src/world/wall-validation.ts

/**
 * World-load validation for wall specifications (ADR-173).
 *
 * Implements the Rejection rules from ADR-173 §"Rejection rules":
 * cardinality (exactly two distinct rooms), per-side adjective
 * presence/non-emptiness, per-room adjective uniqueness, and
 * `obstructedBy` resolution against the world's current entity map.
 *
 * Public interface: `validateWallSpec`. Pure validation — no mutation.
 * Throws `Error` with a descriptive message on the first violation
 * detected; never returns a structured error object (the validator is
 * a precondition gate at the createWall boundary, not a recoverable
 * subsystem).
 *
 * Owner context: `@sharpee/world-model` — world / spatial primitives.
 */

import { EntityId } from '@sharpee/core';
import { IFEntity } from '../entities/if-entity';
import { IWallSpec, IWallSideData } from '../entities/wall-entity';
import { TraitType } from '../traits/trait-types';
import { RoomTrait } from '../traits/room/roomTrait';

/**
 * Resolves an `IFEntity | EntityId` reference to its id string.
 */
function refToId(ref: IFEntity | EntityId): EntityId {
  return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Read-only world surface this validator depends on. Limited to the
 * methods required so the validator can be invoked from tests with a
 * minimal stand-in if desired (and so it does not creep into mutation
 * APIs by accident).
 */
export interface IWallValidationWorld {
  getEntity(id: string): IFEntity | undefined;
  getLocation(entityId: string): string | undefined;
}

/**
 * Validates a wall specification before mutation.
 *
 * @param spec - The author-supplied wall specification.
 * @param world - Read-only view of the world for entity/location lookups.
 * @throws Error if cardinality, adjective presence, per-room adjective
 *   uniqueness, or `obstructedBy` resolution fails. The first failure
 *   detected aborts validation; no partial state escapes.
 */
export function validateWallSpec(
  spec: IWallSpec,
  world: IWallValidationWorld,
): { roomAId: EntityId; roomBId: EntityId; roomA: IFEntity; roomB: IFEntity } {
  if (!Array.isArray(spec.between)) {
    throw new Error('createWall: `between` must be a tuple of exactly two rooms');
  }
  if (spec.between.length !== 2) {
    throw new Error(
      `createWall: \`between\` must contain exactly 2 rooms (got ${spec.between.length})`,
    );
  }

  const roomAId = refToId(spec.between[0]);
  const roomBId = refToId(spec.between[1]);

  if (roomAId === roomBId) {
    throw new Error(
      `createWall: \`between\` must reference two distinct rooms (got self-reference '${roomAId}')`,
    );
  }

  const roomA = world.getEntity(roomAId);
  if (!roomA) {
    throw new Error(`createWall: room '${roomAId}' does not exist`);
  }
  const roomB = world.getEntity(roomBId);
  if (!roomB) {
    throw new Error(`createWall: room '${roomBId}' does not exist`);
  }

  const roomATrait = roomA.get<RoomTrait>(TraitType.ROOM);
  if (!roomATrait) {
    throw new Error(`createWall: entity '${roomAId}' is not a room`);
  }
  const roomBTrait = roomB.get<RoomTrait>(TraitType.ROOM);
  if (!roomBTrait) {
    throw new Error(`createWall: entity '${roomBId}' is not a room`);
  }

  if (!spec.sides || typeof spec.sides !== 'object') {
    throw new Error('createWall: `sides` must be a record keyed by room id');
  }

  const sideA = spec.sides[roomAId];
  const sideB = spec.sides[roomBId];

  validateSide(roomAId, sideA);
  validateSide(roomBId, sideB);

  validateAdjectiveUniqueness(roomAId, sideA.adjective, roomATrait, world);
  validateAdjectiveUniqueness(roomBId, sideB.adjective, roomBTrait, world);

  validateObstructor(roomAId, sideA, world);
  validateObstructor(roomBId, sideB, world);

  return { roomAId, roomBId, roomA, roomB };
}

function validateSide(roomId: EntityId, side: IWallSideData | undefined): void {
  if (!side) {
    throw new Error(`createWall: missing per-side data for room '${roomId}'`);
  }
  if (typeof side.adjective !== 'string') {
    throw new Error(
      `createWall: side for room '${roomId}' is missing a string \`adjective\``,
    );
  }
  if (side.adjective.trim().length === 0) {
    throw new Error(
      `createWall: side for room '${roomId}' has an empty \`adjective\``,
    );
  }
}

function validateAdjectiveUniqueness(
  roomId: EntityId,
  adjective: string,
  roomTrait: RoomTrait,
  world: IWallValidationWorld,
): void {
  const existingWallIds = roomTrait.walls ?? [];
  for (const existingWallId of existingWallIds) {
    const existing = world.getEntity(existingWallId);
    if (!existing) continue;
    const sides = (existing as unknown as { sides?: Map<EntityId, IWallSideData> }).sides;
    const existingSide = sides?.get(roomId);
    if (existingSide && existingSide.adjective === adjective) {
      throw new Error(
        `createWall: adjective '${adjective}' is already used by another wall in room '${roomId}'`,
      );
    }
  }
}

function validateObstructor(
  roomId: EntityId,
  side: IWallSideData,
  world: IWallValidationWorld,
): void {
  if (side.obstructedBy === undefined) return;
  const obstructor = world.getEntity(side.obstructedBy);
  if (!obstructor) {
    throw new Error(
      `createWall: \`obstructedBy\` references nonexistent entity '${side.obstructedBy}' for room '${roomId}'`,
    );
  }
  const obstructorLocation = world.getLocation(side.obstructedBy);
  if (obstructorLocation !== roomId) {
    throw new Error(
      `createWall: \`obstructedBy\` entity '${side.obstructedBy}' must be located in room '${roomId}' (currently in '${obstructorLocation ?? 'no location'}')`,
    );
  }
}
