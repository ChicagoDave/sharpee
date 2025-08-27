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
import {
  analyzeWearableContext,
  checkWearingConflicts,
  buildWearableEventParams,
  createWearableErrorEvent,
  createWearableSuccessEvent
} from '../wearable-shared';

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
    
    // Analyze the wearable context
    const wearableContext = analyzeWearableContext(context, item, actor);
    const { wearableTrait } = wearableContext;
    
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
    
    // Check for wearing conflicts using shared helper
    const conflictingItem = checkWearingConflicts(wearableContext);
    if (conflictingItem) {
      const messageId = wearableTrait.layer !== undefined ? 'hands_full' : 'already_wearing';
      return [createWearableErrorEvent(context, messageId, messageId, { 
        item: conflictingItem.name 
      })];
    }
    
    // Delegate state change to behavior
    const result = WearableBehavior.wear(item, actor);
    
    // Handle failure cases (defensive checks)
    if (!result.success) {
      if (result.alreadyWorn) {
        return [createWearableErrorEvent(context, 'already_wearing', 'already_wearing', { 
          item: item.name 
        })];
      }
      if (result.wornByOther) {
        return [createWearableErrorEvent(context, 'already_wearing', 'worn_by_other', { 
          item: item.name, 
          wornBy: result.wornByOther 
        })];
      }
      return [createWearableErrorEvent(context, 'cant_wear_that', 'cant_wear_that', { 
        item: item.name 
      })];
    }
    
    // Build message params using shared helper
    const params = buildWearableEventParams(item, wearableTrait);
    
    // Create WORN event for world model updates
    const wornData: WornEventData = {
      itemId: item.id,
      bodyPart: wearableTrait.bodyPart,
      layer: wearableTrait.layer
    };
    events.push(context.event('if.event.worn', wornData));
    
    // Create success message using shared helper
    events.push(createWearableSuccessEvent(context, 'worn', params));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
