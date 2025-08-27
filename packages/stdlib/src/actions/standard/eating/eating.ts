/**
 * Eating action - consume edible items
 * 
 * This action handles eating items that have the EDIBLE trait.
 * It validates that the item is edible and not a drink.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EatenEventData } from './eating-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

interface EatingAnalysis {
  item: any;
  edibleTrait: EdibleTrait;
  messageId: string;
  eventData: EatenEventData;
}

/**
 * Analyzes what happens when eating an item
 */
function analyzeEatAction(context: ActionContext): EatingAnalysis | null {
  const item = context.command.directObject?.entity;
  
  if (!item || !item.has(TraitType.EDIBLE)) {
    return null;
  }
  
  const edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
  
  // Build event data
  const eventData: EatenEventData = {
    item: item.id,
    itemName: item.name
  };
  
  // Determine message based on properties
  let messageId = 'eaten';
  
  // Add nutritional information if available
  if ((edibleTrait as any).nutrition) {
    eventData.nutrition = (edibleTrait as any).nutrition;
  }
  
  // Handle portions
  if ((edibleTrait as any).portions) {
    eventData.portions = (edibleTrait as any).portions;
    eventData.portionsRemaining = ((edibleTrait as any).portions || 1) - 1;
    
    if ((eventData.portionsRemaining as number) > 0) {
      messageId = 'eaten_some';
    } else {
      messageId = 'eaten_all';
    }
  }
  
  // Check taste/quality
  const taste = (edibleTrait as any).taste;
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
  
  // Check for effects
  if ((edibleTrait as any).effects) {
    eventData.effects = (edibleTrait as any).effects;
    if ((edibleTrait as any).effects.includes('poison')) {
      messageId = 'poisonous';
    }
  }
  
  // Check hunger satisfaction
  if ((edibleTrait as any).satisfiesHunger !== undefined) {
    eventData.satisfiesHunger = (edibleTrait as any).satisfiesHunger;
    if ((edibleTrait as any).satisfiesHunger === true && messageId === 'eaten') {
      messageId = 'filling';
    } else if ((edibleTrait as any).satisfiesHunger === false) {
      messageId = 'still_hungry';
    }
  }
  
  return {
    item,
    edibleTrait,
    messageId,
    eventData
  };
}

export const eatingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EATING,
  requiredMessages: [
    'no_item',
    'not_visible',
    'not_reachable',
    'not_edible',
    'is_drink',
    'already_consumed',
    'eaten',
    'eaten_all',
    'eaten_some',
    'eaten_portion',
    'delicious',
    'tasty',
    'bland',
    'awful',
    'filling',
    'still_hungry',
    'satisfying',
    'poisonous',
    'nibbled',
    'tasted',
    'devoured',
    'munched'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity;
    
    // Must have an item to eat
    if (!item) {
      return { 
        valid: false, 
        error: 'no_item'
      };
    }
    
    // Check if item is edible
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
  
  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    
    // Analyze what happens when we eat
    const analysis = analyzeEatAction(context);
    if (!analysis) {
      return [];
    }
    
    // Mark as consumed
    (analysis.edibleTrait as any).consumed = true;
    
    // Emit the EATEN event
    events.push(context.event('if.event.eaten', analysis.eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: analysis.messageId,
      params: { item: analysis.item.name }
    }));
    
    return events;
  },
  
  group: "interaction"
};