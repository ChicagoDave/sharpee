/**
 * Inflatable Trait
 *
 * Trait for marking entities that can be inflated/deflated.
 * Used by the boat (dam region) and cloth bag (balloon in volcano region).
 *
 * Replaces the anti-pattern of (entity as any).isInflated = true/false.
 * This trait persists through checkpoint save/restore, unlike custom properties.
 *
 * ADR-118: This trait declares an interceptor for ENTERING to handle
 * the boat puncture mechanic (entering with sharp object deflates the boat).
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the inflatable trait
 */
export interface InflatableTraitConfig {
  /** Whether the entity is currently inflated */
  isInflated: boolean;
}

/**
 * Inflatable Trait
 *
 * Entities with this trait can be:
 * - Inflated (e.g., pump boat with hand pump)
 * - Deflated (e.g., open valve on boat)
 *
 * The inflate/deflate actions check for this trait to determine
 * if an entity can be inflated/deflated.
 *
 * Interceptors:
 * - if.action.entering: Checks for sharp objects when entering inflated boat
 */
export class InflatableTrait implements ITrait {
  static readonly type = 'dungeo.trait.inflatable' as const;

  /** Declare interceptor for ENTERING action (ADR-118) */
  static readonly interceptors = ['if.action.entering'] as const;

  readonly type = InflatableTrait.type;

  /** Whether the entity is currently inflated */
  isInflated: boolean;

  constructor(config: InflatableTraitConfig) {
    this.isInflated = config.isInflated;
  }
}

// Ensure the class implements ITraitConstructor
export const InflatableTraitConstructor: ITraitConstructor<InflatableTrait> = InflatableTrait;
