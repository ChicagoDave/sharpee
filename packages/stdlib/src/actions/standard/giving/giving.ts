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
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `givingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  ActorTrait,
  IdentityBehavior,
  findTraitWithCapability,
  CapabilityBehavior,
  CapabilityEffect,
  ITrait
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { GivingEventMap } from './giving-events';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228): BOTH the given item and the recipient
 * are consulted (D3-B published order: direct object first), each side's
 * sharedData seeded with the other entity's identity (D3 sub-ruling —
 * symmetric context, same shape as putting's descriptor).
 *
 * Item-side limitation (ADR-118 hook audit): before this wiring the item
 * side was fully dead — no validate-phase block was possible; giving's
 * only story seam was the recipient's execute-phase-only ADR-090
 * capability behavior (see execute() below). The item slot is declared
 * anyway per the Phase-5 ruling — documenting the limitation beats
 * silently omitting the slot. Note also: when an ADR-090 capability
 * behavior handles the give, report() is delegated to it and no
 * `if.event.given` primary event exists for a postReport override to
 * target (the engine's defensive warn fires instead; `emit` still works).
 */
export const givingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.GIVING,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.GIVING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: entity.id,
        itemName: entity.name,
        recipientId: ctx.command.indirectObject?.entity?.id,
        recipientName: ctx.command.indirectObject?.entity?.name
      })
    },
    {
      id: 'recipient',
      actionIds: [IFActions.GIVING],
      resolve: (ctx) => ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: ctx.command.directObject?.entity?.id,
        itemName: ctx.command.directObject?.entity?.name,
        recipientId: entity.id,
        recipientName: entity.name
      })
    }
  ]
};

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
  /** ADR-090: capability behavior that handled this give (if any) */
  capabilityBehavior?: CapabilityBehavior;
  capabilityTrait?: ITrait;
}

function getGivingSharedData(context: ActionContext): GivingSharedData {
  return context.sharedData as GivingSharedData;
}

function effectsToEvents(effects: CapabilityEffect[], context: ActionContext): ISemanticEvent[] {
  return effects.map(effect => context.event(effect.type, effect.payload));
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

    const state = resolveLifecycle(context, givingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

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
        params: { recipient: nounPhraseFor(recipient) }
      };
    }

    // Prevent giving to self
    if (recipient.id === actor.id) {
      return {
        valid: false,
        error: 'self',
        params: { item: nounPhraseFor(item) }
      };
    }

    // Check inventory capacity
    const recipientActor = recipient.getTrait(ActorTrait);
    if (recipientActor) {
      const limit = recipientActor.capacity ?? (recipientActor as unknown as Record<string, unknown>)['inventoryLimit'] as typeof recipientActor.capacity;

      if (limit) {
        const recipientInventory = context.world.getContents(recipient.id);

        // Check item count
        if (limit.maxItems !== undefined && recipientInventory.length >= limit.maxItems) {
          return {
            valid: false,
            error: 'inventory_full',
            params: { recipient: nounPhraseFor(recipient) }
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
              params: { item: nounPhraseFor(item), recipient: nounPhraseFor(recipient) }
            };
          }
        }
      }
    }

    // Check for preferences (stored in actor's customProperties)
    const preferences = (recipientActor?.customProperties?.['preferences'] ?? (recipientActor as unknown as Record<string, unknown>)?.['preferences']) as Record<string, unknown> | undefined;
    if (preferences) {
      const itemName = item.name.toLowerCase();

      if (preferences.refuses && Array.isArray(preferences.refuses)) {
        for (const refuse of preferences.refuses as string[]) {
          if (itemName.includes(refuse.toLowerCase())) {
            return {
              valid: false,
              error: 'not_interested',
              params: { item: nounPhraseFor(item), recipient: nounPhraseFor(recipient) }
            };
          }
        }
      }
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    // Check if recipient has a capability behavior for giving (ADR-090)
    const capTrait = findTraitWithCapability(recipient, IFActions.GIVING);
    if (capTrait) {
      const behavior = context.world.getBehaviorForCapability(capTrait, IFActions.GIVING);
      if (behavior) {
        sharedData.capabilityBehavior = behavior;
        sharedData.capabilityTrait = capTrait;
        behavior.execute(recipient, context.world, context.player.id, context.sharedData);
        // Interceptor hooks still run after a capability-handled give (ADR-228 D3)
        const capState = getLifecycleState(context);
        if (capState) runPostExecute(context, capState);
        return;
      }
    }

    // Standard: transfer item from actor to recipient
    context.world.moveEntity(item.id, recipient.id);

    // Determine acceptance type based on preferences
    let acceptanceType: 'normal' | 'grateful' | 'reluctant' = 'normal';
    const recipientActor = recipient.getTrait(ActorTrait);
    const preferences = (recipientActor?.customProperties?.['preferences'] ?? (recipientActor as unknown as Record<string, unknown>)?.['preferences']) as Record<string, unknown> | undefined;

    if (preferences) {
      const itemName = item.name.toLowerCase();

      if (preferences.likes && Array.isArray(preferences.likes)) {
        for (const like of preferences.likes as string[]) {
          if (itemName.includes(like.toLowerCase())) {
            acceptanceType = 'grateful';
            break;
          }
        }
      }

      if (acceptanceType === 'normal' && preferences.dislikes && Array.isArray(preferences.dislikes)) {
        for (const dislike of preferences.dislikes as string[]) {
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

    // params carry EntityInfo for the formatter chain (ADR-158)
    sharedData.params = {
      item: nounPhraseFor(item),
      recipient: nounPhraseFor(recipient)
    };

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const recipient = context.command.indirectObject?.entity;
    const events: ISemanticEvent[] = [context.event('if.event.give_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: {
        ...result.params,
        item: item ? nounPhraseFor(item) : undefined,
        recipient: recipient ? nounPhraseFor(recipient) : undefined
      },
      reason: result.error,
      itemId: item?.id,
      itemName: item?.name,
      recipientId: recipient?.id,
      recipientName: recipient?.name
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.give_blocked', result.error);
    }

    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getGivingSharedData(context);
    const events: ISemanticEvent[] = [];

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // If capability behavior handled the give, delegate report to it
    if (sharedData.capabilityBehavior) {
      const recipient = context.command.indirectObject?.entity;
      if (recipient) {
        const effects = sharedData.capabilityBehavior.report(
          recipient, context.world, context.player.id, context.sharedData
        );
        events.push(...effectsToEvents(effects, context));
      }
      // Interceptor hooks still run (ADR-228 D3); note there is no
      // `if.event.given` on this path for an override to target.
      const capState = getLifecycleState(context);
      if (capState) runPostReport(context, capState, events, 'if.event.given');
      return events;
    }

    // Standard: emit given event with messageId for text rendering
    events.push(context.event('if.event.given', {
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: sharedData.params,
      item: sharedData.itemId,
      itemName: sharedData.itemName,
      recipient: sharedData.recipientId,
      recipientName: sharedData.recipientName,
      accepted: true
    }));

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.given');

    return events;
  },

  group: "social"
};
