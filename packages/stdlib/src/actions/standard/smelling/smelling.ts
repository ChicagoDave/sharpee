/**
 * Smelling action - smell objects or the environment
 * 
 * This action allows players to smell specific objects or detect
 * scents in their current location.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { SmelledEventData } from './smelling-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

interface SmellingState {
  target?: IFEntity;
  messageId: string;
  eventData: SmelledEventData;
  params: Record<string, any>;
}

export const smellingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SMELLING,
  requiredMessages: [
    'not_visible',
    'too_far',
    'no_scent',
    'room_scents',
    'food_nearby',
    'smoke_detected',
    'no_particular_scent',
    'food_scent',
    'drink_scent',
    'burning_scent',
    'container_food_scent',
    'musty_scent',
    'fresh_scent',
    'smelled',
    'smelled_environment'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.DETECTABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // If target specified, check distance and visibility
    if (target) {
      // Check if in different rooms first (too far to smell)
      const targetRoom = context.world.getContainingRoom(target.id);
      const actorRoom = context.world.getContainingRoom(actor.id);
      
      if (targetRoom && actorRoom && targetRoom.id !== actorRoom.id) {
        return {
          valid: false,
          error: 'too_far',
          params: { target: target.name }
        };
      }
      
      // Scope validation is handled by CommandValidator
    }
    
    // Build event data
    const eventData: SmelledEventData = {};
    const params: Record<string, any> = {};
    let messageId: string = 'no_particular_scent';
    
    if (target) {
      eventData.target = target.id;
      params.target = target.name;
      
      // Check if the target has smell-related properties
      let hasScent = false;
      
      if (target.has(TraitType.EDIBLE)) {
        hasScent = true;
        eventData.hasScent = true;
        const edibleTrait = target.get(TraitType.EDIBLE) as EdibleTrait;
        if ((edibleTrait as any).isDrink) {
          eventData.scentType = 'drinkable';
          messageId = 'drink_scent';
        } else {
          eventData.scentType = 'edible';
          messageId = 'food_scent';
        }
      } else if (target.has(TraitType.LIGHT_SOURCE)) {
        const lightTrait = target.get(TraitType.LIGHT_SOURCE) as { isLit?: boolean };
        if (lightTrait.isLit) {
          hasScent = true;
          eventData.hasScent = true;
          eventData.scentType = 'burning';
          messageId = 'burning_scent';
        }
      } else if (target.has(TraitType.CONTAINER) && target.has(TraitType.OPENABLE)) {
        const openableTrait = target.get(TraitType.OPENABLE) as { isOpen?: boolean };
        if (openableTrait.isOpen) {
          const contents = context.world.getContents(target.id);
          const edibleContents = contents.filter(item => item.has(TraitType.EDIBLE));
          if (edibleContents.length > 0) {
            hasScent = true;
            eventData.hasScent = true;
            eventData.scentType = 'container_contents';
            eventData.scentSources = edibleContents.map(e => e.id);
            messageId = 'container_food_scent';
          }
        }
      }
      
      // Default messages for objects without specific scents
      if (!hasScent) {
        messageId = 'no_particular_scent';
      }
    } else {
      // Smelling the general environment
      eventData.smellingEnvironment = true;
      
      // Check for any scent sources in the location
      const location = context.currentLocation;
      const contents = context.world.getContents(location.id);
      
      const scentSources: string[] = [];
      let hasFood = false;
      let hasSmoke = false;
      
      // Check for various scent sources
      contents.forEach(item => {
        if (item.has(TraitType.EDIBLE)) {
          scentSources.push(item.id);
          hasFood = true;
        }
        // Check for lit light sources
        if (item.has(TraitType.LIGHT_SOURCE)) {
          const lightTrait = item.get(TraitType.LIGHT_SOURCE) as { isLit?: boolean };
          if (lightTrait.isLit) {
            scentSources.push(item.id);
            hasSmoke = true;
          }
        }
      });
      
      if (scentSources.length > 0) {
        eventData.scentSources = scentSources;
      }
      
      // Determine environment message
      if (hasSmoke) {
        messageId = 'smoke_detected';
      } else if (hasFood) {
        messageId = 'food_nearby';
      } else if (scentSources.length > 0) {
        messageId = 'room_scents';
      } else {
        messageId = 'no_scent';
      }
      
      eventData.roomId = location.id;
    }
    
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
    const target = context.command.directObject?.entity;
    
    // Rebuild event data from context
    const eventData: SmelledEventData = {};
    const params: Record<string, any> = {};
    let messageId: string = 'no_particular_scent';
    
    if (target) {
      eventData.target = target.id;
      params.target = target.name;
      
      // Rebuild scent detection logic
      let hasScent = false;
      
      if (target.has(TraitType.EDIBLE)) {
        hasScent = true;
        eventData.hasScent = true;
        const edibleTrait = target.get(TraitType.EDIBLE) as EdibleTrait;
        if ((edibleTrait as any).isDrink) {
          eventData.scentType = 'drinkable';
          messageId = 'drink_scent';
        } else {
          eventData.scentType = 'edible';
          messageId = 'food_scent';
        }
      } else if (target.has(TraitType.LIGHT_SOURCE)) {
        const lightTrait = target.get(TraitType.LIGHT_SOURCE) as { isLit?: boolean };
        if (lightTrait.isLit) {
          hasScent = true;
          eventData.hasScent = true;
          eventData.scentType = 'burning';
          messageId = 'burning_scent';
        }
      } else if (target.has(TraitType.CONTAINER) && target.has(TraitType.OPENABLE)) {
        const openableTrait = target.get(TraitType.OPENABLE) as { isOpen?: boolean };
        if (openableTrait.isOpen) {
          const contents = context.world.getContents(target.id);
          const edibleContents = contents.filter(item => item.has(TraitType.EDIBLE));
          if (edibleContents.length > 0) {
            hasScent = true;
            eventData.hasScent = true;
            eventData.scentType = 'container_contents';
            eventData.scentSources = edibleContents.map(e => e.id);
            messageId = 'container_food_scent';
          }
        }
      }
      
      if (!hasScent) {
        messageId = 'no_particular_scent';
      }
    } else {
      // Smelling the general environment
      eventData.smellingEnvironment = true;
      
      const location = context.currentLocation;
      const contents = context.world.getContents(location.id);
      
      const scentSources: string[] = [];
      let hasFood = false;
      let hasSmoke = false;
      
      contents.forEach(item => {
        if (item.has(TraitType.EDIBLE)) {
          scentSources.push(item.id);
          hasFood = true;
        }
        if (item.has(TraitType.LIGHT_SOURCE)) {
          const lightTrait = item.get(TraitType.LIGHT_SOURCE) as { isLit?: boolean };
          if (lightTrait.isLit) {
            scentSources.push(item.id);
            hasSmoke = true;
          }
        }
      });
      
      if (scentSources.length > 0) {
        eventData.scentSources = scentSources;
      }
      
      if (hasSmoke) {
        messageId = 'smoke_detected';
      } else if (hasFood) {
        messageId = 'food_nearby';
      } else if (scentSources.length > 0) {
        messageId = 'room_scents';
      } else {
        messageId = 'no_scent';
      }
      
      eventData.roomId = location.id;
    }
    
    const events: SemanticEvent[] = [];
    
    // Create SMELLED event for world model
    events.push(context.event('if.event.smelled', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: messageId,
      params: params
    }));
    
    return events;
  },
  
  group: "sensory"
};
