/**
 * Waving action — a signal action with an optional object (ADR-370 D1, D2).
 *
 * `wave` / `wave hands` reports `if.event.waved` with the hands stock line;
 * `wave <x>` requires `x` to be held and reports the same event with the
 * thing. One id covers both forms: the consultable entity is the waved
 * thing when there is one, else the actor's room, so a Chord
 * `on the player waving` in a thing's block fires for `wave <it>` and the
 * same clause on a room fires for the bare form.
 *
 * Uses four-phase pattern:
 * 1. validate: the object form requires the thing to be held
 * 2. execute: no world mutations (records target and location in sharedData)
 * 3. blocked: not_held, or a veto from the executor's consultations
 * 4. report: emits if.event.waved with the stock message id
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `wavingLifecycle`.
 *
 * Public interface: wavingAction, wavingLifecycle.
 * Owner context: stdlib / standard actions / signal verbs
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { ActorBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { WavedEventData } from './waving-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the waved thing, else the actor's room,
 * is the one consultable entity of a WAVE command.
 */
export const wavingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.WAVING,
  reportEventType: 'if.event.waved',
  blockedEventType: 'if.event.wave_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.WAVING],
      resolve: (ctx) => ctx.command.directObject?.entity ?? ctx.currentLocation ?? undefined
    }
  ]
};

/** Shared data passed between execute and report phases. */
interface WavingSharedData {
  targetId?: string;
  targetName?: string;
  locationId?: string;
  locationName?: string;
}

function getWavingSharedData(context: ActionContext): WavingSharedData {
  return context.sharedData as WavingSharedData;
}

export const wavingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.WAVING,

  // Resolve visible things so `not_held` can speak for a thing on the floor
  // (the same reasoning as dropping's VISIBLE scope).
  defaultScope: {
    target: ScopeLevel.VISIBLE
  },

  requiredMessages: [
    'not_held',
    'waved_hands',
    'waved'
  ],

  group: "interaction",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  },

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    if (target && !ActorBehavior.isHolding(context.actor, target.id, context.world)) {
      return { valid: false, error: 'not_held', params: { target: nounPhraseFor(target) } };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Waving has NO world mutations — target and location ride to the report.
    const target = context.command.directObject?.entity;
    const location = context.currentLocation;
    const sharedData = getWavingSharedData(context);
    sharedData.targetId = target?.id;
    sharedData.targetName = target?.name;
    sharedData.locationId = location?.id;
    sharedData.locationName = location?.name;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.wave_blocked', {
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
    const target = context.command.directObject?.entity;
    const sharedData = getWavingSharedData(context);
    const messageId = target ? 'waved' : 'waved_hands';

    // The stock line — a story's reaction on the thing or the room replaces it.
    return [context.event('if.event.waved', {
      messageId: `${context.action.id}.${messageId}`,
      params: target ? { target: nounPhraseFor(target) } : {},
      target: sharedData.targetId,
      targetName: sharedData.targetName,
      location: sharedData.locationId,
      locationName: sharedData.locationName
    } as WavedEventData & { messageId: string; params: Record<string, unknown> })];
  }
};
