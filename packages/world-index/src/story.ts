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
 * Why a Story IR could not be loaded.
 *
 * The two are different problems with different fixes — a path that names
 * nothing versus a file that is not a Story IR — and the World tab says so
 * (AC-9). Kept as its own narrow union rather than imported from the wire
 * contract: `document.ts` reads this module, so the dependency runs one way.
 */
export type StoryIRReadFailure = 'unreadable' | 'malformed';

/**
 * A Story IR that could not be read or did not parse.
 *
 * Carries the offending path and which of the two failures it was, so the IDE's
 * World tab can name the cause in its empty state rather than failing silently
 * (ADR-321 AC-9).
 */
export class StoryIRReadError extends Error {
  /**
   * @param path the `.ir.json` path that could not be read
   * @param failure which failure this was
   * @param cause the underlying filesystem or parse failure, when there was one
   */
  constructor(
    readonly path: string,
    readonly failure: StoryIRReadFailure,
    override readonly cause?: unknown,
  ) {
    super(
      cause === undefined
        ? `Cannot read Story IR at ${path}`
        : `Cannot read Story IR at ${path}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = 'StoryIRReadError';
  }
}

/**
 * Whether a parsed value carries the two things every Story IR has.
 *
 * A shallow check on purpose: the point is to tell a Story IR from some other
 * JSON file, not to revalidate what the compiler already guaranteed.
 *
 * @param value the parsed JSON
 * @returns true when it has a format stamp and an entity list
 */
function looksLikeStoryIR(value: unknown): value is StoryIR {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { format?: unknown; entities?: unknown };
  return typeof candidate.format === 'string' && Array.isArray(candidate.entities);
}

/**
 * Load a compiled Story IR from disk.
 *
 * @param path path to a `<story>.ir.json` emitted by the Chord compiler
 * @returns the parsed IR
 * @throws {StoryIRReadError} `unreadable` when the file is missing or cannot be
 *   read; `malformed` when it is not JSON or not a Story IR
 */
export function readStoryIR(path: string): StoryIR {
  let source: string;
  try {
    source = readFileSync(path, 'utf8');
  } catch (cause) {
    throw new StoryIRReadError(path, 'unreadable', cause);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (cause) {
    throw new StoryIRReadError(path, 'malformed', cause);
  }

  if (!looksLikeStoryIR(parsed)) {
    throw new StoryIRReadError(path, 'malformed');
  }
  return parsed;
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
    (entity) => !isRoom(entity) && !isRegion(entity) && !isDoor(entity) && !entity.isPlayable,
  );
}

/**
 * The character the story's `before the game starts` block gives the player
 * role to (ADR-327 D10).
 *
 * Reads the block's first unconditional `change the player to` — the opening
 * protagonist. A conditional assignment is deliberately not followed: which arm
 * fires is a run-time fact, and this index describes the story as written.
 *
 * @param ir the story IR
 * @returns the opening PC's entity id, or `undefined` when the story assigns
 *   the role only conditionally (or not at all)
 */
export function initialPlayerIdOf(ir: StoryIR): string | undefined {
  for (const stmt of ir.startBlock?.body ?? []) {
    if (stmt.kind !== 'change-player' || stmt.stmtWhen) continue;
    if (stmt.entity.kind === 'entity') return stmt.entity.id;
  }
  return undefined;
}

/**
 * The room the player begins in.
 *
 * @param ir the story IR
 * @returns the start room's id, or `undefined` when the story names no opening
 *   protagonist, or that character carries no placement line
 */
export function startRoomOf(ir: StoryIR): string | undefined {
  const playerId = initialPlayerIdOf(ir);
  if (playerId === undefined) return undefined;
  return ir.entities.find((entity) => entity.id === playerId)?.placement?.place;
}
