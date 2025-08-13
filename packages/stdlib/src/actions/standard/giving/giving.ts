/**
 * Giving action - give objects to NPCs or other actors
 * 
 * This action handles transferring objects from the player to NPCs.
 * NPCs may accept or refuse items based on their state.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, ActorBehavior, IdentityBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { GivingEventMap } from './giving-events';

export const givingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.GIVING,
  requiredMessages: [
    'no_item',
    'no_recipient',
    'not_holding',
    'recipient_not_visible',
    'recipient_not_reachable',
    'not_actor',
    'self',
    'inventory_full',
    'too_heavy',
    'not_interested',
    'refuses',
    'given',
    'accepts',
    'gratefully_accepts',
    'reluctantly_accepts'
  ],
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.REACHABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const recipient = context.command.indirectObject?.entity;
    
    // Validate we have both item and recipient
    if (!item) {
      return { 
        valid: false, 
        error: 'no_item',
        params: {}
      };
    }
    
    if (!recipient) {
      return { 
        valid: false, 
        error: 'no_recipient',
        params: {}
      };
    }
    
    // Check if recipient is an actor (can receive items)
    if (!recipient.has(TraitType.ACTOR)) {
      return { 
        valid: false, 
        error: 'not_actor',
        params: { recipient: recipient.name }
      };
    }
    
    // Prevent giving to self
    if (recipient.id === actor.id) {
      return { 
        valid: false, 
        error: 'self',
        params: { item: item.name }
      };
    }
    
    // Check inventory capacity - handle both capacity and inventoryLimit for backwards compatibility
    const recipientActor = recipient.get(TraitType.ACTOR) as any;
    if (recipientActor) {
      const limit = recipientActor.capacity || recipientActor.inventoryLimit;
      
      if (limit) {
        const recipientInventory = context.world.getContents(recipient.id);
        
        // Check item count
        if (limit.maxItems !== undefined && recipientInventory.length >= limit.maxItems) {
          return { 
            valid: false, 
            error: 'inventory_full',
            params: { recipient: recipient.name }
          };
        }
        
        // Check weight
        if (limit.maxWeight !== undefined) {
          const currentWeight = recipientInventory.reduce((sum, e) => {
            return sum + IdentityBehavior.getWeight(e);
          }, 0);
          const itemWeight = IdentityBehavior.getWeight(item);
          
          if (currentWeight + itemWeight > limit.maxWeight) {
            return { 
              valid: false, 
              error: 'too_heavy',
              params: { item: item.name, recipient: recipient.name }
            };
          }
        }
      }
    }
    
    // Check for preferences (stored directly on actor trait)
    const preferences = (recipientActor as any)?.preferences;
    if (preferences) {
      const itemName = item.name.toLowerCase();
      
      if (preferences.refuses && Array.isArray(preferences.refuses)) {
        for (const refuse of preferences.refuses) {
          if (itemName.includes(refuse.toLowerCase())) {
            return { 
              valid: false, 
              error: 'not_interested',
              params: { item: item.name, recipient: recipient.name }
            };
          }
        }
      }
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    // Call validate at the start
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error,
        reason: validation.error,
        params: validation.params || {}
      })];
    }
    
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    const recipient = context.command.indirectObject?.entity!;
    
    // Determine acceptance type based on preferences
    let acceptanceType = 'normal';
    const recipientActor = recipient.get(TraitType.ACTOR) as any;
    const preferences = recipientActor?.preferences;
    
    if (preferences) {
      const itemName = item.name.toLowerCase();
      
      if (preferences.likes && Array.isArray(preferences.likes)) {
        for (const like of preferences.likes) {
          if (itemName.includes(like.toLowerCase())) {
            acceptanceType = 'grateful';
            break;
          }
        }
      }
      
      if (acceptanceType === 'normal' && preferences.dislikes && Array.isArray(preferences.dislikes)) {
        for (const dislike of preferences.dislikes) {
          if (itemName.includes(dislike.toLowerCase())) {
            acceptanceType = 'reluctant';
            break;
          }
        }
      }
    }
    
    // Build event data
    const eventData: GivingEventMap['if.event.given'] = {
      item: item.id,
      itemName: item.name,
      recipient: recipient.id,
      recipientName: recipient.name,
      accepted: true
    };
    
    const params: Record<string, any> = {
      item: item.name,
      recipient: recipient.name
    };
    
    // Determine success message based on acceptance type
    let messageId: string;
    switch (acceptanceType) {
      case 'grateful':
        messageId = 'gratefully_accepts';
        break;
      case 'reluctant':
        messageId = 'reluctantly_accepts';
        break;
      default:
        messageId = 'given';
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create GIVEN event for world model
    events.push(context.event('if.event.given', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params
      }));
    
    return events;
  },
  
  group: "social"
};
