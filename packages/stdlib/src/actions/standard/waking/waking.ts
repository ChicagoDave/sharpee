/**
 * Waking action — a signal action, like waiting (P-15, GH #362).
 *
 * `wake` / `wake up` always validates, mutates nothing, and reports one
 * `if.event.woken` carrying the stock line ("You're already awake."). The
 * line is the success message, not a validation refusal, so a story's
 * reaction — a Chord `on the player waking` on the room the actor is in —
 * rides the ordinary lifecycle hooks and speaks in its place.
 *
 * Uses four-phase pattern:
 * 1. validate: lifecycle pre/post hooks; otherwise always succeeds
 * 2. execute: no world mutations (stores the location in sharedData)
 * 3. blocked: a hook veto
 * 4. report: emits if.event.woken with the stock message id
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `wakingLifecycle`: the actor's current room is the
 * one consultable entity, as for sleeping.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { WokenEventData } from './waking-events.js';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the room the actor wakes in is the only
 * consultable entity of a WAKE command.
 */
export const wakingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.WAKING,
  slots: [
    {
      id: 'location',
      actionIds: [IFActions.WAKING],
      resolve: (ctx) => ctx.currentLocation ?? undefined
    }
  ]
};

/** Shared data passed between execute and report phases. */
interface WakingSharedData {
  locationId?: string;
  locationName?: string;
}

function getWakingSharedData(context: ActionContext): WakingSharedData {
  return context.sharedData as WakingSharedData;
}

export const wakingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.WAKING,

  requiredMessages: [
    'already_awake'
  ],

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    const state = resolveLifecycle(context, wakingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;
    // Waking has no preconditions of its own.
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Waking has NO world mutations — the location rides to the report.
    const location = context.currentLocation;
    const sharedData = getWakingSharedData(context);
    sharedData.locationId = location?.id;
    sharedData.locationName = location?.name;
    const state = resolveLifecycle(context, wakingLifecycle);
    runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const events: ISemanticEvent[] = [context.event('if.event.wake_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: result.params,
      reason: result.error
    })];
    const state = resolveLifecycle(context, wakingLifecycle);
    runOnBlocked(context, state, events, 'if.event.wake_blocked', result.error ?? 'blocked');
    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getWakingSharedData(context);

    // The stock line — a story's room reaction replaces it (ADR-118/ADR-228).
    events.push(context.event('if.event.woken', {
      messageId: `${context.action.id}.already_awake`,
      location: sharedData.locationId,
      locationName: sharedData.locationName
    } as WokenEventData & { messageId: string }));

    const state = resolveLifecycle(context, wakingLifecycle);
    runPostReport(context, state, events, 'if.event.woken');
    return events;
  }
};
