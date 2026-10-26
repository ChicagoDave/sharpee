/**
 * Asking-for action — a request for a thing (ADR-372 D3).
 *
 * `ask <person> for <thing>` validates the social preconditions asking has
 * (the person is seen, here, and a person), refuses asking oneself and
 * asking for what the actor already holds, mutates nothing, and reports one
 * `if.event.asked_for` whose stock line is a refusal. A story answers the
 * request — hands the thing over, or says why not — through a Chord
 * `on the player asking_for` clause on either noun, which rides the
 * ordinary lifecycle hooks and speaks in the stock line's place.
 *
 * Distinct from `asking` (`ask <person> about <topic>`), which matches a
 * topic: this action names a thing.
 *
 * Uses four-phase pattern:
 * 1. validate: the person is present and a person; the thing is not held
 * 2. execute: no world mutations
 * 3. blocked: a refusal or a story's veto
 * 4. report: emits if.event.asked_for with the stock refusal
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `askingForLifecycle`: the person and the thing are
 * both consultable, each naming the other as its counterpart (ADR-372 D1).
 *
 * Public interface: askingForAction, askingForLifecycle.
 * Owner context: stdlib / standard actions / social
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { AskedForEventData } from './asking-for-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the person asked (direct object) and the
 * thing asked for (indirect object), in that order.
 */
export const askingForLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.ASKING_FOR,
  reportEventType: 'if.event.asked_for',
  blockedEventType: 'if.event.ask_for_blocked',
  slots: [
    {
      id: 'recipient',
      actionIds: [IFActions.ASKING_FOR],
      resolve: (ctx) => ctx.command.directObject?.entity,
      counterpart: (ctx) => ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({
        recipientId: entity.id,
        recipientName: entity.name,
        itemId: ctx.command.indirectObject?.entity?.id,
        itemName: ctx.command.indirectObject?.entity?.name
      })
    },
    {
      id: 'item',
      actionIds: [IFActions.ASKING_FOR],
      resolve: (ctx) => ctx.command.indirectObject?.entity,
      counterpart: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({
        recipientId: ctx.command.directObject?.entity?.id,
        recipientName: ctx.command.directObject?.entity?.name,
        itemId: entity.id,
        itemName: entity.name
      })
    }
  ]
};

export const askingForAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ASKING_FOR,

  defaultScope: {
    recipient: ScopeLevel.AWARE,
    item: ScopeLevel.VISIBLE
  },

  requiredMessages: [
    'no_target',
    'no_item',
    'not_visible',
    'too_far',
    'not_actor',
    'self',
    'already_have',
    'refused'
  ],

  group: 'social',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.AWARE,
    indirectObjectScope: ScopeLevel.VISIBLE
  },

  validate(context: ActionContext): ValidationResult {
    const recipient = context.command.directObject?.entity;
    const item = context.command.indirectObject?.entity;
    if (!recipient) {
      return { valid: false, error: 'no_target' };
    }
    if (!item) {
      return { valid: false, error: 'no_item', params: { recipient: nounPhraseFor(recipient) } };
    }
    if (recipient.id === context.actor.id) {
      return { valid: false, error: 'self' };
    }
    if (!context.canSee(recipient)) {
      return { valid: false, error: 'not_visible', params: { recipient: nounPhraseFor(recipient) } };
    }
    if (context.world.getLocation(recipient.id) !== context.world.getLocation(context.actor.id)) {
      return { valid: false, error: 'too_far', params: { recipient: nounPhraseFor(recipient) } };
    }
    if (!recipient.has(TraitType.ACTOR)) {
      return { valid: false, error: 'not_actor', params: { recipient: nounPhraseFor(recipient) } };
    }
    if (context.world.getLocation(item.id) === context.actor.id) {
      return { valid: false, error: 'already_have', params: { item: nounPhraseFor(item) } };
    }
    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // Asking for a thing mutates nothing — a story's clause does the handing over.
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const recipient = context.command.directObject?.entity;
    const item = context.command.indirectObject?.entity;
    return [context.event('if.event.ask_for_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: {
        ...result.params,
        recipient: recipient ? nounPhraseFor(recipient) : undefined,
        item: item ? nounPhraseFor(item) : undefined
      },
      reason: result.error,
      recipientId: recipient?.id,
      itemId: item?.id
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const recipient = context.command.directObject!.entity!;
    const item = context.command.indirectObject!.entity!;

    // The stock refusal — a story's reaction on either noun replaces it.
    return [context.event('if.event.asked_for', {
      messageId: `${context.action.id}.refused`,
      params: { recipient: nounPhraseFor(recipient), item: nounPhraseFor(item) },
      recipientId: recipient.id,
      recipientName: recipient.name,
      itemId: item.id,
      itemName: item.name
    } as AskedForEventData & { messageId: string; params: Record<string, unknown> })];
  }
};
