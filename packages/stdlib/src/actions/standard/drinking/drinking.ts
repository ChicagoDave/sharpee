/**
 * Drinking action - consume drinkable items
 *
 * This action handles drinking items that have the EDIBLE trait
 * with the isDrink property set to true.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if item is drinkable and can be consumed
 * 2. execute: Perform implicit take if needed, store data in sharedData
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait, ContainerTrait, OpenableBehavior, EdibleBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { DrunkEventData, ImplicitTakenEventData } from './drinking-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { entityInfoFrom } from '../../../utils';

/**
 * Shared data passed between execute and report phases
 */
interface DrinkingSharedData {
  itemId: string;
  itemName: string;
  isHeld: boolean;
  messageId: string;
  params: Record<string, any>;
  eventData: DrunkEventData;
}

function getDrinkingSharedData(context: ActionContext): DrinkingSharedData {
  return context.sharedData as DrinkingSharedData;
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
    if (edibleTrait.nutrition) {
      eventData.nutrition = edibleTrait.nutrition;
    }

    const servings = edibleTrait.servings ?? 1;
    if (servings > 1) {
      eventData.portions = servings;
      eventData.portionsRemaining = servings - 1;
      messageId = eventData.portionsRemaining > 0 ? 'drunk_some' : 'drunk_all';
    }

    // Check taste/quality
    if (edibleTrait.taste) {
      const tasteMessages: Record<string, string> = {
        'refreshing': 'refreshing',
        'satisfying': 'satisfying',
        'bitter': 'bitter',
        'sweet': 'sweet',
        'strong': 'strong',
        'alcoholic': 'strong'
      };
      if (tasteMessages[edibleTrait.taste]) {
        messageId = tasteMessages[edibleTrait.taste];
      }
    }

    // Check for effects
    if (edibleTrait.effects) {
      eventData.effects = edibleTrait.effects;
      if (edibleTrait.effects.includes('magic')) {
        messageId = 'magical_effects';
      } else if (edibleTrait.effects.includes('healing')) {
        messageId = 'healing';
      }
    }

    // Check thirst satisfaction
    if (edibleTrait.satisfiesThirst !== undefined) {
      eventData.satisfiesThirst = edibleTrait.satisfiesThirst;
      if (edibleTrait.satisfiesThirst === true && messageId === 'drunk') {
        messageId = 'thirst_quenched';
      } else if (edibleTrait.satisfiesThirst === false) {
        messageId = 'still_thirsty';
      }
    }
  }

  // If drinking from a container
  if (containerTrait && containerTrait.containsLiquid) {
    eventData.fromContainer = true;

    if (containerTrait.liquidType) {
      eventData.liquidType = containerTrait.liquidType;
    }

    if (containerTrait.liquidAmount !== undefined) {
      eventData.liquidAmount = containerTrait.liquidAmount;
      eventData.liquidRemaining = Math.max(0, containerTrait.liquidAmount - 1);

      if (eventData.liquidRemaining === 0) {
        messageId = 'empty_now';
      } else if (messageId === 'drunk') {
        messageId = 'from_container';
        if (containerTrait.liquidType) {
          params.liquidType = containerTrait.liquidType;
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

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE
  },

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
    const item = context.command.directObject?.entity;

    // Must have an item to drink
    if (!item) {
      return { valid: false, error: 'no_item' };
    }

    // Check scope - must be able to reach the item
    const scopeCheck = context.requireScope(item, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if item is drinkable
    let isDrinkable = false;
    let edibleTrait: EdibleTrait | undefined;
    let containerTrait: ContainerTrait | undefined;

    if (item.has(TraitType.EDIBLE)) {
      edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
      isDrinkable = (edibleTrait.liquid ?? false) === true;
    }

    if (item.has(TraitType.CONTAINER)) {
      containerTrait = item.get(TraitType.CONTAINER) as ContainerTrait;
      if (!isDrinkable && containerTrait.containsLiquid) {
        isDrinkable = true;
      }
    }

    if (!isDrinkable) {
      return { valid: false, error: 'not_drinkable', params: { item: entityInfoFrom(item) } };
    }

    // Check if already consumed
    if (edibleTrait && (edibleTrait.servings ?? 1) <= 0) {
      return { valid: false, error: 'already_consumed', params: { item: entityInfoFrom(item) } };
    }

    // Check if container needs to be open
    if (containerTrait && item.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(item)) {
      return { valid: false, error: 'container_closed', params: { item: entityInfoFrom(item) } };
    }

    return { valid: true };
  },

  /**
   * Execute the drink action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    const sharedData = getDrinkingSharedData(context);

    // Get traits
    const edibleTrait = item.has(TraitType.EDIBLE)
      ? item.get(TraitType.EDIBLE) as EdibleTrait
      : undefined;
    const containerTrait = item.has(TraitType.CONTAINER)
      ? item.get(TraitType.CONTAINER) as ContainerTrait
      : undefined;

    // Check if item is held
    const itemLocation = context.world.getLocation(item.id);
    const isHeld = itemLocation === actor.id;

    // Build event data
    const eventData: DrunkEventData = {
      item: item.id,
      itemName: item.name
    };

    // params carry EntityInfo for the formatter chain (ADR-158)
    const params: Record<string, any> = {
      item: entityInfoFrom(item)
    };

    // Capture state BEFORE mutations for determineMessage
    const servingsBefore = edibleTrait ? EdibleBehavior.getServings(item) : 0;

    // Determine message based on pre-mutation state
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drink';
    const messageId = determineMessage(verb, edibleTrait, containerTrait, eventData, params);

    // === MUTATIONS (happen after determineMessage reads state) ===

    // MUTATION 1: Perform implicit take if item is not held
    if (!isHeld) {
      context.world.moveEntity(item.id, actor.id);
    }

    // MUTATION 2: Consume the drinkable item if it has EdibleTrait
    if (edibleTrait) {
      // Perform consumption (decrements servings, sets consumed flag if empty)
      EdibleBehavior.consume(item, actor);

      // Update event data with actual post-mutation values
      const servingsAfter = EdibleBehavior.getServings(item);
      if (servingsBefore > 1) {
        eventData.portions = servingsBefore;
        eventData.portionsRemaining = servingsAfter;
      }
    }

    // MUTATION 3: Decrement liquid amount for containers
    if (containerTrait && containerTrait.liquidAmount !== undefined) {
      const currentAmount = containerTrait.liquidAmount;
      const newAmount = Math.max(0, currentAmount - 1);
      containerTrait.liquidAmount = newAmount;

      // Update event data to reflect actual mutated values
      eventData.liquidAmount = currentAmount;
      eventData.liquidRemaining = newAmount;
    }

    // Store in sharedData
    sharedData.itemId = item.id;
    sharedData.itemName = item.name;
    sharedData.isHeld = isHeld;
    sharedData.messageId = messageId;
    sharedData.params = params;
    sharedData.eventData = eventData;
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    return [context.event('if.event.drunk', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { item: item ? entityInfoFrom(item) : undefined, ...result.params },
      reason: result.error,
      itemId: item?.id,
      itemName: item?.name
    })];
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getDrinkingSharedData(context);

    // If not held, emit implicit take event
    if (!sharedData.isHeld) {
      const implicitTakenData: ImplicitTakenEventData = {
        implicit: true,
        item: sharedData.itemId,
        itemName: sharedData.itemName
      };
      events.push(context.event('if.event.taken', implicitTakenData));
    }

    // Emit DRUNK event with messageId for text rendering
    events.push(context.event('if.event.drunk', {
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: sharedData.params || {},
      ...sharedData.eventData
    }));

    return events;
  }
};
