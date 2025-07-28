/**
 * Sleeping action - passes time without doing anything
 * 
 * This is a meta action that advances time like waiting but represents
 * the player character sleeping or dozing off. NPCs and daemons can
 * still act during this time.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { SleptEventData } from './sleeping-events';

export const sleepingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    
    // Sleep is usually successful unless there are special conditions
    const eventData: SleptEventData = {
      turnsPassed: 1  // Sleeping advances one turn by default
    };
    
    const params: Record<string, any> = {};
    
    // Check if we're in a suitable sleeping location
    const currentLocation = context.world.getLocation?.(actor.id);
    let messageId = 'slept';
    let canSleep = true;
    
    if (currentLocation) {
      const location = context.world.getEntity(currentLocation);
      if (location) {
        eventData.location = location.id;
        eventData.locationName = location.name;
        
        // Check if location is dangerous
        if (location.has('if.trait.dangerous') || location.has('if.trait.hostile')) {
          canSleep = false;
          messageId = 'too_dangerous_to_sleep';
          params.location = location.name;
        }
        
        // Check if location is unsuitable for sleeping
        if (canSleep && location.has('if.trait.no_sleep')) {
          canSleep = false;
          messageId = 'cant_sleep_here';
          params.location = location.name;
        }
        
        // Check if in a bed or comfortable location
        if (canSleep && (location.has('if.trait.bed') || location.has('if.trait.comfortable'))) {
          messageId = 'deep_sleep';
          eventData.comfortable = true;
          eventData.turnsPassed = 3; // Deep sleep might pass more time
        }
      }
    }
    
    // Check player state through capabilities or traits
    // For now, we'll use random chance to determine sleep quality
    // Games can implement more sophisticated state tracking
    
    // Random chance of different sleep states
    if (canSleep && messageId === 'slept') {
      const sleepState = Math.random();
      if (sleepState < 0.2) {
        // Very tired - fell asleep quickly
        messageId = 'fell_asleep';
        eventData.exhausted = true;
        eventData.turnsPassed = 2;
      } else if (sleepState < 0.5) {
        // Somewhat tired - dozed off
        messageId = 'dozed_off';
      } else if (sleepState < 0.7) {
        // Not particularly tired, just a brief nap
        messageId = 'brief_nap';
      }
      // Otherwise use default 'slept' message
    }
    
    // Random chance of sleep quality variations
    if (canSleep && messageId === 'slept') {
      const sleepQuality = Math.random();
      if (sleepQuality < 0.1) {
        messageId = 'nightmares';
        eventData.hadNightmares = true;
      } else if (sleepQuality < 0.2) {
        messageId = 'slept_fitfully';
        eventData.restless = true;
      } else if (sleepQuality > 0.8) {
        messageId = 'peaceful_sleep';
        eventData.peaceful = true;
      }
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    if (canSleep) {
      // Create SLEPT event for world model
      events.push(context.event('if.event.slept', eventData));
      
      // Add success message
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
      
      // Random chance of waking refreshed
      if (eventData.comfortable || eventData.peaceful) {
        events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'woke_refreshed',
        params: {}
      }));
      }
    } else {
      // Can't sleep here
      events.push(context.event('action.error', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    }
    
    return events;
  },
  
  group: "meta"
};
