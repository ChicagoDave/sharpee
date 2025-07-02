// packages/world-model/src/traits/wearable/wearableBehavior.ts

import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { WearableTrait } from './wearableTrait';
import { SemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';

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
   * Wear an item
   * @returns Events describing what happened
   */
  static wear(item: IFEntity, actor: IFEntity): SemanticEvent[] {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    if (!wearable) return [];
    
    if (wearable.worn) {
      if (wearable.wornBy === actor.id) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: 'wear',
            reason: 'already_wearing'
          }
        )];
      } else {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: 'wear',
            reason: 'worn_by_other',
            wornBy: wearable.wornBy
          }
        )];
      }
    }
    
    // TODO: Check slot conflicts
    
    // Wear it
    wearable.worn = true;
    wearable.wornBy = actor.id;
    
    return [createEvent(
      IFEvents.WORN,
      {
        item: item.id,
        actor: actor.id,
        slot: wearable.slot,
        layer: wearable.layer,
        customMessage: wearable.wearMessage
      }
    )];
  }
  
  /**
   * Remove (take off) a worn item
   * @returns Events describing what happened
   */
  static remove(item: IFEntity, actor: IFEntity): SemanticEvent[] {
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    if (!wearable) return [];
    
    if (!wearable.worn) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: 'remove',
          reason: 'not_wearing'
        }
      )];
    }
    
    if (wearable.wornBy !== actor.id) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: 'remove',
          reason: 'worn_by_other',
          wornBy: wearable.wornBy
        }
      )];
    }
    
    // TODO: Check if other items prevent removal
    
    // Remove it
    wearable.worn = false;
    wearable.wornBy = undefined;
    
    return [createEvent(
      IFEvents.REMOVED,
      {
        item: item.id,
        actor: actor.id,
        customMessage: wearable.removeMessage
      }
    )];
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
