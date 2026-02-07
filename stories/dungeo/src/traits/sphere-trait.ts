/**
 * Sphere Trait
 *
 * Trait for the white crystal sphere in Dingy Closet.
 * Declares an action interceptor for if.action.taking (ADR-118).
 *
 * When the cage puzzle is not solved, taking the sphere triggers:
 * - Robot in room: Cage trap (player + robot trapped, 10-turn poison countdown)
 * - Robot not in room: Immediate poison gas death
 *
 * From MDL source (act3.mud:231-261):
 * <DEFINE SPHERE-FUNCTION ...>
 *   <SET FL <AND <NOT ,CAGE-SOLVE!-FLAG> <VERB? "TAKE">>>
 *   ... cage trap or poison death ...
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

export interface SphereTraitConfig {
  /** Room ID of the Dingy Closet (where the cage puzzle occurs) */
  dingyClosetId: string;
}

export class SphereTrait implements ITrait {
  static readonly type = 'dungeo.trait.sphere' as const;
  static readonly interceptors = [
    'if.action.taking'  // Cage trap when unsolved (ADR-118)
  ] as const;

  readonly type = SphereTrait.type;

  /** Room ID of the Dingy Closet */
  dingyClosetId: string;

  constructor(config: SphereTraitConfig) {
    this.dingyClosetId = config.dingyClosetId;
  }
}

export const SphereTraitConstructor: ITraitConstructor<SphereTrait> = SphereTrait;
