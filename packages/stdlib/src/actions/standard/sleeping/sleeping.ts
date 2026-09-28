/**
 * Sleeping action — a signal action, like waiting (P-15, GH #362).
 *
 * `sleep` always validates, mutates nothing, and reports one `if.event.slept`
 * carrying the stock line ("You aren't tired."). The line is the success
 * message, not a validation refusal, so a story's reaction — a Chord
 * `on the player sleeping` on the room the actor is in — rides the ordinary
 * lifecycle hooks and speaks in its place.
 *
 * Uses four-phase pattern:
 * 1. validate: always succeeds (a story's veto arrives through the executor)
 * 2. execute: no world mutations (stores the location in sharedData)
 * 3. blocked: a veto from the executor's consultations
 * 4. report: emits if.event.slept with the stock message id
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `sleepingLifecycle`: an intransitive verb has no
 * object, so the one consultable entity is the actor's current room —
 * the same implicit-room idea as going's `entering_room`.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { SleptEventData } from './sleeping-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the room the actor sleeps in is the only
 * consultable entity of a SLEEP command.
 */
export const sleepingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.SLEEPING,
  reportEventType: 'if.event.slept',
  blockedEventType: 'if.event.sleep_blocked',
  slots: [
    {
      id: 'location',
      actionIds: [IFActions.SLEEPING],
      resolve: (ctx) => ctx.currentLocation ?? undefined
    }
  ]
};

/** Shared data passed between execute and report phases. */
interface SleepingSharedData {
  locationId?: string;
  locationName?: string;
}

function getSleepingSharedData(context: ActionContext): SleepingSharedData {
  return context.sharedData as SleepingSharedData;
}

export const sleepingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SLEEPING,

  requiredMessages: [
    'not_tired'
  ],

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(_context: ActionContext): ValidationResult {
    // Sleeping has no preconditions of its own; the interceptor
    // consultations run in the executor (ADR-337 D1), around this phase.
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Sleeping has NO world mutations — the location rides to the report.
    const location = context.currentLocation;
    const sharedData = getSleepingSharedData(context);
    sharedData.locationId = location?.id;
    sharedData.locationName = location?.name;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const events: ISemanticEvent[] = [context.event('if.event.sleep_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: result.params,
      reason: result.error
    })];
    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getSleepingSharedData(context);

    // The stock line — a story's room reaction replaces it (ADR-118/ADR-228).
    events.push(context.event('if.event.slept', {
      messageId: `${context.action.id}.not_tired`,
      turnsPassed: 1,
      location: sharedData.locationId,
      locationName: sharedData.locationName
    } as SleptEventData & { messageId: string }));

    return events;
  }
};
