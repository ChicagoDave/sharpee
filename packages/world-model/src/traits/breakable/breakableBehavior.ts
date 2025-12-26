/**
 * Behavior for breakable entities
 */

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { WorldModel } from '../../world/WorldModel';
import { TraitType } from '../trait-types';
import { BreakableTrait } from './breakableTrait';
import { EntityId } from '@sharpee/core';

/**
 * Result of breaking an entity
 */
export interface IBreakResult {
  success: boolean;
  alreadyBroken?: boolean;
  debrisCreated?: EntityId[];
  itemRemoved?: boolean;
  message?: string;
  sound?: string;
}

/**
 * Behavior for breakable entities.
 * 
 * Handles breaking entities and creating debris.
 * This is a world-aware behavior because it needs to create/remove entities.
 */
export class BreakableBehavior extends Behavior {
  static requiredTraits = [TraitType.BREAKABLE];
  
  /**
   * Check if an entity can be broken
   */
  static canBreak(entity: IFEntity): boolean {
    if (!entity.has(TraitType.BREAKABLE)) {
      return false;
    }
    const breakable = entity.get<BreakableTrait>(TraitType.BREAKABLE)!;
    return !breakable.broken;
  }
  
  /**
   * Break the entity
   * @param entity The entity to break
   * @param world The world model (needed to create debris and remove entity)
   * @returns Result describing what happened
   */
  static break(entity: IFEntity, world: WorldModel): IBreakResult {
    if (!entity.has(TraitType.BREAKABLE)) {
      return {
        success: false,
        message: 'Entity is not breakable'
      };
    }
    const breakable = entity.get<BreakableTrait>(TraitType.BREAKABLE)!;
    
    if (breakable.broken) {
      return {
        success: false,
        alreadyBroken: true
      };
    }
    
    // Mark as broken
    breakable.broken = true;
    
    const result: IBreakResult = {
      success: true
    };
    
    // If broken item should be removed (common for fragile items)
    // The action can decide whether to remove based on game logic
    // For now we'll mark that removal is recommended
    result.itemRemoved = false; // Let the action decide
    
    return result;
  }
  
  /**
   * Check if entity is broken
   */
  static isBroken(entity: IFEntity): boolean {
    if (!entity.has(TraitType.BREAKABLE)) {
      return false;
    }
    const breakable = entity.get<BreakableTrait>(TraitType.BREAKABLE)!;
    return breakable.broken;
  }
  
}