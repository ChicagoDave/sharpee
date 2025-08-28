/**
 * Remove action - take off worn items
 * Part of the wearable family of actions
 */

import { ActionContext, ValidationResult } from '../../../enhanced-types';
import { IFEntity, TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../../constants';
import { WearableBaseAction } from '../wearable-base';
import { RemovedEventData } from './remove-events';

/**
 * Remove action - takes off worn items
 */
export class RemoveAction extends WearableBaseAction {
  readonly id = IFActions.TAKING_OFF;
  readonly name = 'remove';
  readonly aliases = ['take off', 'doff'];
  readonly type = 'manipulation';
  protected readonly isWearing = false;
  
  /**
   * Validates whether the remove action can be performed
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
    
    // Check if worn
    if (!wearable.worn) {
      return { 
        valid: false, 
        error: 'not_wearing',
        params: { item: item.name }
      };
    }
    
    // Check if worn by this actor
    if (wearable.wornBy !== actor.id) {
      return { 
        valid: false, 
        error: 'not_wearing_that',
        params: { item: item.name }
      };
    }
    
    // Check for removal blockers (items worn on top)
    const wearableContext = this.analyzeWearableContext(context, item, actor);
    const blockingItem = this.checkRemovalBlockers(wearableContext);
    if (blockingItem) {
      return { 
        valid: false, 
        error: 'blocked_by_item',
        params: { 
          item: item.name,
          blocking: blockingItem.name 
        }
      };
    }
    
    // Check for removal restrictions (e.g., cursed items)
    if (this.hasRemovalRestrictions(wearable)) {
      return { 
        valid: false, 
        error: 'cant_remove',
        params: { item: item.name }
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Executes the remove action
   */
  execute(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    
    // Remove the item using behavior
    const result = WearableBehavior.remove(item, actor);
    
    // The validation should have caught any issues, but let's be safe
    if (!result.success) {
      throw new Error(`Remove failed unexpectedly: ${JSON.stringify(result)}`);
    }
    
    // Emit the removed event with minimal data
    const eventData: RemovedEventData = {
      item: item.id,
      itemName: item.name
    };
    
    const events: ISemanticEvent[] = [];
    
    events.push(context.event('if.event.removed', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: 'removed',
      params: {
        item: item.name
      }
    }));
    
    return events;
  }
}