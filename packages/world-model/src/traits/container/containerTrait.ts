// packages/world-model/src/traits/container/containerTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Container trait allows entities to hold other entities inside them.
 * 
 * This is a pure data structure - all validation and logic
 * should be handled by ContainerBehavior.
 */
export class ContainerTrait implements Trait {
  static readonly type = TraitType.CONTAINER;
  readonly type = TraitType.CONTAINER;
  
  /** Capacity constraints for the container */
  capacity?: {
    /** Maximum total weight the container can hold (in kg) */
    maxWeight?: number;
    
    /** Maximum total volume the container can hold (in liters) */
    maxVolume?: number;
    
    /** Maximum number of items the container can hold */
    maxItems?: number;
  };
  
  /** Whether contents are visible when the container is closed */
  isTransparent: boolean;
  
  /** Whether actors can enter this container */
  enterable: boolean;
  
  /** Only these entity types can be placed in the container */
  allowedTypes?: string[];
  
  /** These entity types cannot be placed in the container */
  excludedTypes?: string[];
  
  constructor(data?: Partial<ContainerTrait>) {
    // Set defaults
    this.isTransparent = false;
    this.enterable = false;
    
    // Override with provided data
    if (data) {
      if (data.capacity !== undefined) this.capacity = data.capacity;
      if (data.isTransparent !== undefined) this.isTransparent = data.isTransparent;
      if (data.enterable !== undefined) this.enterable = data.enterable;
      if (data.allowedTypes !== undefined) this.allowedTypes = data.allowedTypes;
      if (data.excludedTypes !== undefined) this.excludedTypes = data.excludedTypes;
    }
  }
}
