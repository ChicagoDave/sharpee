/**
 * Sleeping action - passes time without doing anything
 * 
 * This is a meta action that advances time like waiting but represents
 * the player character sleeping or dozing off. NPCs and daemons can
 * still act during this time.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { SleptEventData } from './sleeping-events';
import { IFEntity } from '@sharpee/world-model';

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
  
  execute(context: ActionContext): ISemanticEvent[] {
    const analysis = analyzeSleepAction(context);
    
    const events: ISemanticEvent[] = [];
    
    // Create SLEPT event for world model
    events.push(context.event('if.event.slept', analysis.eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: analysis.messageId,
      params: analysis.params
    }));
    
    // Add wake refreshed message if applicable
    if (analysis.wakeRefreshed) {
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
