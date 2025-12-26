/**
 * Sleeping action - passes time without doing anything
 *
 * This is a meta action that advances time like waiting but represents
 * the player character sleeping or dozing off. NPCs and daemons can
 * still act during this time.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if sleeping is allowed
 * 2. execute: Compute sleep state (no world mutations)
 * 3. report: Emit slept event and success message
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { SleptEventData } from './sleeping-events';
import { handleReportErrors } from '../../base/report-helpers';

/**
 * Shared data passed between execute and report phases
 */
interface SleepingSharedData {
  messageId?: string;
  eventData?: SleptEventData;
  params?: Record<string, any>;
  wakeRefreshed?: boolean;
}

function getSleepingSharedData(context: ActionContext): SleepingSharedData {
  return context.sharedData as SleepingSharedData;
}

interface SleepAnalysis {
  canSleep: boolean;
  messageId: string;
  eventData: SleptEventData;
  params: Record<string, any>;
  wakeRefreshed: boolean;
}

function analyzeSleepAction(context: ActionContext): SleepAnalysis {
  const actor = context.player;
  const eventData: SleptEventData = {
    turnsPassed: 1  // Sleeping advances one turn by default
  };
  const params: Record<string, any> = {};
  let messageId = 'slept';
  let canSleep = true;
  
  // Check if we're in a suitable sleeping location
  const currentLocation = context.world.getLocation?.(actor.id);
  if (currentLocation) {
    const location = context.world.getEntity(currentLocation);
    if (location) {
      eventData.location = location.id;
      eventData.locationName = location.name;
      
      // Note: These traits don't exist in the current trait system
      // Games can implement custom sleep restrictions via event handlers
      // For now, sleep is always allowed
    }
  }
  
  // Basic sleep implementation - always succeeds
  // Games can implement fatigue systems via event handlers
  const wakeRefreshed = false; // Can be enhanced via event handlers
  
  return {
    canSleep,
    messageId,
    eventData,
    params,
    wakeRefreshed
  };
}

export const sleepingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SLEEPING,
  requiredMessages: [
    'slept',
    'dozed_off',
    'fell_asleep',
    'brief_nap',
    'deep_sleep',
    'slept_fitfully',
    'cant_sleep_here',
    'too_dangerous_to_sleep',
    'already_well_rested',
    'woke_refreshed',
    'disturbed_sleep',
    'nightmares',
    'peaceful_sleep'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const analysis = analyzeSleepAction(context);
    
    if (!analysis.canSleep) {
      return {
        valid: false,
        error: analysis.messageId,
        params: analysis.params
      };
    }
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): void {
    // Sleeping has NO world mutations
    // Analyze sleep state and store in sharedData for report phase
    const analysis = analyzeSleepAction(context);
    const sharedData = getSleepingSharedData(context);

    sharedData.messageId = analysis.messageId;
    sharedData.eventData = analysis.eventData;
    sharedData.params = analysis.params;
    sharedData.wakeRefreshed = analysis.wakeRefreshed;
  },

  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const sharedData = getSleepingSharedData(context);

    // Emit slept event for world model
    if (sharedData.eventData) {
      events.push(context.event('if.event.slept', sharedData.eventData));
    }

    // Emit success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: sharedData.messageId || 'slept',
      params: sharedData.params || {}
    }));

    // Add wake refreshed message if applicable
    if (sharedData.wakeRefreshed) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'woke_refreshed',
        params: {}
      }));
    }

    return events;
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
