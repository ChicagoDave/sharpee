/**
 * Kissing action — a signal action with an object (ADR-370 D1).
 *
 * `kiss <x>` validates that the target is present (the grammar's reach
 * requirement does the rest), mutates nothing, and reports one
 * `if.event.kissed` whose stock line depends on whether the target is a
 * person. A story's reaction — a Chord `on the player kissing` in the
 * kissed thing's block — rides the ordinary lifecycle hooks and speaks in
 * its place.
 *
 * Uses four-phase pattern:
 * 1. validate: a target is present (a story's veto arrives through the executor)
 * 2. execute: no world mutations (classifies the target into sharedData)
 * 3. blocked: a veto from the executor's consultations
 * 4. report: emits if.event.kissed with the stock message id
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `kissingLifecycle`: the kissed target is the one
 * consultable entity.
 *
 * Public interface: kissingAction, kissingLifecycle.
 * Owner context: stdlib / standard actions / social
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { KissedEventData } from './kissing-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the kissed target is the only consultable
 * entity of a KISS command.
 */
export const kissingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.KISSING,
  reportEventType: 'if.event.kissed',
  blockedEventType: 'if.event.kiss_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.KISSING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/** Shared data passed between execute and report phases. */
interface KissingSharedData {
  targetId?: string;
  targetName?: string;
  isPerson?: boolean;
}

function getKissingSharedData(context: ActionContext): KissingSharedData {
  return context.sharedData as KissingSharedData;
}

export const kissingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.KISSING,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'kissed_person',
    'kissed_thing'
  ],

  group: "social",

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
    // Kissing has NO world mutations — the target's kind rides to the report.
    const target = context.command.directObject!.entity!;
    const sharedData = getKissingSharedData(context);
    sharedData.targetId = target.id;
    sharedData.targetName = target.name;
    sharedData.isPerson = target.has(TraitType.ACTOR);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.kiss_blocked', {
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
    const target = context.command.directObject!.entity!;
    const sharedData = getKissingSharedData(context);
    const messageId = sharedData.isPerson ? 'kissed_person' : 'kissed_thing';

    // The stock line — a story's reaction on the target replaces it.
    return [context.event('if.event.kissed', {
      messageId: `${context.action.id}.${messageId}`,
      params: { target: nounPhraseFor(target) },
      target: sharedData.targetId,
      targetName: sharedData.targetName,
      isPerson: sharedData.isPerson ?? false
    } as KissedEventData & { messageId: string; params: Record<string, unknown> })];
  }
};
