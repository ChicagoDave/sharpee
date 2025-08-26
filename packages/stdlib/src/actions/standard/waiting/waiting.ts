/**
 * Waiting action - passes time without doing anything
 * 
 * This is a meta action that doesn't change world state but allows
 * time-based events to occur.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { WaitedEventData } from './waiting-events';

interface WaitAnalysis {
  messageId: string;
  params: Record<string, any>;
  eventData: WaitedEventData;
}

function analyzeWaitAction(context: ActionContext): WaitAnalysis {
  const actor = context.player;
  const eventData: WaitedEventData = {
    turnsPassed: 1  // Waiting typically advances one turn
  };
  const params: Record<string, any> = {};
  let messageId = 'waited';
  
  // Check if we're in a special waiting situation
  const currentLocation = context.world.getLocation(actor.id);
  if (currentLocation) {
    const location = context.world.getEntity(currentLocation);
    if (location) {
      // Add any location-specific context
      eventData.location = location.id;
      eventData.locationName = location.name;
      
      // Note: vehicle trait doesn't exist in current system
      // Games can implement via event handlers
    }
  }
  
  // Simple deterministic wait message
  // Games can enhance via event handlers
  messageId = 'time_passes';
  
  return { messageId, params, eventData };
}

export const waitingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.WAITING,
  requiredMessages: [
    'waited',
    'waited_patiently',
    'time_passes',
    'nothing_happens',
    'waited_in_vehicle',
    'waited_for_event',
    'waited_anxiously',
    'waited_briefly',
    'something_approaches',
    'time_runs_out',
    'patience_rewarded',
    'grows_restless'
  ],
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },
  
  validate(context: ActionContext): ValidationResult {
    // Waiting is always successful - it's a simple time-passing action
    analyzeWaitAction(context);
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const analysis = analyzeWaitAction(context);
    
    const events: ISemanticEvent[] = [];
    
    // Create WAITED event for world model
    events.push(context.event('if.event.waited', analysis.eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: analysis.messageId,
      params: analysis.params
    }));
    
    return events;
  }
};
