/**
 * Sleeping action - passes time without doing anything
 * 
 * This is a meta action that advances time like waiting but represents
 * the player character sleeping or dozing off. NPCs and daemons can
 * still act during this time.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { SleptEventData } from './sleeping-events';
import { IFEntity } from '@sharpee/world-model';

interface SleepingState {
  canSleep: boolean;
  messageId: string;
  eventData: SleptEventData;
  params: Record<string, any>;
  wakeRefreshed: boolean;
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
    
    // Check if we can sleep
    if (!canSleep) {
      return {
        valid: false,
        error: messageId,
        params
      };
    }
    
    const wakeRefreshed = eventData.comfortable || eventData.peaceful;
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    // Revalidate and rebuild all data
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error,
        params: validation.params || {}
      })];
    }
    
    const actor = context.player;
    
    // Rebuild event data from context
    const eventData: SleptEventData = {
      turnsPassed: 1
    };
    
    const params: Record<string, any> = {};
    let messageId = 'slept';
    
    const currentLocation = context.world.getLocation?.(actor.id);
    if (currentLocation) {
      const location = context.world.getEntity(currentLocation);
      if (location) {
        eventData.location = location.id;
        eventData.locationName = location.name;
        
        // Check if in a bed or comfortable location
        if (location.has('if.trait.bed') || location.has('if.trait.comfortable')) {
          messageId = 'deep_sleep';
          eventData.comfortable = true;
          eventData.turnsPassed = 3;
        }
      }
    }
    
    // Rebuild sleep state logic
    if (messageId === 'slept') {
      const sleepState = Math.random();
      if (sleepState < 0.2) {
        messageId = 'fell_asleep';
        eventData.exhausted = true;
        eventData.turnsPassed = 2;
      } else if (sleepState < 0.5) {
        messageId = 'dozed_off';
      } else if (sleepState < 0.7) {
        messageId = 'brief_nap';
      }
    }
    
    // Rebuild sleep quality logic
    if (messageId === 'slept') {
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
    
    const wakeRefreshed = eventData.comfortable || eventData.peaceful;
    
    const events: SemanticEvent[] = [];
    
    // Create SLEPT event for world model
    events.push(context.event('if.event.slept', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: messageId,
      params: params
    }));
    
    // Add wake refreshed message if applicable
    if (wakeRefreshed) {
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
