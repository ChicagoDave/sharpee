/**
 * Wear action - put on clothing or wearable items
 * Part of the wearable family of actions
 */

import { ActionContext, ValidationResult } from '../../../enhanced-types';
import { IFEntity, TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../../constants';
import { WearableBaseAction } from '../wearable-base';
import { WornEventData } from './wear-events';

/**
 * Wear action - puts on wearable items
 */
export class WearAction extends WearableBaseAction {
  readonly id = IFActions.WEARING;
  readonly name = 'wear';
  readonly aliases = ['put on', 'don'];
  readonly type = 'manipulation';
  protected readonly isWearing = true;
  
  /**
   * Validates whether the wear action can be performed
   */
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    
    if (!item) {
      return { 
        valid: false, 
        error: 'no_target' 
      };
    }
    
    if (!item.has(TraitType.WEARABLE)) {
      return { 
        valid: false, 
        error: 'not_wearable',
        params: { item: item.name }
      };
    }
    
    const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
    
    // Check if already worn
    if (wearable.worn) {
      if (wearable.wornBy === actor.id) {
        return { 
          valid: false, 
          error: 'already_wearing',
          params: { item: item.name }
        };
      } else {
        return { 
          valid: false, 
          error: 'worn_by_other',
          params: { item: item.name }
        };
      }
    }
    
    // Check if can be worn by this actor
    if (!WearableBehavior.canWear(item, actor)) {
      return { 
        valid: false, 
        error: 'cant_wear_that',
        params: { item: item.name }
      };
    }
    
    // Check for conflicts
    const wearableContext = this.analyzeWearableContext(context, item, actor);
    const conflictingItem = this.checkWearingConflicts(wearableContext);
    if (conflictingItem) {
      return { 
        valid: false, 
        error: 'already_wearing_something',
        params: { 
          item: item.name,
          conflicting: conflictingItem.name 
        }
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Executes the wear action
   */
  execute(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    
    const events: ISemanticEvent[] = [];
    
    // Check if we need to implicitly take the item first
    const itemLocation = context.world.getLocation(item.id);
    let implicitTake = false;
    
    if (itemLocation !== actor.id) {
      // Move item to actor (implicit take)
      context.world.moveEntity(item.id, actor.id);
      implicitTake = true;
      
      // Add implicit taken event
      events.push(context.event('if.event.taken', {
        item: item.id,
        itemName: item.name,
        implicit: true
      }));
    }
    
    // Wear the item using behavior
    const result = WearableBehavior.wear(item, actor);
    
    // The validation should have caught any issues, but let's be safe
    if (!result.success) {
      throw new Error(`Wear failed unexpectedly: ${JSON.stringify(result)}`);
    }
    
    // Emit the worn event with minimal data
    const eventData: WornEventData = {
      item: item.id,
      itemName: item.name
    };
    
    events.push(context.event('if.event.worn', eventData));
    
    // Add success message
    const messageId = implicitTake ? 'taken_and_worn' : 'worn';
    
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: messageId,
      params: {
        item: item.name
      }
    }));
    
    return events;
  }
}