/**
 * Giving action - give objects to NPCs or other actors
 * 
 * This action handles transferring objects from the player to NPCs.
 * NPCs may accept or refuse items based on their state.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, ActorTrait, IdentityTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { GivingEventMap } from './giving-events';

export const givingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const recipient = context.command.indirectObject?.entity;
    
    // Validate we have both item and recipient
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_item',
        reason: 'no_item'
      })];
    }
    
    if (!recipient) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_recipient',
        reason: 'no_recipient'
      })];
    }
    
    // Check if actor is holding the item
    const itemLocation = context.world.getLocation(item.id);
    if (itemLocation !== actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_holding',
        reason: 'not_holding',
        params: { item: item.name }
      })];
    }
    
    // Check if recipient is visible
    if (!context.canSee(recipient)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'recipient_not_visible',
        reason: 'recipient_not_visible',
        params: { recipient: recipient.name }
      })];
    }
    
    // Check if recipient is reachable
    if (!context.canReach(recipient)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'recipient_not_reachable',
        reason: 'recipient_not_reachable',
        params: { recipient: recipient.name }
      })];
    }
    
    // Check if recipient is an actor (can receive items)
    if (!recipient.has(TraitType.ACTOR)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_actor',
        reason: 'not_actor'
      })];
    }
    
    // Prevent giving to self
    if (recipient.id === actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'self',
        reason: 'self',
        params: { item: item.name }
      })];
    }
    
    // Check if the recipient is willing to accept items
    const recipientActor = recipient.get(TraitType.ACTOR) as ActorTrait | undefined;
    let willAccept = true;
    let refusalReason: string | undefined;
    let acceptanceType = 'normal';
    
    // Check if recipient has custom acceptance logic
    // This is where game-specific logic would determine acceptance
    
    // 1. Check if recipient has inventory capacity
    if (recipientActor && ((recipientActor as any).inventoryLimit?.maxWeight !== undefined || 
                          (recipientActor as any).inventoryLimit?.maxItems !== undefined)) {
      const recipientInventory = context.world.getContents(recipient.id);
      
      // Check item count
      if ((recipientActor as any).inventoryLimit?.maxItems !== undefined && 
          recipientInventory.length >= (recipientActor as any).inventoryLimit.maxItems) {
        willAccept = false;
        refusalReason = 'inventory_full';
      }
      
      // Check weight
      if (willAccept && (recipientActor as any).inventoryLimit?.maxWeight !== undefined && 
          item.has(TraitType.IDENTITY)) {
        const itemIdentity = item.get(TraitType.IDENTITY) as IdentityTrait;
        if (itemIdentity.weight) {
          const currentWeight = recipientInventory.reduce((sum, e) => {
            if (e.has(TraitType.IDENTITY)) {
              const identity = e.get(TraitType.IDENTITY) as IdentityTrait;
              return sum + (identity.weight || 0);
            }
            return sum;
          }, 0);
          
          if (currentWeight + itemIdentity.weight > (recipientActor as any).inventoryLimit.maxWeight) {
            willAccept = false;
            refusalReason = 'too_heavy';
          }
        }
      }
    }
    
    // Check if NPC has preferences about items
    if (willAccept && (recipientActor as any).preferences) {
      const prefs = (recipientActor as any).preferences;
      const itemName = item.name.toLowerCase();
      
      if (prefs.likes && prefs.likes.some((like: string) => itemName.includes(like))) {
        acceptanceType = 'grateful';
      } else if (prefs.dislikes && prefs.dislikes.some((dislike: string) => itemName.includes(dislike))) {
        acceptanceType = 'reluctant';
      } else if (prefs.refuses && prefs.refuses.some((refuse: string) => itemName.includes(refuse))) {
        willAccept = false;
        refusalReason = 'not_interested';
      }
    }
    
    // Build event data
    const eventData: GivingEventMap['if.event.given'] = {
      item: item.id,
      itemName: item.name,
      recipient: recipient.id,
      recipientName: recipient.name,
      accepted: willAccept
    };
    
    const params: Record<string, any> = {
      item: item.name,
      recipient: recipient.name
    };
    
    if (!willAccept) {
      eventData.refusalReason = refusalReason;
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: refusalReason || 'refuses',
        params
      })];
    }
    
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
