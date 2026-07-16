/**
 * Cake Trait — the four Alice-themed cakes (Tea Room / Well Area).
 *
 * Marker + data trait keying the cake Action Interceptors (ADR-118/ADR-227):
 * eating and throwing a cake have entity-specific consequences (teleport,
 * death, pool dissolve) applied by interceptors registered on this trait
 * type — the same surface Chord's `on eating it` / `on throwing it` clauses
 * lower to (story-loader §5.4).
 *
 * Public interface: `CakeTrait`, `CakeType`, `CakeTraitConstructor`.
 * Owner context: stories/dungeo — Tea Room / Well Area puzzles.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/** The four MDL cakes: ECAKE, BLICE, RDICE, ORICE. */
export type CakeType = 'eat-me' | 'blue-icing' | 'red-icing' | 'orange-icing';

export interface CakeTraitConfig {
  /** Which of the four cakes this entity is */
  cakeType: CakeType;
}

export class CakeTrait implements ITrait {
  static readonly type = 'dungeo.trait.cake' as const;

  readonly type = CakeTrait.type;

  /** Which of the four cakes this entity is */
  cakeType: CakeType;

  constructor(config: CakeTraitConfig) {
    this.cakeType = config.cakeType;
  }
}

// Ensure the class implements ITraitConstructor
export const CakeTraitConstructor: ITraitConstructor<CakeTrait> = CakeTrait;
