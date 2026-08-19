/**
 * story.ts — loading a compiled Story IR and the entity classifications every
 * view needs.
 *
 * Purpose: one place that turns a `.ir.json` path into typed `StoryIR` and answers
 * the "what kind of thing is this entity" questions the Map, Reach, and Incomplete
 * derivations all ask. The IR types come from `@sharpee/chord` and are never
 * redeclared here (ADR-321 D2) — a schema change must fail this package's build in
 * the same commit.
 *
 * Public interface: readStoryIR, StoryIRReadError, isRoom, isRegion, isDoor,
 * roomsOf, thingsOf, startRoomOf.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * @packageDocumentation
 * @see ADR-321 D2: the derivation imports @sharpee/chord IR types directly
 * @see ADR-210: the Chord story language and its IR
 */

import { readFileSync } from 'node:fs';
import type { IREntity, StoryIR } from '@sharpee/chord';

/**
 * A Story IR that could not be read or did not parse.
 *
 * Carries the offending path so the IDE's World tab can name the cause in its
 * empty state rather than failing silently (ADR-321 AC-9).
 */
export class StoryIRReadError extends Error {
  /**
   * @param path the `.ir.json` path that could not be read
   * @param cause the underlying filesystem or parse failure
   */
  constructor(
    readonly path: string,
    override readonly cause: unknown,
  ) {
    super(`Cannot read Story IR at ${path}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'StoryIRReadError';
  }
}

/**
 * Load a compiled Story IR from disk.
 *
 * @param path path to a `<story>.ir.json` emitted by the Chord compiler
 * @returns the parsed IR
 * @throws {StoryIRReadError} when the file is missing, unreadable, or not JSON
 */
export function readStoryIR(path: string): StoryIR {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as StoryIR;
  } catch (cause) {
    throw new StoryIRReadError(path, cause);
  }
}

/**
 * Whether an entity was declared with the given kind noun.
 *
 * @param entity the entity to test
 * @param kind the kind noun, e.g. `room`
 * @returns true when the entity composes that kind
 */
function hasKind(entity: IREntity, kind: string): boolean {
  return (entity.kinds ?? []).some((composed) => composed.name === kind);
}

/**
 * Whether an entity is a room.
 *
 * @param entity the entity to test
 * @returns true for a room
 */
export function isRoom(entity: IREntity): boolean {
  return hasKind(entity, 'room');
}

/**
 * Whether an entity is a region — a named room group, not a place the player stands.
 *
 * @param entity the entity to test
 * @returns true for a region
 */
export function isRegion(entity: IREntity): boolean {
  return hasKind(entity, 'region');
}

/**
 * Whether an entity is a door.
 *
 * A door is reached through an exit's `via` rather than by being placed in a room,
 * so it is neither a room nor an ordinary thing for reachability purposes.
 *
 * @param entity the entity to test
 * @returns true for a door
 */
export function isDoor(entity: IREntity): boolean {
  return hasKind(entity, 'door');
}

/**
 * The story's rooms.
 *
 * @param ir the story IR
 * @returns every room entity, in declaration order
 */
export function roomsOf(ir: StoryIR): IREntity[] {
  return ir.entities.filter(isRoom);
}

/**
 * The story's things — what a player can hold, examine, or talk to.
 *
 * Excludes rooms, regions, doors, and the player, each of which is reachable by a
 * different rule than "is it in a room you can walk to".
 *
 * @param ir the story IR
 * @returns every thing entity, in declaration order
 */
export function thingsOf(ir: StoryIR): IREntity[] {
  return ir.entities.filter(
    (entity) => !isRoom(entity) && !isRegion(entity) && !isDoor(entity) && !entity.isPlayer,
  );
}

/**
 * The room the player begins in.
 *
 * @param ir the story IR
 * @returns the start room's id, or `undefined` when the story places no player
 */
export function startRoomOf(ir: StoryIR): string | undefined {
  return ir.entities.find((entity) => entity.isPlayer)?.placement?.place;
}
