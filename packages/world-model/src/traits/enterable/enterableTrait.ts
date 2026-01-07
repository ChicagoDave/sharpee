/**
 * Trait for objects that can be entered by actors (baskets, vehicles, chairs, etc.)
 *
 * Separates the "can be entered" concern from ContainerTrait's "can hold items" concern.
 * Entities with EnterableTrait can have players/actors enter them.
 */

import { TraitType } from '../trait-types';
import { ITrait } from '../trait';

/**
 * Configuration options for EnterableTrait
 */
export interface EnterableTraitConfig {
  /** Preposition for entering: 'in' for containers, 'on' for supporters */
  preposition?: 'in' | 'on';
}

/**
 * Trait for enterable objects
 */
export class EnterableTrait implements ITrait {
  static readonly type = TraitType.ENTERABLE;
  readonly type = TraitType.ENTERABLE;

  /** Preposition for entering (default: 'in') */
  preposition: 'in' | 'on';

  constructor(config?: EnterableTraitConfig) {
    this.preposition = config?.preposition ?? 'in';
  }
}

/**
 * Type guard for EnterableTrait
 */
export function isEnterableTrait(trait: ITrait): trait is EnterableTrait {
  return trait.type === TraitType.ENTERABLE;
}

/**
 * Factory function for creating EnterableTrait
 */
export function createEnterableTrait(config?: EnterableTraitConfig): EnterableTrait {
  return new EnterableTrait(config);
}
