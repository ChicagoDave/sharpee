/**
 * Drinking action - consume drinkable items
 * 
 * This action handles drinking items that have the EDIBLE trait
 * with the isDrink property set to true.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait, ContainerTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { DrunkEventData, ImplicitTakenEventData } from './drinking-events';

export const drinkingAction: Action = {
  id: IFActions.DRINKING,
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    
    // Must have an item to drink
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_item',
        reason: 'no_item'
      })];
    }
    
    // Check if item is visible
    if (!context.canSee(item)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_visible',
        reason: 'not_visible',
        params: { item: item.name }
      })];
    }
    
    // Check if item is reachable or held
    const itemLocation = context.world.getLocation(item.id);
    const isHeld = itemLocation === actor.id;
    const isReachable = context.canReach(item);
    
    if (!isHeld && !isReachable) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_reachable',
        reason: 'not_reachable',
        params: { item: item.name }
      })];
    }
    
    // Check if item is drinkable
    let isDrinkable = false;
    let edibleTrait: EdibleTrait | undefined;
    
    if (item.has(TraitType.EDIBLE)) {
      edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
      isDrinkable = (edibleTrait as any).isDrink === true;
    }
    
    // Also check if it's a container with liquid
    let containerTrait: ContainerTrait | undefined;
    if (!isDrinkable && item.has(TraitType.CONTAINER)) {
      containerTrait = item.get(TraitType.CONTAINER) as ContainerTrait;
      if ((containerTrait as any).containsLiquid) {
        isDrinkable = true;
      }
    }
    
    if (!isDrinkable) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_drinkable',
        reason: 'not_drinkable',
        params: { item: item.name }
      })];
    }
    
    // Check if already consumed
    if (edibleTrait && (edibleTrait as any).consumed) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_consumed',
        reason: 'already_consumed',
        params: { item: item.name }
      })];
    }
    
    // Check if container needs to be open
    if (item.has(TraitType.CONTAINER) && item.has(TraitType.OPENABLE)) {
      const openableTrait = item.get(TraitType.OPENABLE) as { isOpen?: boolean };
      if (!openableTrait.isOpen) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'container_closed',
        reason: 'container_closed',
        params: { item: item.name }
      })];
      }
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
    const eventData: DrunkEventData = {
      item: item.id,
      itemName: item.name
    };
    
    const params: Record<string, any> = {
      item: item.name
    };
    
    // Determine message based on action verb and drink properties
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drink';
    let messageId = 'drunk';
    
    // Add drink-specific information
    if (edibleTrait) {
      // Add nutritional or effect information if available
      if ((edibleTrait as any).nutrition) {
        eventData.nutrition = (edibleTrait as any).nutrition;
      }
      
      if ((edibleTrait as any).portions) {
        eventData.portions = (edibleTrait as any).portions;
        eventData.portionsRemaining = ((edibleTrait as any).portions || 1) - 1;
        
        if ((eventData.portionsRemaining as number) > 0) {
          messageId = 'drunk_some';
        } else {
          messageId = 'drunk_all';
        }
      }
      
      // Check taste/quality
      if ((edibleTrait as any).taste) {
        const taste = (edibleTrait as any).taste;
        switch (taste) {
          case 'refreshing':
            messageId = 'refreshing';
            break;
          case 'satisfying':
            messageId = 'satisfying';
            break;
          case 'bitter':
            messageId = 'bitter';
            break;
          case 'sweet':
            messageId = 'sweet';
            break;
          case 'strong':
          case 'alcoholic':
            messageId = 'strong';
            break;
        }
      }
      
      // Check if this is poisonous or has effects
      if ((edibleTrait as any).effects) {
        eventData.effects = (edibleTrait as any).effects;
        if ((edibleTrait as any).effects.includes('magic')) {
          messageId = 'magical_effects';
        } else if ((edibleTrait as any).effects.includes('healing')) {
          messageId = 'healing';
        }
      }
      
      // Check if this satisfies thirst
      if ((edibleTrait as any).satisfiesThirst !== undefined) {
        eventData.satisfiesThirst = (edibleTrait as any).satisfiesThirst;
        if ((edibleTrait as any).satisfiesThirst === true && messageId === 'drunk') {
          messageId = 'thirst_quenched';
        } else if ((edibleTrait as any).satisfiesThirst === false) {
          messageId = 'still_thirsty';
        }
      }
    }
    
    // If drinking from a container
    if (containerTrait && (containerTrait as any).containsLiquid) {
      eventData.fromContainer = true;
      
      if ((containerTrait as any).liquidType) {
        eventData.liquidType = (containerTrait as any).liquidType;
        params.liquidType = (containerTrait as any).liquidType;
      }
      
      if ((containerTrait as any).liquidAmount !== undefined) {
        eventData.liquidAmount = (containerTrait as any).liquidAmount;
        eventData.liquidRemaining = Math.max(0, ((containerTrait as any).liquidAmount || 0) - 1);
        
        if (eventData.liquidRemaining === 0) {
          messageId = 'empty_now';
        } else if (messageId === 'drunk') {
          messageId = 'from_container';
        }
      } else {
        messageId = 'drunk_from';
      }
    }
    
    // Verb-specific messages
    if (messageId === 'drunk' || messageId === 'drunk_some') {
      switch (verb) {
        case 'sip':
          messageId = 'sipped';
          break;
        case 'quaff':
          messageId = 'quaffed';
          break;
        case 'swallow':
          messageId = 'gulped';
          break;
      }
    }
    
    // Create DRUNK event
    events.push(context.event('if.event.drunk', eventData));
    
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
