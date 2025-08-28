/**
 * Drink sub-action - handles the core drinking logic
 * 
 * This sub-action manages the consumption of drinkable items,
 * handling containers, liquid amounts, effects, and thirst states.
 */

import { Action, ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait, ContainerTrait, OpenableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../../constants';
import { captureEntitySnapshot } from '../../../base/snapshot-utils';
import { DrunkEventData, ImplicitTakenEventData } from '../drinking-events';

interface DrinkState {
  item: any;
  isHeld: boolean;
  edibleTrait?: EdibleTrait;
  containerTrait?: ContainerTrait;
  messageId: string;
  params: Record<string, any>;
  eventData: DrunkEventData;
  wasConsumed: boolean;
  liquidRemaining?: number;
}

export const drinkSubAction: Action = {
  id: `${IFActions.DRINKING}.drink`,
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
      return { 
        valid: false, 
        error: 'not_drinkable',
        params: { item: item.name }
      };
    }
    
    // Check if already consumed
    if (edibleTrait && (edibleTrait as any).consumed) {
      return { 
        valid: false, 
        error: 'already_consumed',
        params: { item: item.name }
      };
    }
    
    // Check if container needs to be open
    if (containerTrait && item.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(item)) {
      return { 
        valid: false, 
        error: 'container_closed',
        params: { item: item.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject?.entity || (context.command as any).entity;
    
    // Get traits
    let edibleTrait: EdibleTrait | undefined;
    let containerTrait: ContainerTrait | undefined;
    
    if (item.has(TraitType.EDIBLE)) {
      edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
    }
    
    if (item.has(TraitType.CONTAINER)) {
      containerTrait = item.get(TraitType.CONTAINER) as ContainerTrait;
    }
    
    // Check if item is held
    const itemLocation = context.world.getLocation(item.id);
    const isHeld = itemLocation === actor.id;
    
    // Store original state
    const wasConsumed = edibleTrait ? ((edibleTrait as any).consumed || false) : false;
    
    // Handle liquid amounts if drinking from container
    let liquidRemaining: number | undefined;
    if (containerTrait && (containerTrait as any).liquidAmount !== undefined) {
      const currentAmount = (containerTrait as any).liquidAmount || 1;
      liquidRemaining = Math.max(0, currentAmount - 1);
      (containerTrait as any).liquidAmount = liquidRemaining;
      
      // Mark container as empty if no liquid remains
      if (liquidRemaining === 0 && edibleTrait) {
        (edibleTrait as any).consumed = true;
      }
    } else if (edibleTrait) {
      // Handle portions for non-container drinks
      if ((edibleTrait as any).portions !== undefined) {
        const currentPortions = (edibleTrait as any).portions || 1;
        const portionsRemaining = Math.max(0, currentPortions - 1);
        (edibleTrait as any).portions = portionsRemaining;
        
        if (portionsRemaining === 0) {
          (edibleTrait as any).consumed = true;
        }
      } else {
        // No portions system - mark as consumed immediately
        (edibleTrait as any).consumed = true;
      }
    }
    
    // Handle thirst satisfaction
    if (edibleTrait && (edibleTrait as any).satisfiesThirst !== undefined) {
      // This would typically update player thirst state
      // Left for story-specific implementation
    }
    
    // If not held, implicitly take it
    if (!isHeld) {
      context.world.moveEntity(item.id, actor.id);
    }
    
    // Build initial event data
    const eventData: DrunkEventData = {
      item: item.id,
      itemName: item.name
    };
    
    const params: Record<string, any> = {
      item: item.name
    };
    
    // Store state for report phase
    const state: DrinkState = {
      item,
      isHeld,
      edibleTrait,
      containerTrait,
      messageId: 'drunk',
      params,
      eventData,
      wasConsumed,
      liquidRemaining
    };
    
    (context as any)._drinkState = state;
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
    
    const state = (context as any)._drinkState as DrinkState;
    const events: ISemanticEvent[] = [];
    
    // If not held originally, emit implicit take event
    if (!state.isHeld) {
      const implicitTakenData: ImplicitTakenEventData = {
        implicit: true,
        item: state.item.id,
        itemName: state.item.name
      };
      events.push(context.event('if.event.taken', implicitTakenData));
    }
    
    // Build complete event data
    const eventData = { ...state.eventData };
    
    // Add drink-specific information
    if (state.edibleTrait) {
      // Add nutritional information
      if ((state.edibleTrait as any).nutrition) {
        eventData.nutrition = (state.edibleTrait as any).nutrition;
      }
      
      // Add portion information
      if ((state.edibleTrait as any).portions !== undefined) {
        eventData.portions = (state.edibleTrait as any).portions;
        eventData.portionsRemaining = (state.edibleTrait as any).portions;
      }
      
      // Add effects
      if ((state.edibleTrait as any).effects) {
        eventData.effects = (state.edibleTrait as any).effects;
      }
      
      // Add thirst satisfaction
      if ((state.edibleTrait as any).satisfiesThirst !== undefined) {
        eventData.satisfiesThirst = (state.edibleTrait as any).satisfiesThirst;
      }
    }
    
    // Add container information
    if (state.containerTrait && (state.containerTrait as any).containsLiquid) {
      eventData.fromContainer = true;
      
      if ((state.containerTrait as any).liquidType) {
        eventData.liquidType = (state.containerTrait as any).liquidType;
      }
      
      if (state.liquidRemaining !== undefined) {
        eventData.liquidAmount = (state.containerTrait as any).liquidAmount;
        eventData.liquidRemaining = state.liquidRemaining;
      }
    }
    
    // Determine appropriate message
    const messageId = determineDrinkMessage(state, context.command.parsed.structure.verb?.text.toLowerCase() || 'drink');
    const params = { ...state.params };
    
    if (state.containerTrait && (state.containerTrait as any).liquidType) {
      params.liquidType = (state.containerTrait as any).liquidType;
    }
    
    // Emit DRUNK event
    events.push(context.event('if.event.drunk', eventData));
    
    // Emit domain event
    events.push(context.event('drunk', {
      itemId: state.item.id,
      itemName: state.item.name,
      consumed: state.edibleTrait ? (state.edibleTrait as any).consumed : false,
      fromContainer: state.containerTrait && (state.containerTrait as any).containsLiquid,
      liquidRemaining: state.liquidRemaining
    }));
    
    // Success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params
    }));
    
    return events;
  }
};

/**
 * Determines the appropriate message based on drinking outcome
 */
function determineDrinkMessage(state: DrinkState, verb: string): string {
  let messageId = 'drunk';
  
  // Handle portion-based messages
  if (state.edibleTrait) {
    if ((state.edibleTrait as any).portions !== undefined) {
      const portionsRemaining = (state.edibleTrait as any).portions;
      messageId = portionsRemaining > 0 ? 'drunk_some' : 'drunk_all';
    }
    
    // Check taste/quality
    const taste = (state.edibleTrait as any).taste;
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
    if ((state.edibleTrait as any).effects) {
      const effects = (state.edibleTrait as any).effects;
      if (effects.includes('magic')) {
        messageId = 'magical_effects';
      } else if (effects.includes('healing')) {
        messageId = 'healing';
      }
    }
    
    // Check thirst satisfaction
    const satisfiesThirst = (state.edibleTrait as any).satisfiesThirst;
    if (satisfiesThirst !== undefined) {
      if (satisfiesThirst === true && messageId === 'drunk') {
        messageId = 'thirst_quenched';
      } else if (satisfiesThirst === false) {
        messageId = 'still_thirsty';
      }
    }
  }
  
  // Handle container-specific messages
  if (state.containerTrait && (state.containerTrait as any).containsLiquid) {
    if (state.liquidRemaining === 0) {
      messageId = 'empty_now';
    } else if (messageId === 'drunk') {
      messageId = 'from_container';
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