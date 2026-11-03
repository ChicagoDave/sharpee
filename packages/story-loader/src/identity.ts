/**
 * One identity for Chord entities: the IR id is the world id, and nothing
 * translates between them. The only reference that is not an entity id is
 * the compiler's `player` sentinel, which names the role and is read from
 * the world at the moment of use.
 *
 * Public interface: `worldIdOf(world, irId)` resolves an IR-sourced entity
 * reference to the world id it names; `requireEntity(world, irId, at?)`
 * fetches the entity that reference names and refuses one that is not in
 * the world yet.
 *
 * Owner: Chord story-loader (the IR interpreter).
 *
 * References: ADR-389 D1 (one identity), ADR-390 D3 (the sentinel resolved
 * against the role holder at use time), ADR-388 D1 (entities take their IR
 * id as world id).
 */

import type { IFEntity, WorldModel } from '@sharpee/world-model';
import type { Span } from '@sharpee/chord';
import { LoadError } from './errors.js';
import { PLAYER_SENTINEL } from './state-keys.js';

/**
 * The world id an IR entity reference names.
 *
 * The `player` sentinel is the role, read from the world: the holder's id
 * once the start block has assigned it, `undefined` before. Every other
 * reference is the id itself.
 *
 * @param world the live world the role is read from
 * @param irId an entity id from the IR, or the `player` sentinel
 * @returns the world id, or `undefined` for the sentinel before the role is assigned
 */
export function worldIdOf(world: WorldModel, irId: string): string | undefined {
  if (irId === PLAYER_SENTINEL) {
    return world.hasPlayerCharacter ? world.playerCharacter.id : undefined;
  }
  return irId;
}

/**
 * The entity an IR entity reference names, which must already be in the world.
 *
 * @param world the live world
 * @param irId an entity id from the IR, or the `player` sentinel
 * @param at the IR node making the reference, for the error's source span
 * @returns the entity
 * @throws LoadError when the reference names nothing in the world yet
 */
export function requireEntity(world: WorldModel, irId: string, at?: { span?: Span }): IFEntity {
  const worldId = worldIdOf(world, irId);
  const entity = worldId !== undefined ? world.getEntity(worldId) : undefined;
  if (!entity) {
    throw new LoadError(`Entity \`${irId}\` is referenced before it exists in the world.`, at?.span);
  }
  return entity;
}
