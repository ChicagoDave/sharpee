/**
 * Giving action - give objects to NPCs or other actors
 *
 * This action handles transferring objects from the player to NPCs.
 * NPCs may accept or refuse items based on their state.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if item can be given to recipient
 * 2. execute: Transfer item, store result in sharedData
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, IdentityBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { GivingEventMap } from './giving-events';

/**
 * Shared data passed between execute and report phases
 */
interface GivingSharedData {
  itemId: string;
  itemName: string;
  recipientId: string;
  recipientName: string;
  acceptanceType: 'normal' | 'grateful' | 'reluctant';
  messageId: string;
  params: Record<string, any>;
}

function getGivingSharedData(context: ActionContext): GivingSharedData {
  return context.sharedData as GivingSharedData;
}

export const givingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.GIVING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
    recipient: ScopeLevel.REACHABLE
  },

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
    directObjectScope: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
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

    // Item must be carried (or implicitly takeable)
    // This enables "give apple to bob" when apple is on the ground
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
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

    // Check inventory capacity
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

  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    const recipient = context.command.indirectObject!.entity!;
    const sharedData = getGivingSharedData(context);

    // Store basic info
    sharedData.itemId = item.id;
    sharedData.itemName = item.name;
    sharedData.recipientId = recipient.id;
    sharedData.recipientName = recipient.name;

    // Actually transfer the item from actor to recipient
    context.world.moveEntity(item.id, recipient.id);

    // Determine acceptance type based on preferences
    let acceptanceType: 'normal' | 'grateful' | 'reluctant' = 'normal';
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

    sharedData.acceptanceType = acceptanceType;

    // Determine success message based on acceptance type
    switch (acceptanceType) {
      case 'grateful':
        sharedData.messageId = 'gratefully_accepts';
        break;
      case 'reluctant':
        sharedData.messageId = 'reluctantly_accepts';
        break;
      default:
        sharedData.messageId = 'given';
    }

    sharedData.params = {
      item: item.name,
      recipient: recipient.name
    };
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const recipient = context.command.indirectObject?.entity;
    return [context.event('if.event.give_blocked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: {
        ...result.params,
        item: item?.name,
        recipient: recipient?.name
      },
      reason: result.error,
      itemId: item?.id,
      itemName: item?.name,
      recipientId: recipient?.id,
      recipientName: recipient?.name
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getGivingSharedData(context);
    const events: ISemanticEvent[] = [];

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Emit given event with messageId for text rendering
    events.push(context.event('if.event.given', {
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: sharedData.params,
      item: sharedData.itemId,
      itemName: sharedData.itemName,
      recipient: sharedData.recipientId,
      recipientName: sharedData.recipientName,
      accepted: true
    }));

    return events;
  },

  group: "social"
};
