/**
 * Install-time validation of the player role holder.
 *
 * The entity a story's `createPlayer` returns must satisfy three conditions
 * before the engine commits to it: it must be placed somewhere in the world,
 * it must carry an `ActorTrait`, and that trait must mark it playable. Until
 * this step existed the invariant was enforced in the Chord loader's
 * `finalizeRoleHolder` and nowhere else, so a hand-written TypeScript story
 * received no guarantee — the engine's install seam validated nothing and
 * adopted whatever it was handed.
 *
 * This step refuses rather than repairs. The loader's habit of placing an
 * unplaced holder in the first declared room is a fallback that hides the
 * author's mistake; here an unplaced holder fails the install, naming the
 * entity.
 *
 * Public interface: `validateRoleHolder`, `RoleHolderValidationError`,
 * `RoleHolderFailure`, `validateRoleHolderStep`.
 *
 * Owner context: `@sharpee/engine` — story installation (the
 * `validate-role-holder` step, immediately after the player lookup).
 */

import type { IFEntity, WorldModel } from '@sharpee/world-model';
import { TraitType, ActorTrait } from '@sharpee/world-model';
import type { InstallStep } from './context.js';

/**
 * Which of the three conditions the role holder failed.
 *
 * A structured reason rather than only a message, so tests and hosts can
 * branch on the condition without matching prose.
 */
export type RoleHolderFailure = 'unplaced' | 'no-actor-trait' | 'not-playable';

/** The human-readable half of each failure, keyed by reason. */
const FAILURE_TEXT: Record<RoleHolderFailure, string> = {
  'unplaced': 'is not placed in the world — an unplaced player character is nowhere to play',
  'no-actor-trait': 'carries no ActorTrait',
  'not-playable': 'is not marked playable',
};

/**
 * Story-load failure for the player role holder.
 *
 * Carries the failed condition and the offending entity so a caller can
 * report it without re-deriving either from the message.
 */
export class RoleHolderValidationError extends Error {
  /** Which condition failed. */
  readonly reason: RoleHolderFailure;
  /** The offending entity's id. */
  readonly entityId: string;
  /** The offending entity's display name. */
  readonly entityName: string;

  /**
   * @param reason the condition that failed
   * @param entity the role holder that failed it
   */
  constructor(reason: RoleHolderFailure, entity: IFEntity) {
    super(`Story player "${entity.name}" (${entity.id}) ${FAILURE_TEXT[reason]}.`);
    this.name = 'RoleHolderValidationError';
    this.reason = reason;
    this.entityId = entity.id;
    this.entityName = entity.name;
  }
}

/**
 * Validate the entity a story named as its player.
 *
 * Conditions are checked in order — placement, then trait presence, then
 * playability — and the first failure throws. Nothing is mutated: a holder
 * that fails is reported, never repaired.
 *
 * @param player the entity `Story.createPlayer` returned
 * @param world the world the story built, for the placement lookup
 * @throws RoleHolderValidationError naming the entity and the failed condition
 */
export function validateRoleHolder(player: IFEntity, world: WorldModel): void {
  // The invariant these three conditions make up, and the reason it belongs
  // at this seam rather than in one language's loader: ADR-344 D1, D2.
  if (world.getLocation(player.id) === undefined) {
    throw new RoleHolderValidationError('unplaced', player);
  }

  const actor = player.get<ActorTrait>(TraitType.ACTOR);
  if (!actor) {
    throw new RoleHolderValidationError('no-actor-trait', player);
  }

  if (actor.isPlayable !== true) {
    throw new RoleHolderValidationError('not-playable', player);
  }
}

/** The install step: validates the holder the player step just adopted. */
export const validateRoleHolderStep: InstallStep = {
  name: 'validate-role-holder',
  requires: ['create-player'],
  run(context) {
    validateRoleHolder(context.draft.player!, context.world);
  }
};
