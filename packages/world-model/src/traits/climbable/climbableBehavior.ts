/**
 * Behavior functions for climbable objects
 */

import { IFEntity } from '../../entities/if-entity';
import { ClimbableTrait } from './climbableTrait';
import { TraitType } from '../trait-types';

/**
 * Result of attempting to climb
 */
export interface IClimbResult {
  success: boolean;
  blocked?: boolean;
  blockedReason?: string;
  destination?: string;
  direction?: 'up' | 'down' | 'both';
  successMessage?: string;
}

/**
 * Behavior functions for climbable objects
 */
export class ClimbableBehavior {
  /**
   * Check if an entity is climbable
   */
  static isClimbable(entity: IFEntity): boolean {
    if (!entity.has(TraitType.CLIMBABLE)) {
      return false;
    }
    
    const trait = entity.get(TraitType.CLIMBABLE) as ClimbableTrait;
    return trait.canClimb;
  }
  
  /**
   * Attempt to climb an object
   */
  static climb(entity: IFEntity): IClimbResult {
    if (!entity.has(TraitType.CLIMBABLE)) {
      return {
        success: false,
        blocked: true,
        blockedReason: 'not_climbable'
      };
    }
    
    const trait = entity.get(TraitType.CLIMBABLE) as ClimbableTrait;
    
    if (!trait.canClimb) {
      return {
        success: false,
        blocked: true,
        blockedReason: trait.blockedMessage || 'cant_climb'
      };
    }
    
    return {
      success: true,
      destination: trait.destination,
      direction: trait.direction,
      successMessage: trait.successMessage
    };
  }
  
  /**
   * Get climb direction for an object
   */
  static getDirection(entity: IFEntity): 'up' | 'down' | 'both' | undefined {
    if (!entity.has(TraitType.CLIMBABLE)) {
      return undefined;
    }
    
    const trait = entity.get(TraitType.CLIMBABLE) as ClimbableTrait;
    return trait.direction;
  }
  
  /**
   * Get climb destination for an object
   */
  static getDestination(entity: IFEntity): string | undefined {
    if (!entity.has(TraitType.CLIMBABLE)) {
      return undefined;
    }
    
    const trait = entity.get(TraitType.CLIMBABLE) as ClimbableTrait;
    return trait.destination;
  }
}