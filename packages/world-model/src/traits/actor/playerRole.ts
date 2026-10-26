/**
 * playerRole.ts — the player role's own vocabulary (ADR-327 D9/D10).
 *
 * Public interface: `addPlayerRoleVocabulary`, `movePlayerRoleVocabulary`.
 *
 * Owner context: world-model. The self words name whoever is currently
 * playing, not a particular character — so they belong to the ROLE and travel
 * with it when the role moves. The words themselves are the language's
 * (ADR-387 D2): the engine hands them in from the world's language words at
 * install and on `switchPlayer`, and this module holds no English.
 */

import type { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import type { IdentityTrait } from '../identity/identityTrait.js';

/**
 * Give an entity the role's vocabulary.
 *
 * @param entity the entity taking the player role
 * @param selfWords the language's self words (the world's language words)
 * @returns nothing; the entity's IdentityTrait gains any missing role alias.
 *   An entity with no IdentityTrait is left alone — it has no alias list to
 *   add to, and inventing one would fabricate a name for it.
 */
export function addPlayerRoleVocabulary(entity: IFEntity, selfWords: readonly string[]): void {
  const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  if (!identity) return;
  identity.aliases ??= [];
  for (const alias of selfWords) {
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
 * @param selfWords the language's self words (the world's language words)
 */
export function movePlayerRoleVocabulary(from: IFEntity | null | undefined, to: IFEntity, selfWords: readonly string[]): void {
  const previous = from?.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  if (previous?.aliases) {
    previous.aliases = previous.aliases.filter((a) => !selfWords.includes(a));
  }
  addPlayerRoleVocabulary(to, selfWords);
}
