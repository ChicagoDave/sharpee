/**
 * Trait for objects that can be climbed (ladders, trees, mountains, etc.)
 */

import { TraitType } from '../trait-types';
import { ITrait } from '../trait';

/**
 * Trait for climbable objects
 */
export class ClimbableTrait implements ITrait {
  static readonly type = TraitType.CLIMBABLE;
  readonly type = TraitType.CLIMBABLE;
  
  /** Whether the object can currently be climbed */
  canClimb: boolean;
  
  /** Optional message when climbing is blocked */
  blockedMessage?: string;
  
  /** Direction of climbing (up, down, or both) */
  direction?: 'up' | 'down' | 'both';
  
  /** Destination entity ID when climbing (e.g., top of tree, other side of fence) */
  destination?: string;
  
  /** Message shown when successfully climbing */
  successMessage?: string;
  
  constructor(options: Partial<Omit<ClimbableTrait, 'type'>> = {}) {
    this.canClimb = options.canClimb ?? true;
    this.blockedMessage = options.blockedMessage;
    this.direction = options.direction ?? 'both';
    this.destination = options.destination;
    this.successMessage = options.successMessage;
  }
}

/**
 * Type guard for ClimbableTrait
 */
export function isClimbableTrait(trait: ITrait): trait is ClimbableTrait {
  return trait.type === TraitType.CLIMBABLE;
}

/**
 * Factory function for creating ClimbableTrait
 */
export function createClimbableTrait(options: Partial<Omit<ClimbableTrait, 'type'>> = {}): ClimbableTrait {
  return new ClimbableTrait(options);
}