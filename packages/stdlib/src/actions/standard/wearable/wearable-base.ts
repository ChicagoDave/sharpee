/**
 * Base class for wearable-related actions (wear/remove)
 * Provides shared validation and utility methods
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { IFEntity, WearableTrait, TraitType, WearableBehavior } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

/**
 * Context analysis for wearable actions
 */
export interface WearableContext {
  item: IFEntity;
  actor: IFEntity;
  wearableTrait: WearableTrait;
  inventory: IFEntity[];
}

/**
 * Abstract base class for wearable actions
 */
export abstract class WearableBaseAction implements Action {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly aliases?: string[];
  abstract readonly type: string;
  
  /**
   * Whether this action is wearing (true) or removing (false)
   */
  protected abstract readonly isWearing: boolean;
  
  abstract validate(context: ActionContext): ValidationResult;
  abstract execute(context: ActionContext): ISemanticEvent[];
  
  /**
   * Analyzes the wearable context for an action
   */
  protected analyzeWearableContext(
    context: ActionContext,
    item: IFEntity,
    actor: IFEntity
  ): WearableContext {
    const wearableTrait = item.get(TraitType.WEARABLE) as WearableTrait;
    const inventory = context.world.getContents(actor.id);
    
    return {
      item,
      actor,
      wearableTrait,
      inventory
    };
  }
  
  /**
   * Checks for layering conflicts when wearing an item
   * Returns conflicting item if found, null otherwise
   */
  protected checkWearingConflicts(
    wearableContext: WearableContext
  ): IFEntity | null {
    const { wearableTrait, inventory, actor } = wearableContext;
    
    // If no specific slot requirements, no conflicts
    if (!wearableTrait.bodyPart && wearableTrait.layer === undefined) {
      return null;
    }
    
    // Check for items already worn in the same slot/layer
    for (const invItem of inventory) {
      if (!invItem.has(TraitType.WEARABLE)) continue;
      
      const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
      if (!otherWearable.worn || otherWearable.wornBy !== actor.id) continue;
      
      // Check body part conflict
      if (wearableTrait.bodyPart && otherWearable.bodyPart === wearableTrait.bodyPart) {
        // Check layer conflict if both have layers
        if (wearableTrait.layer !== undefined && otherWearable.layer !== undefined) {
          if (wearableTrait.layer === otherWearable.layer) {
            return invItem; // Same layer conflict
          }
        } else {
          return invItem; // Same body part without layers = conflict
        }
      }
    }
    
    return null;
  }
  
  /**
   * Checks if items are blocking removal (worn on top)
   * Returns blocking item if found, null otherwise
   */
  protected checkRemovalBlockers(
    wearableContext: WearableContext
  ): IFEntity | null {
    const { item, wearableTrait, inventory, actor } = wearableContext;
    
    // If no layer, can't be blocked
    if (wearableTrait.layer === undefined) {
      return null;
    }
    
    // Check for items worn on higher layers
    for (const invItem of inventory) {
      if (invItem === item) continue;
      if (!invItem.has(TraitType.WEARABLE)) continue;
      
      const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
      if (!otherWearable.worn || otherWearable.wornBy !== actor.id) continue;
      
      // Same body part and higher layer = blocking
      if (otherWearable.bodyPart === wearableTrait.bodyPart &&
          otherWearable.layer !== undefined &&
          otherWearable.layer > wearableTrait.layer) {
        return invItem;
      }
    }
    
    return null;
  }
  
  /**
   * Check if item has removal restrictions (e.g., cursed)
   */
  protected hasRemovalRestrictions(wearableTrait: WearableTrait): boolean {
    // Could check for cursed, sticky, etc.
    return false; // For now, no restrictions
  }
}