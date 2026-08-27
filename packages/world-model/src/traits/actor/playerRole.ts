/**
 * playerRole.ts — the player role's own vocabulary (ADR-327 D9/D10).
 *
 * Public interface: `PLAYER_ROLE_ALIASES`, `addPlayerRoleVocabulary`,
 * `movePlayerRoleVocabulary`.
 *
 * Owner context: world-model. `me`, `myself` and `self` name whoever is
 * currently playing, not a particular character — so they belong to the ROLE
 * and travel with it when the role moves. Both the story loader (stamping the
 * opening protagonist) and the engine (`switchPlayer`) need the same set and
 * the same move, which is why it lives here rather than in either of them.
 */

import type { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import type { IdentityTrait } from '../identity/identityTrait.js';

/**
 * The words that name the current player character rather than any particular
 * character. Deliberately small: a character's own names and `aka` aliases are
 * theirs and never move.
 */
export const PLAYER_ROLE_ALIASES: readonly string[] = ['me', 'myself', 'self'];

/**
 * Give an entity the role's vocabulary.
 *
 * @param entity the entity taking the player role
 * @returns nothing; the entity's IdentityTrait gains any missing role alias.
 *   An entity with no IdentityTrait is left alone — it has no alias list to
 *   add to, and inventing one would fabricate a name for it.
 */
export function addPlayerRoleVocabulary(entity: IFEntity): void {
  const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  if (!identity) return;
  identity.aliases ??= [];
  for (const alias of PLAYER_ROLE_ALIASES) {
    if (!identity.aliases.includes(alias)) identity.aliases.push(alias);
  }
}

/**
 * Move the role's vocabulary from the outgoing player character to the incoming
 * one (ADR-327 Q2, ruled 2026-08-26).
 *
 * Without this, `x me` keeps naming the character who used to be the PC after
 * every switch — the aliases live on the entity's IdentityTrait, which
 * `syncPlayerState` does not touch.
 *
 * @param from the outgoing PC, or null on the first assignment
 * @param to the incoming PC
 */
export function movePlayerRoleVocabulary(from: IFEntity | null | undefined, to: IFEntity): void {
  const previous = from?.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  if (previous?.aliases) {
    previous.aliases = previous.aliases.filter((a) => !PLAYER_ROLE_ALIASES.includes(a));
  }
  addPlayerRoleVocabulary(to);
}
