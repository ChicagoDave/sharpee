/**
 * Taking off action - remove worn clothing or equipment
 * 
 * This action handles removing items that are currently worn.
 * It validates layering rules and provides appropriate feedback.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { RemovedEventData } from './taking-off-events';

export const takingOffAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TAKING_OFF,
  requiredMessages: [
    'no_target',
    'not_wearing',
    'removed',
    'cant_remove',
    'prevents_removal'
  ],
  group: 'wearable_manipulation',
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    
    // Must have an item to take off
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Scope checks handled by framework due to directObjectScope: CARRIED
    
    // Check if item is wearable
    if (!item.has(TraitType.WEARABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_wearing',
        reason: 'not_wearing',
        params: { item: item.name }
      })];
    }
    
    const wearableTrait = item.get(TraitType.WEARABLE) as WearableTrait;
    
    // Check if actually worn
    if (!wearableTrait.worn) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_wearing',
        reason: 'not_wearing',
        params: { item: item.name }
      })];
    }
    
    // Check for layering conflicts - can't remove if something is worn over it
    if (wearableTrait.layer !== undefined && wearableTrait.bodyPart) {
      const inventory = context.world.getContents(actor.id);
      const blockingItem = inventory.find(invItem => {
        if (invItem.id === item.id) return false;
        if (!invItem.has(TraitType.WEARABLE)) return false;
        
        const otherWearable = invItem.get(TraitType.WEARABLE) as WearableTrait;
        return otherWearable.worn && 
               otherWearable.layer !== undefined &&
               otherWearable.layer > wearableTrait.layer &&
               otherWearable.bodyPart === wearableTrait.bodyPart;
      });
      
      if (blockingItem) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'prevents_removal',
        reason: 'prevents_removal',
        params: { blocking: blockingItem.name }
      })];
      }
    }
    
    // Check if removing this would cause problems (e.g., cursed items)
    if ((wearableTrait as any).cursed) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_remove',
        reason: 'cant_remove',
        params: { item: item.name }
      })];
    }
    
    // Build event data
    const eventData: Record<string, unknown> = {
      item: item.name
    };
    
    if (wearableTrait.bodyPart) {
      eventData.bodyPart = wearableTrait.bodyPart;
    }
    
    if (wearableTrait.layer !== undefined) {
      eventData.layer = wearableTrait.layer;
    }
    
    const events: SemanticEvent[] = [];
    
    // Create REMOVED event for world model updates
    const removedData: RemovedEventData = {
      itemId: item.id,
      bodyPart: wearableTrait.bodyPart,
      layer: wearableTrait.layer
    };
    events.push(context.event('if.event.removed', removedData));
    
    // Create success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'removed',
        params: eventData
      }));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
