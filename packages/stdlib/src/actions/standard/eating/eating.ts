/**
 * Eating action - consume edible items
 *
 * This action handles eating items that have the EDIBLE trait.
 * It validates that the item is edible and not a drink.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if item is edible, not a drink, and not consumed
 * 2. execute: Mark as consumed, store data in sharedData
 * 3. report: Generate events for output
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EatenEventData } from './eating-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { handleReportErrors } from '../../base/report-helpers';

/**
 * Shared data passed between execute and report phases
 */
interface EatingSharedData {
  itemId: string;
  itemName: string;
  messageId: string;
  eventData: EatenEventData;
}

function getEatingSharedData(context: ActionContext): EatingSharedData {
  return context.sharedData as EatingSharedData;
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

  /**
   * Execute the eat action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    const edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
    const sharedData = getEatingSharedData(context);

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

    // Perform mutation - mark as consumed
    (edibleTrait as any).consumed = true;

    // Store in sharedData
    sharedData.itemId = item.id;
    sharedData.itemName = item.name;
    sharedData.messageId = messageId;
    sharedData.eventData = eventData;
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const sharedData = getEatingSharedData(context);

    // Emit the EATEN event
    events.push(context.event('if.event.eaten', sharedData.eventData));

    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: sharedData.messageId,
      params: { item: sharedData.itemName }
    }));

    return events;
  },

  group: "interaction"
};
