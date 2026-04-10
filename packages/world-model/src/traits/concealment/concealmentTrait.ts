/**
 * Concealment trait for hiding spots (ADR-148)
 *
 * Entities with this trait can serve as hiding spots for actors.
 * The trait declares which positions are available (behind, under, on, inside)
 * and the quality of concealment the spot provides.
 *
 * Public interface: ConcealmentTrait, ConcealmentPosition, isConcealmentTrait.
 * Owner context: @sharpee/world-model / traits
 */

import { ITrait } from '../trait';

/** How an actor can hide relative to the entity */
export type ConcealmentPosition = 'behind' | 'under' | 'on' | 'inside';

/** How well the hiding spot conceals — affects NPC detection at the story level */
export type ConcealmentQuality = 'poor' | 'fair' | 'good' | 'excellent';

/**
 * Trait for entities that serve as hiding spots.
 *
 * @example
 * ```typescript
 * const curtain = world.createEntity('curtain', 'object');
 * curtain.add(new ConcealmentTrait({
 *   positions: ['behind'],
 *   quality: 'good',
 * }));
 * ```
 */
export class ConcealmentTrait implements ITrait {
  static readonly type = 'if.trait.concealment';
  readonly type = 'if.trait.concealment';

  /** Which positions this entity supports for hiding */
  positions: ConcealmentPosition[];

  /** How many actors can hide here simultaneously (default: 1) */
  capacity: number;

  /** Quality of concealment — used by story-level NPC detection logic */
  quality: ConcealmentQuality;

  constructor(options: {
    positions: ConcealmentPosition[];
    quality: ConcealmentQuality;
    capacity?: number;
  }) {
    this.positions = options.positions;
    this.quality = options.quality;
    this.capacity = options.capacity ?? 1;
  }

  /**
   * Check if this entity supports a given hiding position.
   *
   * @param position - The position to check
   * @returns True if the position is available
   */
  supportsPosition(position: ConcealmentPosition): boolean {
    return this.positions.includes(position);
  }
}

/**
 * Type guard for ConcealmentTrait
 */
export function isConcealmentTrait(trait: ITrait): trait is ConcealmentTrait {
  return trait.type === ConcealmentTrait.type;
}
