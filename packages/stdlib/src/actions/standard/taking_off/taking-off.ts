/**
 * Taking off action - remove worn clothing or equipment
 * 
 * This action handles removing items that are currently worn.
 * It validates layering rules and provides appropriate feedback.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { RemovedEventData } from './taking-off-events';
import {
  analyzeWearableContext,
  checkRemovalBlockers,
  buildWearableEventParams,
  createWearableErrorEvent,
  createWearableSuccessEvent,
  hasRemovalRestrictions
} from '../wearable-shared';

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
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    
    if (!item) {
      return { valid: false, error: 'no_target' };
    }
    
    if (!item.has(TraitType.WEARABLE)) {
      return { valid: false, error: 'not_wearing' };
    }
    
    if (!WearableBehavior.canRemove(item, actor)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      if (!wearable.worn) {
        return { valid: false, error: 'not_wearing' };
      }
      if (wearable.wornBy !== actor.id) {
        return { valid: false, error: 'not_wearing' };
      }
      return { valid: false, error: 'cant_remove' };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    
    // Analyze the wearable context
    const wearableContext = analyzeWearableContext(context, item, actor);
    const { wearableTrait } = wearableContext;
    
    // Check for layering conflicts using shared helper
    const blockingItem = checkRemovalBlockers(wearableContext);
    if (blockingItem) {
      return [createWearableErrorEvent(context, 'prevents_removal', 'prevents_removal', { 
        blocking: blockingItem.name 
      })];
    }
    
    // Check if removing this would cause problems (e.g., cursed items)
    if (hasRemovalRestrictions(wearableTrait)) {
      return [createWearableErrorEvent(context, 'cant_remove', 'cant_remove', { 
        item: item.name 
      })];
    }
    
    // Delegate state change to behavior
    const result = WearableBehavior.remove(item, actor);
    
    // Handle failure cases (defensive checks)
    if (!result.success) {
      if (result.notWorn) {
        return [createWearableErrorEvent(context, 'not_wearing', 'not_wearing', { 
          item: item.name 
        })];
      }
      if (result.wornByOther) {
        return [createWearableErrorEvent(context, 'not_wearing', 'worn_by_other', { 
          item: item.name, 
          wornBy: result.wornByOther 
        })];
      }
      return [createWearableErrorEvent(context, 'cant_remove', 'cant_remove', { 
        item: item.name 
      })];
    }
    
    // Build event data using shared helper
    const eventData = buildWearableEventParams(item, wearableTrait);
    
    const events: ISemanticEvent[] = [];
    
    // Create REMOVED event for world model updates
    const removedData: RemovedEventData = {
      itemId: item.id,
      bodyPart: wearableTrait.bodyPart,
      layer: wearableTrait.layer
    };
    events.push(context.event('if.event.removed', removedData));
    
    // Create success message using shared helper
    events.push(createWearableSuccessEvent(context, 'removed', eventData));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
