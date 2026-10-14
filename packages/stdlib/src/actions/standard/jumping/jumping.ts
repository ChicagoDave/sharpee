/**
 * Jumping action — a signal action in sleeping's shape (ADR-370 D1).
 *
 * `jump` always validates, mutates nothing, and reports one `if.event.jumped`
 * carrying the stock line as its success message. A story's reaction — a
 * Chord `on the player jumping` on the room the actor is in — rides the
 * ordinary lifecycle hooks and speaks in its place.
 *
 * Uses four-phase pattern:
 * 1. validate: always succeeds (a story's veto arrives through the executor)
 * 2. execute: no world mutations (stores the location in sharedData)
 * 3. blocked: a veto from the executor's consultations
 * 4. report: emits if.event.jumped with the stock message id
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `jumpingLifecycle`: an intransitive verb has no
 * object, so the one consultable entity is the actor's current room.
 *
 * Public interface: jumpingAction, jumpingLifecycle.
 * Owner context: stdlib / standard actions / signal verbs
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { JumpedEventData } from './jumping-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the room the actor jumps in is the only
 * consultable entity of a JUMP command.
 */
export const jumpingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.JUMPING,
  reportEventType: 'if.event.jumped',
  blockedEventType: 'if.event.jump_blocked',
  slots: [
    {
      id: 'location',
      actionIds: [IFActions.JUMPING],
      resolve: (ctx) => ctx.currentLocation ?? undefined
    }
  ]
};

/** Shared data passed between execute and report phases. */
interface JumpingSharedData {
  locationId?: string;
  locationName?: string;
}

function getJumpingSharedData(context: ActionContext): JumpingSharedData {
  return context.sharedData as JumpingSharedData;
}

export const jumpingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.JUMPING,

  requiredMessages: [
    'jumped'
  ],

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(_context: ActionContext): ValidationResult {
    // Jumping has no preconditions of its own; the interceptor
    // consultations run in the executor (ADR-337 D1), around this phase.
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Jumping has NO world mutations — the location rides to the report.
    const location = context.currentLocation;
    const sharedData = getJumpingSharedData(context);
    sharedData.locationId = location?.id;
    sharedData.locationName = location?.name;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('if.event.jump_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: result.params,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getJumpingSharedData(context);

    // The stock line — a story's room reaction replaces it (ADR-118/ADR-228).
    return [context.event('if.event.jumped', {
      messageId: `${context.action.id}.jumped`,
      location: sharedData.locationId,
      locationName: sharedData.locationName
    } as JumpedEventData & { messageId: string })];
  }
};
