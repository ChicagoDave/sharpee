/**
 * Drinking action - consume drinkable items
 * 
 * This action handles drinking items that have the EDIBLE trait
 * with the isDrink property set to true.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait, ContainerTrait, OpenableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { DrunkEventData, ImplicitTakenEventData } from './drinking-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

interface DrinkingState {
  item: any;
  isHeld: boolean;
  edibleTrait?: EdibleTrait;
  containerTrait?: ContainerTrait;
  messageId: string;
  params: Record<string, any>;
  eventData: DrunkEventData;
}

/**
 * Analyzes the drinking action and determines the outcome
 */
function analyzeDrinkAction(context: ActionContext): DrinkingState | ValidationResult {
  const actor = context.player;
  const item = context.command.directObject?.entity;
  
  // Must have an item to drink
  if (!item) {
    return { valid: false, error: 'no_item' };
  }
  
  // Check if item is drinkable
  let isDrinkable = false;
  let edibleTrait: EdibleTrait | undefined;
  let containerTrait: ContainerTrait | undefined;
  
  if (item.has(TraitType.EDIBLE)) {
    edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
    isDrinkable = (edibleTrait as any).isDrink === true;
  }
  
  if (item.has(TraitType.CONTAINER)) {
    containerTrait = item.get(TraitType.CONTAINER) as ContainerTrait;
    if (!isDrinkable && (containerTrait as any).containsLiquid) {
      isDrinkable = true;
    }
  }
  
  if (!isDrinkable) {
    return { valid: false, error: 'not_drinkable', params: { item: item.name } };
  }
  
  // Check if already consumed
  if (edibleTrait && (edibleTrait as any).consumed) {
    return { valid: false, error: 'already_consumed', params: { item: item.name } };
  }
  
  // Check if container needs to be open
  if (containerTrait && item.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(item)) {
    return { valid: false, error: 'container_closed', params: { item: item.name } };
  }
  
  // Check if item is held
  const itemLocation = context.world.getLocation(item.id);
  const isHeld = itemLocation === actor.id;
  
  // Build event data and determine message
  const eventData: DrunkEventData = {
    item: item.id,
    itemName: item.name
  };
  
  const params: Record<string, any> = {
    item: item.name
  };
  
  const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drink';
  let messageId = determineMessage(verb, edibleTrait, containerTrait, eventData, params);
  
  return {
    item,
    isHeld,
    edibleTrait,
    containerTrait,
    messageId,
    params,
    eventData
  };
}

/**
 * Determines the appropriate message based on drink properties
 */
function determineMessage(
  verb: string,
  edibleTrait: EdibleTrait | undefined,
  containerTrait: ContainerTrait | undefined,
  eventData: DrunkEventData,
  params: Record<string, any>
): string {
  let messageId = 'drunk';
  
  // Add drink-specific information
  if (edibleTrait) {
    // Add nutritional or effect information
    if ((edibleTrait as any).nutrition) {
      eventData.nutrition = (edibleTrait as any).nutrition;
    }
    
    if ((edibleTrait as any).portions) {
      eventData.portions = (edibleTrait as any).portions;
      eventData.portionsRemaining = ((edibleTrait as any).portions || 1) - 1;
      messageId = eventData.portionsRemaining > 0 ? 'drunk_some' : 'drunk_all';
    }
    
    // Check taste/quality
    const taste = (edibleTrait as any).taste;
    if (taste) {
      const tasteMessages: Record<string, string> = {
        'refreshing': 'refreshing',
        'satisfying': 'satisfying',
        'bitter': 'bitter',
        'sweet': 'sweet',
        'strong': 'strong',
        'alcoholic': 'strong'
      };
      if (tasteMessages[taste]) {
        messageId = tasteMessages[taste];
      }
    }
    
    // Check for effects
    if ((edibleTrait as any).effects) {
      eventData.effects = (edibleTrait as any).effects;
      const effects = (edibleTrait as any).effects;
      if (effects.includes('magic')) {
        messageId = 'magical_effects';
      } else if (effects.includes('healing')) {
        messageId = 'healing';
      }
    }
    
    // Check thirst satisfaction
    const satisfiesThirst = (edibleTrait as any).satisfiesThirst;
    if (satisfiesThirst !== undefined) {
      eventData.satisfiesThirst = satisfiesThirst;
      if (satisfiesThirst === true && messageId === 'drunk') {
        messageId = 'thirst_quenched';
      } else if (satisfiesThirst === false) {
        messageId = 'still_thirsty';
      }
    }
  }
  
  // If drinking from a container
  if (containerTrait && (containerTrait as any).containsLiquid) {
    eventData.fromContainer = true;
    
    if ((containerTrait as any).liquidType) {
      eventData.liquidType = (containerTrait as any).liquidType;
    }
    
    const liquidAmount = (containerTrait as any).liquidAmount;
    if (liquidAmount !== undefined) {
      eventData.liquidAmount = liquidAmount;
      eventData.liquidRemaining = Math.max(0, liquidAmount - 1);
      
      if (eventData.liquidRemaining === 0) {
        messageId = 'empty_now';
      } else if (messageId === 'drunk') {
        messageId = 'from_container';
        if ((containerTrait as any).liquidType) {
          params.liquidType = (containerTrait as any).liquidType;
        }
      }
    } else {
      messageId = 'drunk_from';
    }
  }
  
  // Verb-specific messages
  if (messageId === 'drunk' || messageId === 'drunk_some') {
    const verbMessages: Record<string, string> = {
      'sip': 'sipped',
      'quaff': 'quaffed',
      'swallow': 'gulped'
    };
    if (verbMessages[verb]) {
      messageId = verbMessages[verb];
    }
  }
  
  return messageId;
}

export const drinkingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.DRINKING,
  group: "interaction",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  requiredMessages: [
    'no_item',
    'not_visible',
    'not_reachable',
    'not_drinkable',
    'already_consumed',
    'container_closed',
    'drunk',
    'drunk_all',
    'drunk_some',
    'drunk_from',
    'refreshing',
    'satisfying',
    'bitter',
    'sweet',
    'strong',
    'thirst_quenched',
    'still_thirsty',
    'magical_effects',
    'healing',
    'from_container',
    'empty_now',
    'some_remains',
    'sipped',
    'quaffed',
    'gulped'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const result = analyzeDrinkAction(context);
    
    // If result has a 'valid' property, it's a ValidationResult
    if ('valid' in result) {
      return result;
    }
    
    // Otherwise, it's a valid state
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const result = analyzeDrinkAction(context);
    
    // If result has a 'valid' property and it's false, return error
    if ('valid' in result && !result.valid) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: result.error,
        reason: result.error,
        params: result.params
      })];
    }
    
    // Cast to state since we know it's valid
    const state = result as DrinkingState;
    const events: ISemanticEvent[] = [];
    
    // If not held, pick it up first (implicit take)
    if (!state.isHeld) {
      const implicitTakenData: ImplicitTakenEventData = {
        implicit: true,
        item: state.item.id,
        itemName: state.item.name
      };
      events.push(context.event('if.event.taken', implicitTakenData));
    }
    
    // Create DRUNK event
    events.push(context.event('if.event.drunk', state.eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: state.messageId,
      params: state.params
    }));
    
    return events;
  }
};