/**
 * Shared helpers for wearing and taking_off actions
 * 
 * Centralizes common logic for wearable item manipulation including:
 * - Layering conflict detection
 * - Event data building
 * - Wearable validation helpers
 */

import { ActionContext } from '../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, TraitType, WearableTrait } from '@sharpee/world-model';

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
 * Analyzes the wearable context for an action
 */
export function analyzeWearableContext(
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
export function checkWearingConflicts(
  wearableContext: WearableContext
): IFEntity | null {
  const { item, wearableTrait, inventory } = wearableContext;
  
  // Check for body part conflicts (non-layered items)
  if (wearableTrait.bodyPart && wearableTrait.layer === undefined) {
    const conflictingItem = inventory.find(invItem => {
      if (invItem.id === item.id) return false;
      if (!invItem.has(TraitType.WEARABLE)) return false;
      
      const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
      return otherWearable.worn && 
             otherWearable.bodyPart === wearableTrait.bodyPart &&
             otherWearable.layer === undefined;
    });
    
    if (conflictingItem) {
      return conflictingItem;
    }
  }
  
  // Check for layering rule violations
  if (wearableTrait.layer !== undefined && wearableTrait.bodyPart) {
    const wornItems = inventory.filter(invItem => {
      if (!invItem.has(TraitType.WEARABLE)) return false;
      const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
      return otherWearable.worn;
    });
    
    for (const wornItem of wornItems) {
      const otherWearable = wornItem.get(TraitType.WEARABLE) as WearableTrait;
      if (otherWearable.layer !== undefined && 
          otherWearable.layer > wearableTrait.layer &&
          otherWearable.bodyPart === wearableTrait.bodyPart) {
        return wornItem; // Can't wear under something already worn
      }
    }
  }
  
  return null;
}

/**
 * Checks for items blocking removal due to layering
 * Returns blocking item if found, null otherwise
 */
export function checkRemovalBlockers(
  wearableContext: WearableContext
): IFEntity | null {
  const { item, wearableTrait, inventory } = wearableContext;
  
  if (wearableTrait.layer !== undefined && wearableTrait.bodyPart) {
    const blockingItem = inventory.find(invItem => {
      if (invItem.id === item.id) return false;
      if (!invItem.has(TraitType.WEARABLE)) return false;
      
      const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
      return otherWearable.worn && 
             otherWearable.layer !== undefined &&
             otherWearable.layer > wearableTrait.layer &&
             otherWearable.bodyPart === wearableTrait.bodyPart;
    });
    
    return blockingItem || null;
  }
  
  return null;
}

/**
 * Builds event parameters including body part and layer info
 */
export function buildWearableEventParams(
  item: IFEntity,
  wearableTrait: WearableTrait
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    item: item.name
  };
  
  if (wearableTrait.bodyPart) {
    params.bodyPart = wearableTrait.bodyPart;
  }
  
  if (wearableTrait.layer !== undefined) {
    params.layer = wearableTrait.layer;
  }
  
  return params;
}

/**
 * Creates an error event for wearable actions
 */
export function createWearableErrorEvent(
  context: ActionContext,
  messageId: string,
  reason: string,
  params?: Record<string, unknown>
): ISemanticEvent {
  return context.event('action.error', {
    actionId: context.action.id,
    messageId,
    reason,
    params: params || {}
  });
}

/**
 * Creates a success event for wearable actions
 */
export function createWearableSuccessEvent(
  context: ActionContext,
  messageId: string,
  params: Record<string, unknown>
): ISemanticEvent {
  return context.event('action.success', {
    actionId: context.action.id,
    messageId,
    params
  });
}

/**
 * Checks if an item is currently worn by the actor
 */
export function isWornByActor(
  item: IFEntity,
  actor: IFEntity
): boolean {
  if (!item.has(TraitType.WEARABLE)) return false;
  
  const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
  return wearable.worn && wearable.wornBy === actor.id;
}

/**
 * Checks if an item has special removal restrictions
 */
export function hasRemovalRestrictions(
  wearableTrait: WearableTrait
): boolean {
  // Check for cursed or otherwise unremovable items
  return !!(wearableTrait as any).cursed;
}