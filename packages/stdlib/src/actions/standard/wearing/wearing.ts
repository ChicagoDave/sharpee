/**
 * Wearing action - put on clothing or wearable items
 * 
 * This action handles wearing items that have the WEARABLE trait.
 * It validates that the item can be worn and isn't already worn.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { WornEventData, ImplicitTakenEventData } from './wearing-events';

export const wearingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    
    // Must have an item to wear
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if item is wearable
    if (!item.has(TraitType.WEARABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_wearable',
        reason: 'not_wearable',
        params: { item: item.name }
      })];
    }
    
    const wearableTrait = item.get(TraitType.WEARABLE) as WearableTrait;
    
    // Check if already worn
    if (wearableTrait.worn) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_wearing',
        reason: 'already_wearing',
        params: { item: item.name }
      })];
    }
    
    // Check if actor is holding the item
    const itemLocation = context.world.getLocation?.(item.id);
    const events: SemanticEvent[] = [];
    
    if (itemLocation !== actor.id) {
      // Check if it's in the same room (can pick up and wear)
      if (itemLocation === context.world.getLocation?.(actor.id)) {
        // Add implicit TAKEN event
        const implicitTakenData: ImplicitTakenEventData = {
          implicit: true,
          item: item.name
        };
        events.push(context.event('if.event.taken', implicitTakenData));
      } else {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_held',
        reason: 'not_held',
        params: { item: item.name }
      })];
      }
    }
    
    // Check for body part conflicts (but not if items can be layered)
    if (wearableTrait.bodyPart && wearableTrait.layer === undefined) {
      // Find other worn items on the same body part
      const inventory = context.world.getContents(actor.id);
      const conflictingItem = inventory.find(invItem => {
        if (invItem.id === item.id) return false;
        if (!invItem.has(TraitType.WEARABLE)) return false;
        
        const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
        return otherWearable.worn && 
               otherWearable.bodyPart === wearableTrait.bodyPart &&
               otherWearable.layer === undefined; // Only conflict if neither has layers
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
      const inventory = context.world.getContents(actor.id);
      const wornItems = inventory.filter(invItem => {
        if (!invItem.has(TraitType.WEARABLE)) return false;
        const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
        return otherWearable.worn;
      });
      
      // Check if trying to wear something under existing layers
      for (const wornItem of wornItems) {
        const otherWearable = wornItem.get(TraitType.WEARABLE) as WearableTrait;
        if (otherWearable.layer !== undefined && 
            otherWearable.layer > wearableTrait.layer &&
            otherWearable.bodyPart === wearableTrait.bodyPart) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'hands_full',
        reason: 'hands_full' // Using this message as a proxy for layer conflicts
      })];
        }
      }
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
  }
};
