/**
 * Eating action - consume edible items
 * 
 * This action handles eating items that have the EDIBLE trait.
 * It validates that the item is edible and not a drink.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EatenEventData, ImplicitTakenEventData } from './eating-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

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
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    
    // Must have an item to eat
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_item',
        reason: 'no_item'
      })];
    }
    
    // Scope validation is now handled by CommandValidator
    
    // Check if item is held
    const itemLocation = context.world.getLocation(item.id);
    const isHeld = itemLocation === actor.id;
    
    // Check if item is edible
    if (!item.has(TraitType.EDIBLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_edible',
        reason: 'not_edible',
        params: { item: item.name }
      })];
    }
    
    const edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
    
    // Check if it's a drink (should use DRINKING action instead)
    if ((edibleTrait as any).isDrink) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'is_drink',
        reason: 'is_drink',
        params: { item: item.name }
      })];
    }
    
    // Check if already consumed
    if ((edibleTrait as any).consumed) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_consumed',
        reason: 'already_consumed',
        params: { item: item.name }
      })];
    }
    
    // If not held, pick it up first (implicit take)
    const events: SemanticEvent[] = [];
    
    if (!isHeld) {
      const implicitTakenData: ImplicitTakenEventData = {
        implicit: true,
        item: item.id,
        itemName: item.name
      };
      events.push(context.event('if.event.taken', implicitTakenData));
    }
    
    // Build event data
    const eventData: EatenEventData = {
      item: item.id,
      itemName: item.name
    };
    
    const params: Record<string, any> = {
      item: item.name
    };
    
    // Determine message based on action verb and food properties
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'eat';
    let messageId = 'eaten';
    
    // Add nutritional or effect information if available
    if ((edibleTrait as any).nutrition) {
      eventData.nutrition = (edibleTrait as any).nutrition;
    }
    
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
    if ((edibleTrait as any).taste) {
      const taste = (edibleTrait as any).taste;
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
    
    // Check if this is poisonous or has effects
    if ((edibleTrait as any).effects) {
      eventData.effects = (edibleTrait as any).effects;
      if ((edibleTrait as any).effects.includes('poison')) {
        messageId = 'poisonous';
      }
    }
    
    // Check if this satisfies hunger
    if ((edibleTrait as any).satisfiesHunger !== undefined) {
      eventData.satisfiesHunger = (edibleTrait as any).satisfiesHunger;
      if ((edibleTrait as any).satisfiesHunger === true) {
        if (messageId === 'eaten') {
          messageId = 'filling';
        }
      } else if ((edibleTrait as any).satisfiesHunger === false) {
        messageId = 'still_hungry';
      }
    }
    
    // Verb-specific messages
    if (messageId === 'eaten' || messageId === 'eaten_some') {
      switch (verb) {
        case 'nibble':
          messageId = 'nibbled';
          break;
        case 'taste':
          messageId = 'tasted';
          break;
        case 'devour':
          messageId = 'devoured';
          break;
        case 'munch':
          messageId = 'munched';
          break;
      }
    }
    
    // Create EATEN event
    events.push(context.event('if.event.eaten', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "interaction"
};
