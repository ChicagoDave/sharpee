// packages/world-model/src/traits/wearable/wearableBehavior.ts

import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { WearableTrait } from './wearableTrait';
import { ISemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';

export interface IWearResult {
  success: boolean;
  alreadyWorn?: boolean;
  wornByOther?: string;
  slotConflict?: string;
  slot?: string;
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
    
    // Can't wear if already worn
    if (wearable.worn) return false;
    
    // TODO: Check if actor has conflicting items in same slot
    // TODO: Check if slots are blocked
    
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
    
    // TODO: Check slot conflicts
    
    // Wear it
    wearable.worn = true;
    wearable.wornBy = actor.id;
    
    return {
      success: true,
      slot: wearable.slot,
      layer: wearable.layer,
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
   * Get the slot this item occupies
   */
  static getSlot(item: IFEntity): string {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    return wearable ? wearable.slot : 'clothing';
  }
  
  /**
   * Get the layer for sorting
   */
  static getLayer(item: IFEntity): number {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    return wearable ? wearable.layer : 1;
  }
  
  /**
   * Check if this item blocks any slots
   */
  static getBlockedSlots(item: IFEntity): string[] {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    return wearable ? [...wearable.blocksSlots] : [];
  }
}
