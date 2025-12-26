/**
 * Waiting action - passes time without doing anything
 *
 * This is a signal action that emits an event to indicate the player
 * chose to wait. The engine handles turn advancement and daemon processing.
 *
 * Uses four-phase pattern:
 * 1. validate: Always succeeds (no preconditions for waiting)
 * 2. execute: No world mutations (stores location in sharedData)
 * 3. blocked: Handle validation failures (n/a - always succeeds)
 * 4. report: Emits if.event.waited signal for engine/daemons
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { WaitedEventData } from './waiting-events';

/**
 * Shared data passed between execute and report phases
 */
interface WaitingSharedData {
  locationId?: string;
  locationName?: string;
}

function getWaitingSharedData(context: ActionContext): WaitingSharedData {
  return context.sharedData as WaitingSharedData;
}

export const waitingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.WAITING,

  requiredMessages: [
    'time_passes'
  ],

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    // Waiting always succeeds - no preconditions
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Waiting has NO world mutations
    // Just store location info in sharedData for report phase
    const location = context.currentLocation;
    const sharedData = getWaitingSharedData(context);
    sharedData.locationId = location?.id;
    sharedData.locationName = location?.name;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Waiting always succeeds, but include blocked for consistency
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getWaitingSharedData(context);

    // Build event data
    const eventData: WaitedEventData = {
      turnsPassed: 1,
      location: sharedData.locationId,
      locationName: sharedData.locationName
    };

    // Emit world event - signals time passage
    // Engine/daemons listen to this to advance turn counter and process scheduled events
    events.push(context.event('if.event.waited', eventData));

    // Emit success message
    events.push(context.event('action.success', {
      actionId: IFActions.WAITING,
      messageId: 'time_passes'
    }));

    return events;
  }
};
