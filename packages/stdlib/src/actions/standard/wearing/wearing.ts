/**
 * Wearing action - put on clothing or wearable items
 * 
 * This action handles wearing items that have the WEARABLE trait.
 * It validates that the item can be worn and isn't already worn.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { WornEventData, ImplicitTakenEventData } from './wearing-events';

export const wearingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.WEARING,
  requiredMessages: [
    'no_target',
    'not_wearable',
    'not_held',
    'already_wearing',
    'worn',
    'cant_wear_that',
    'hands_full'
  ],
  group: 'wearable_manipulation',
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    
    if (!item) {
      return { valid: false, error: 'no_target' };
    }
    
    if (!item.has(TraitType.WEARABLE)) {
      return { valid: false, error: 'not_wearable' };
    }
    
    if (!WearableBehavior.canWear(item, actor)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      if (wearable.worn) {
        return { valid: false, error: 'already_wearing' };
      }
      return { valid: false, error: 'cant_wear_that' };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    const wearableTrait = item.get(TraitType.WEARABLE) as WearableTrait;
    
    // Scope checks handled by framework due to directObjectScope: REACHABLE
    
    // Check if actor is holding the item
    const itemLocation = context.world.getLocation?.(item.id);
    const events: ISemanticEvent[] = [];
    
    if (itemLocation !== actor.id) {
      // Add implicit TAKEN event since item is reachable
      const implicitTakenData: ImplicitTakenEventData = {
        implicit: true,
        item: item.name
      };
      events.push(context.event('if.event.taken', implicitTakenData));
    }
    
    // Check for conflicts before wearing (this logic stays in action for now)
    // TODO: Move conflict checking into WearableBehavior
    if (wearableTrait.bodyPart) {
      const inventory = context.world.getContents(actor.id);
      
      // Check for body part conflicts (but not if items can be layered)
      if (wearableTrait.layer === undefined) {
        const conflictingItem = inventory.find(invItem => {
          if (invItem.id === item.id) return false;
          if (!invItem.has(TraitType.WEARABLE)) return false;
          
          const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
          return otherWearable.worn && 
                 otherWearable.bodyPart === wearableTrait.bodyPart &&
                 otherWearable.layer === undefined;
        });
        
        if (conflictingItem) {
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'already_wearing',
            reason: 'already_wearing',
            params: { item: conflictingItem.name }
          })];
        }
      }
      
      // Check for layering rules
      if (wearableTrait.layer !== undefined) {
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
            return [context.event('action.error', {
              actionId: context.action.id,
              messageId: 'hands_full',
              reason: 'hands_full'
            })];
          }
        }
      }
    }
    
    // Delegate state change to behavior
    const result = WearableBehavior.wear(item, actor);
    
    // Handle failure cases (defensive checks)
    if (!result.success) {
      if (result.alreadyWorn) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_wearing',
          reason: 'already_wearing',
          params: { item: item.name }
        })];
      }
      if (result.wornByOther) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_wearing',
          reason: 'worn_by_other',
          params: { item: item.name, wornBy: result.wornByOther }
        })];
      }
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_wear_that',
        reason: 'cant_wear_that',
        params: { item: item.name }
      })];
    }
    
    // Build message params for success message
    const params: Record<string, unknown> = {
      item: item.name
    };
    
    // Add body part to message params if specified
    if (wearableTrait.bodyPart) {
      params.bodyPart = wearableTrait.bodyPart;
    }
    
    // Create WORN event for world model updates
    const wornData: WornEventData = {
      itemId: item.id,
      bodyPart: wearableTrait.bodyPart,
      layer: wearableTrait.layer
    };
    events.push(context.event('if.event.worn', wornData));
    
    // Create success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'worn',
        params: params
      }));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
