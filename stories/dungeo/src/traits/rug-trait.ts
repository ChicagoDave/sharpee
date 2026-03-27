/**
 * Rug Trait - Story trait for the oriental rug in the Living Room
 *
 * Stores entity references needed by the RugPushInterceptor to reveal
 * the trapdoor when the rug is pushed. Registered for if.action.pushing
 * interceptor (ADR-118).
 *
 * From MDL source (dung.355): pushing the rug reveals the trap door
 * and wires DOWN/UP exits between Living Room and Cellar.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

export interface RugTraitConfig {
  /** Entity ID of the trap door hidden under the rug */
  trapdoorId: string;
  /** Room ID of the cellar below (destination of DOWN exit) */
  cellarId: string;
}

export class RugTrait implements ITrait {
  static readonly type = 'dungeo.trait.rug' as const;
  readonly type = RugTrait.type;

  /** Entity ID of the trap door */
  trapdoorId: string;

  /** Room ID of the cellar */
  cellarId: string;

  constructor(config: RugTraitConfig) {
    this.trapdoorId = config.trapdoorId;
    this.cellarId = config.cellarId;
  }
}

export const RugTraitConstructor: ITraitConstructor<RugTrait> = RugTrait;
