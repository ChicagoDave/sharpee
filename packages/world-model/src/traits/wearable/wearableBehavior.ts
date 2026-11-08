// packages/world-model/src/traits/wearable/wearableBehavior.ts

import { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { WearableTrait } from './wearableTrait.js';
import { type ISemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events.js';

export interface IWearResult {
  success: boolean;
  alreadyWorn?: boolean;
  wornByOther?: string;
  /** The placed wearable's layer; absent for a simple one */
  layer?: number;
  wearMessage?: string;
}

export interface IRemoveResult {
  success: boolean;
  notWorn?: boolean;
  wornByOther?: string;
  blocked?: boolean;
  removeMessage?: string;
}

/**
 * Behavior for wearable entities.
 * 
 * Handles the logic for wearing and removing wearable items.
 */
export class WearableBehavior {
  static requiredTraits = [TraitType.WEARABLE];
  
  /**
   * Check if an item can be worn by an actor
   */
  static canWear(item: IFEntity, actor: IFEntity): boolean {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    if (!wearable) return false;
    
    // Can't wear if already worn. Body-part and layering conflicts are the
    // wearing action's validate-phase rule (stdlib wearable-shared, ADR-392 D1).
    if (wearable.worn) return false;

    return true;
  }
  
  /**
   * Check if an item can be removed by an actor
   */
  static canRemove(item: IFEntity, actor: IFEntity): boolean {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    if (!wearable) return false;
    
    // Must be worn to remove
    if (!wearable.worn) return false;
    
    // Must be worn by this actor
    if (wearable.wornBy !== actor.id) return false;
    
    // TODO: Check if other items prevent removal
    
    return true;
  }
  
  /**
   * Wear an item
   * @returns Result object describing what happened
   */
  static wear(item: IFEntity, actor: IFEntity): IWearResult {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    if (!wearable) return { success: false };
    
    if (wearable.worn) {
      if (wearable.wornBy === actor.id) {
        return {
          success: false,
          alreadyWorn: true
        };
      } else {
        return {
          success: false,
          wornByOther: wearable.wornBy
        };
      }
    }
    
    // Wear it
    wearable.worn = true;
    wearable.wornBy = actor.id;

    return {
      success: true,
      layer: wearable.placement?.layer,
      wearMessage: wearable.wearMessage
    };
  }
  
  /**
   * Remove (take off) a worn item
   * @returns Result object describing what happened
   */
  static remove(item: IFEntity, actor: IFEntity): IRemoveResult {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    if (!wearable) return { success: false };
    
    if (!wearable.worn) {
      return {
        success: false,
        notWorn: true
      };
    }
    
    if (wearable.wornBy !== actor.id) {
      return {
        success: false,
        wornByOther: wearable.wornBy
      };
    }
    
    // TODO: Check if other items prevent removal
    
    // Remove it
    wearable.worn = false;
    wearable.wornBy = undefined;
    
    return {
      success: true,
      removeMessage: wearable.removeMessage
    };
  }
  
  /**
   * Check if item is currently worn
   */
  static isWorn(item: IFEntity): boolean {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    return wearable ? wearable.worn : false;
  }
  
  /**
   * Check who is wearing the item
   */
  static getWearer(item: IFEntity): string | undefined {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    return wearable?.wornBy;
  }
  
  /**
   * Get the layer for sorting — undefined for a simple (unplaced) wearable
   */
  static getLayer(item: IFEntity): number | undefined {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    return wearable?.placement?.layer;
  }
}
