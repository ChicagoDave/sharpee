/**
 * Looking-under action — look under a thing (ADR-370 D5).
 *
 * `look under <x>` reveals the `concealed` things `x` holds — exactly the
 * set `searching` reveals, through its helpers — and reports `found_under`
 * naming them; with nothing concealed it reveals nothing and reports the
 * stock line `nothing_under`. A reveal that depends on anything else is the
 * story's, written as a Chord `on the player looking_under` in the thing's
 * block, which speaks in the stock line's place.
 *
 * Uses four-phase pattern:
 * 1. validate: a target is present (reach is the grammar's requirement)
 * 2. execute: reveal the concealed contents (the one mutation)
 * 3. blocked: a veto from the executor's consultations
 * 4. report: emits if.event.looked_under with the message id
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `lookingUnderLifecycle`: the target is the one
 * consultable entity.
 *
 * Public interface: lookingUnderAction, lookingUnderLifecycle.
 * Owner context: stdlib / standard actions / sensory
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  analyzeSearchTarget,
  revealConcealedItems,
  phraseListFor
} from '../searching-helpers.js';
import { LookedUnderEventData } from './looking-under-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the thing looked under is the only
 * consultable entity of a LOOK UNDER command.
 */
export const lookingUnderLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.LOOKING_UNDER,
  reportEventType: 'if.event.looked_under',
  blockedEventType: 'if.event.look_under_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.LOOKING_UNDER],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/** Shared data passed between execute and report phases. */
interface LookingUnderSharedData {
  messageId?: string;
  params?: Record<string, unknown>;
  eventData?: LookedUnderEventData;
}

function getLookingUnderSharedData(context: ActionContext): LookingUnderSharedData {
  return context.sharedData as LookingUnderSharedData;
}

export const lookingUnderAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LOOKING_UNDER,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'nothing_under',
    'found_under'
  ],

  group: "sensory",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    if (!context.command.directObject?.entity) {
      return { valid: false, error: 'no_target' };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const target = context.command.directObject!.entity!;
    const sharedData = getLookingUnderSharedData(context);

    // The same set searching reveals: the concealed things the target holds.
    const searched = analyzeSearchTarget(context, target);
    if (searched.concealedItems.length > 0) {
      revealConcealedItems(searched.concealedItems);
    }

    const params: Record<string, unknown> = { target: nounPhraseFor(target) };
    if (searched.concealedItems.length > 0) {
      params.items = phraseListFor(searched.concealedItems);
    }

    sharedData.messageId = searched.concealedItems.length > 0 ? 'found_under' : 'nothing_under';
    sharedData.params = params;
    sharedData.eventData = {
      target: target.id,
      targetName: target.name,
      revealedIds: searched.concealedItems.map((item) => item.id)
    };
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.look_under_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: {
        ...result.params,
        target: target ? nounPhraseFor(target) : undefined
      },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getLookingUnderSharedData(context);
    return [context.event('if.event.looked_under', {
      messageId: `${context.action.id}.${sharedData.messageId ?? 'nothing_under'}`,
      params: sharedData.params ?? {},
      ...sharedData.eventData
    })];
  }
};
