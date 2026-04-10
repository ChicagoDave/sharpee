/**
 * Concealed state trait — dynamic trait applied to actors when hiding (ADR-148)
 *
 * Added by the hiding action, removed by the revealing action or implicit reveal.
 * Presence of this trait IS the concealed state — no boolean flag needed.
 *
 * Registers the if.scope.visible capability to block VisibilityBehavior.canSee().
 * When an NPC calls canSee() on a concealed actor, the capability behavior
 * returns { valid: false }, making the actor invisible.
 *
 * Public interface: ConcealedStateTrait, IConcealedStateTrait, isConcealed, getConcealmentState.
 * Owner context: @sharpee/world-model / traits
 */

import { ITrait } from '../trait';
import { IFEntity } from '../../entities';
import { VISIBILITY_CAPABILITY } from '../../world/VisibilityBehavior';
import { ConcealmentPosition, ConcealmentQuality } from './concealmentTrait';

/**
 * Data interface for the concealed state.
 */
export interface IConcealedStateTrait {
  /** The entity the actor is hiding behind/under/on/inside */
  targetId: string;

  /** How the actor is hiding */
  position: ConcealmentPosition;

  /** Snapshot of the hiding spot's quality at time of concealment */
  quality: ConcealmentQuality;
}

/**
 * Dynamic trait applied to an actor to mark them as concealed.
 *
 * The trait registers the `if.scope.visible` capability so that
 * VisibilityBehavior.canSee() automatically returns false for
 * concealed actors.
 */
export class ConcealedStateTrait implements ITrait, IConcealedStateTrait {
  static readonly type = 'if.trait.concealed_state';
  readonly type = 'if.trait.concealed_state';

  /** Registers the visibility capability — concealed actors block canSee() */
  static readonly capabilities = [VISIBILITY_CAPABILITY] as const;

  targetId: string;
  position: ConcealmentPosition;
  quality: ConcealmentQuality;

  constructor(data: IConcealedStateTrait) {
    this.targetId = data.targetId;
    this.position = data.position;
    this.quality = data.quality;
  }
}

/**
 * Check if an entity is concealed.
 *
 * @param entity - The entity to check
 * @returns True if the entity has ConcealedStateTrait
 */
export function isConcealed(entity: IFEntity): boolean {
  return entity.has(ConcealedStateTrait.type);
}

/**
 * Get the concealment details for an entity, or undefined if not concealed.
 *
 * @param entity - The entity to check
 * @returns The concealment state, or undefined
 */
export function getConcealmentState(entity: IFEntity): IConcealedStateTrait | undefined {
  const trait = entity.get(ConcealedStateTrait.type);
  if (!trait) return undefined;
  return trait as unknown as IConcealedStateTrait;
}
