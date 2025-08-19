// packages/world-model/src/traits/supporter/supporterTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Supporter trait allows entities to have other entities placed on top of them.
 * 
 * This is a pure data structure - all validation and logic
 * should be handled by SupporterBehavior.
 */
export class SupporterTrait implements ITrait {
  static readonly type = TraitType.SUPPORTER;
  readonly type = TraitType.SUPPORTER;
  
  /** Capacity constraints for the supporter */
  capacity?: {
    /** Maximum total weight the supporter can hold (in kg) */
    maxWeight?: number;
    
    /** Maximum number of items that can be placed on the supporter */
    maxItems?: number;
  };
  
  /** Whether actors can sit/stand/lie on this supporter */
  enterable?: boolean = false;
  
  /** Only these entity types can be placed on the supporter */
  allowedTypes?: string[];
  
  /** These entity types cannot be placed on the supporter */
  excludedTypes?: string[];
  
  constructor(data?: Partial<SupporterTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
