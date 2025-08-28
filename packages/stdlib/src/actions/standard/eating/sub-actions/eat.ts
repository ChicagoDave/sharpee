/**
 * Eat sub-action - handles the core eating logic
 * 
 * This sub-action manages the consumption of edible items,
 * handling portions, nutrition, effects, and satisfaction states.
 */

import { Action, ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait } from '@sharpee/world-model';
import { IFActions } from '../../../constants';
import { captureEntitySnapshot } from '../../../base/snapshot-utils';
import { EatenEventData } from '../eating-events';

interface EatState {
  item: any;
  edibleTrait: EdibleTrait;
  messageId: string;
  eventData: EatenEventData;
  wasConsumed: boolean;
  portionsRemaining?: number;
}

export const eatSubAction: Action = {
  id: `${IFActions.EATING}.eat`,
  requiredMessages: [],
  group: 'interaction',
  
  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity || (context.command as any).entity;
    
    if (!item) {
      return { 
        valid: false, 
        error: 'no_item'
      };
    }
    
    if (!item.has(TraitType.EDIBLE)) {
      return { 
        valid: false, 
        error: 'not_edible',
        params: { item: item.name }
      };
    }
    
    const edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
    
    // Check if it's a drink (should use DRINKING action instead)
    if ((edibleTrait as any).isDrink) {
      return { 
        valid: false, 
        error: 'is_drink',
        params: { item: item.name }
      };
    }
    
    // Check if already consumed
    if ((edibleTrait as any).consumed) {
      return { 
        valid: false, 
        error: 'already_consumed',
        params: { item: item.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const item = context.command.directObject?.entity || (context.command as any).entity;
    const edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
    
    // Store original state
    const wasConsumed = (edibleTrait as any).consumed || false;
    
    // Handle portions if available
    let portionsRemaining: number | undefined;
    if ((edibleTrait as any).portions !== undefined) {
      const currentPortions = (edibleTrait as any).portions || 1;
      portionsRemaining = Math.max(0, currentPortions - 1);
      (edibleTrait as any).portions = portionsRemaining;
      
      // Mark as consumed if no portions remain
      if (portionsRemaining === 0) {
        (edibleTrait as any).consumed = true;
      }
    } else {
      // No portions system - mark as consumed immediately
      (edibleTrait as any).consumed = true;
    }
    
    // Handle hunger satisfaction
    if ((edibleTrait as any).satisfiesHunger !== undefined) {
      // This would typically update player hunger state
      // Left for story-specific implementation
    }
    
    // Handle effects
    if ((edibleTrait as any).effects) {
      // Effects would be applied here
      // Left for story-specific implementation through events
    }
    
    // Store state for report phase
    const state: EatState = {
      item,
      edibleTrait,
      messageId: 'eaten',
      eventData: {
        item: item.id,
        itemName: item.name
      },
      wasConsumed,
      portionsRemaining
    };
    
    (context as any)._eatState = state;
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    if (validationResult && !validationResult.valid) {
      const errorParams = { ...(validationResult.params || {}) };
      
      if (context.command.directObject?.entity) {
        errorParams.targetSnapshot = captureEntitySnapshot(
          context.command.directObject.entity,
          context.world,
          false
        );
      }
      
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          reason: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: errorParams
        })
      ];
    }
    
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'execution_failed',
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
    const state = (context as any)._eatState as EatState;
    const events: ISemanticEvent[] = [];
    
    // Build complete event data
    const eventData = { ...state.eventData };
    
    // Add nutritional information if available
    if ((state.edibleTrait as any).nutrition) {
      eventData.nutrition = (state.edibleTrait as any).nutrition;
    }
    
    // Add portion information
    if (state.portionsRemaining !== undefined) {
      eventData.portions = (state.edibleTrait as any).portions;
      eventData.portionsRemaining = state.portionsRemaining;
    }
    
    // Add effects information
    if ((state.edibleTrait as any).effects) {
      eventData.effects = (state.edibleTrait as any).effects;
    }
    
    // Add satisfaction information
    if ((state.edibleTrait as any).satisfiesHunger !== undefined) {
      eventData.satisfiesHunger = (state.edibleTrait as any).satisfiesHunger;
    }
    
    // Determine appropriate message
    let messageId = determineEatMessage(state);
    
    // Emit EATEN event
    events.push(context.event('if.event.eaten', eventData));
    
    // Emit domain event
    events.push(context.event('eaten', {
      itemId: state.item.id,
      itemName: state.item.name,
      consumed: (state.edibleTrait as any).consumed,
      portionsRemaining: state.portionsRemaining
    }));
    
    // Success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params: { item: state.item.name }
    }));
    
    return events;
  }
};

/**
 * Determines the appropriate message based on eating outcome
 */
function determineEatMessage(state: EatState): string {
  let messageId = 'eaten';
  
  // Check for portions
  if (state.portionsRemaining !== undefined) {
    if (state.portionsRemaining > 0) {
      messageId = 'eaten_some';
    } else {
      messageId = 'eaten_all';
    }
  }
  
  // Check taste/quality
  const taste = (state.edibleTrait as any).taste;
  if (taste) {
    switch (taste) {
      case 'delicious':
        messageId = 'delicious';
        break;
      case 'tasty':
      case 'good':
        messageId = 'tasty';
        break;
      case 'bland':
      case 'plain':
        messageId = 'bland';
        break;
      case 'awful':
      case 'terrible':
        messageId = 'awful';
        break;
    }
  }
  
  // Check for specific effects
  const effects = (state.edibleTrait as any).effects;
  if (effects) {
    if (effects.includes('poison')) {
      messageId = 'poisonous';
    }
  }
  
  // Check hunger satisfaction
  const satisfiesHunger = (state.edibleTrait as any).satisfiesHunger;
  if (satisfiesHunger !== undefined) {
    if (satisfiesHunger === true && messageId === 'eaten') {
      messageId = 'filling';
    } else if (satisfiesHunger === false) {
      messageId = 'still_hungry';
    }
  }
  
  return messageId;
}