/**
 * containment.ts — where an entity sits when play begins.
 *
 * Purpose: an entity's placement is written in several shapes — `in the hall`,
 * `on the doormat`, carried, or worn — and a reachability answer needs one
 * question answered from all of them: which room does this thing end up in. This
 * module owns that walk and nothing else. A region's `containing` list is
 * deliberately not a holder: its members are rooms and nested regions, and a
 * region is a name for a group of places, never a place the player stands.
 *
 * Public interface: holderIndex, roomOf, ContainmentIndex.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * @packageDocumentation
 * @see ADR-321 D4: Reach covers rooms, things and people
 */

import type { IREntity, StoryIR } from '@sharpee/chord';
import { isRoom } from './story.js';

/** Depth limit on the holder walk — a containment cycle is a malformed IR, not a hang. */
const MAX_CONTAINMENT_DEPTH = 32;

/** Entity lookup plus the holder relation, built once per story. */
export interface ContainmentIndex {
  /** Entity by id. */
  byId: ReadonlyMap<string, IREntity>;
  /** Contained entity id to the id of whatever holds it at start. */
  holderOf: ReadonlyMap<string, string>;
}

/**
 * Index a story's entities and the start-of-play holder relation.
 *
 * @param ir the story IR
 * @returns the entity map and holder map every containment question reads
 */
export function holderIndex(ir: StoryIR): ContainmentIndex {
  const byId = new Map<string, IREntity>();
  const holderOf = new Map<string, string>();

  for (const entity of ir.entities) byId.set(entity.id, entity);

  for (const entity of ir.entities) {
    for (const carried of entity.carries ?? []) holderOf.set(carried, entity.id);
    for (const worn of entity.wears ?? []) holderOf.set(worn, entity.id);
  }
  return { byId, holderOf };
}

/**
 * The room an entity is in at start of play, following placement and holders.
 *
 * @param index the containment index for this story
 * @param entityId the entity to locate
 * @returns the enclosing room's id, or `undefined` when the entity is placed
 *   nowhere, held by nothing, or its chain leaves the story
 */
export function roomOf(index: ContainmentIndex, entityId: string): string | undefined {
  let current = entityId;
  for (let depth = 0; depth < MAX_CONTAINMENT_DEPTH; depth += 1) {
    const entity = index.byId.get(current);
    if (entity === undefined) return undefined;
    if (isRoom(entity)) return entity.id;

    const placed = entity.placement?.place;
    if (placed !== undefined && placed !== current) {
      current = placed;
      continue;
    }
    const holder = index.holderOf.get(current);
    if (holder !== undefined && holder !== current) {
      current = holder;
      continue;
    }
    return undefined;
  }
  return undefined;
}
