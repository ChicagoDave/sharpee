/**
 * Waiting action - passes time without doing anything
 * 
 * This is a meta action that doesn't change world state but allows
 * time-based events to occur.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { WaitedEventData } from './waiting-events';

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
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    
    // Waiting is always successful - it's a simple time-passing action
    const eventData: WaitedEventData = {
      turnsPassed: 1  // Waiting typically advances one turn
    };
    
    const params: Record<string, any> = {};
    
    // Check if we're in a special waiting situation
    const currentLocation = context.world.getLocation(actor.id);
    let messageId = 'waited';
    
    if (currentLocation) {
      const location = context.world.getEntity(currentLocation);
      if (location) {
        // Add any location-specific context
        eventData.location = location.id;
        eventData.locationName = location.name;
        
        // Check if in a vehicle
        if (location.has('if.trait.vehicle')) {
          params.vehicle = location.name;
          messageId = 'waited_in_vehicle';
        }
        
        // Check if there's a timed event pending
        const timedEvent = (context as any).pendingTimedEvent;
        if (timedEvent) {
          eventData.pendingEvent = timedEvent.id;
          
          if (timedEvent.turnsRemaining === 1) {
            messageId = 'something_approaches';
          } else if (timedEvent.anxious) {
            messageId = 'waited_anxiously';
          } else {
            messageId = 'waited_for_event';
          }
        }
      }
    }
    
    // Check wait count for variety
    const waitCount = (context as any).consecutiveWaits || 0;
    eventData.waitCount = waitCount;
    
    if (waitCount > 5) {
      messageId = 'grows_restless';
    } else if (waitCount > 2 && messageId === 'waited') {
      messageId = 'time_passes';
    } else if (waitCount === 0 && messageId === 'waited') {
      // First wait might be more descriptive
      const waitVariations = ['waited', 'waited_patiently', 'waited_briefly'];
      messageId = waitVariations[Math.floor(Math.random() * waitVariations.length)];
    }
    
    // Check if something happens while waiting (random chance)
    if (Math.random() < 0.1 && messageId === 'waited') {
      messageId = 'nothing_happens';
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create WAITED event for world model
    events.push(context.event('if.event.waited', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
