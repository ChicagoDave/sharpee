/**
 * Breakable trait for entities that can be broken with a single hit
 */

import { ITrait } from '../trait';

export interface IBreakableData {
  /** Whether this object is already broken */
  broken?: boolean;
}

/**
 * Breakable trait indicates an entity can be broken with a single hit.
 * 
 * This trait contains only data - all breaking logic
 * is in BreakableBehavior. Story-specific properties (messages,
 * sounds, debris, etc.) should be handled through event handlers.
 */
export class BreakableTrait implements ITrait, IBreakableData {
  static readonly type = 'breakable' as const;
  readonly type = 'breakable' as const;
  
  // BreakableData properties
  broken: boolean;
  
  constructor(data: IBreakableData = {}) {
    // Set defaults and merge with provided data
    this.broken = data.broken ?? false;
  }
}