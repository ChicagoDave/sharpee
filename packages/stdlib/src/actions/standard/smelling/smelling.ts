/**
 * Smelling action - smell objects or the environment
 *
 * This action allows players to smell specific objects or detect
 * scents in their current location.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target is reachable (if specified)
 * 2. execute: Analyze scents (no world mutations)
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { SmelledEventData } from './smelling-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

/**
 * Shared data passed between execute and report phases
 */
interface SmellingSharedData {
  messageId?: string;
  eventData?: SmelledEventData;
  params?: Record<string, any>;
}

function getSmellingSharedData(context: ActionContext): SmellingSharedData {
  return context.sharedData as SmellingSharedData;
}

interface SmellAnalysis {
  messageId: string;
  eventData: SmelledEventData;
  params: Record<string, any>;
  hasScent: boolean;
}

function analyzeSmellAction(context: ActionContext): SmellAnalysis {
  const target = context.command.directObject?.entity;
  const eventData: SmelledEventData = {};
  const params: Record<string, any> = {};
  let messageId = 'no_particular_scent';
  let hasScent = false;

  if (target) {
    eventData.target = target.id;
    params.target = target.name;

    // Check if the target has smell-related properties
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

  return { messageId, eventData, params, hasScent };
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
    directObjectScope: ScopeLevel.AWARE
  },
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;

    // If target specified, check distance
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
    }

    // Scent analysis happens in execute phase
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Smelling has NO world mutations - it's a sensory action
    // Analyze scents and store in sharedData for report phase
    const analysis = analyzeSmellAction(context);
    const sharedData = getSmellingSharedData(context);

    sharedData.messageId = analysis.messageId;
    sharedData.eventData = analysis.eventData;
    sharedData.params = analysis.params;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getSmellingSharedData(context);

    // Emit smelled event for world model
    if (sharedData.eventData) {
      events.push(context.event('if.event.smelled', sharedData.eventData));
    }

    // Emit success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: sharedData.messageId || 'no_scent',
      params: sharedData.params || {}
    }));

    return events;
  },

  group: "sensory"
};
