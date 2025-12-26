/**
 * Inventory action - Player checks what they're carrying
 *
 * This is treated as an observable action where the player
 * physically checks their pockets/bag, which NPCs can notice.
 *
 * Unlike scoring which uses capability data, inventory queries
 * the world model directly since items are core entities.
 *
 * Uses three-phase pattern:
 * 1. validate: Always succeeds (no preconditions)
 * 2. execute: Analyze inventory (no world mutations)
 * 3. report: Emit inventory events and success messages
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { InventoryEventMap } from './inventory-events';
import { handleReportErrors } from '../../base/report-helpers';

/**
 * Shared data passed between execute and report phases
 */
interface InventorySharedData {
  analysis?: InventoryAnalysis;
}

function getInventorySharedData(context: ActionContext): InventorySharedData {
  return context.sharedData as InventorySharedData;
}

interface InventoryAnalysis {
  holding: IFEntity[];
  worn: IFEntity[];
  carried: IFEntity[];
  eventData: InventoryEventMap['if.action.inventory'];
  messageId: string;
  params: Record<string, any>;
  holdingList?: string;
  wornList?: string;
  burdenMessage?: string;
  totalWeight: number;
  weightLimit: number;
}

/**
 * Analyzes the player's inventory and generates data for events
 * Shared logic between validate and execute phases
 */
function analyzeInventory(context: ActionContext): InventoryAnalysis {
  const player = context.player;
  const location = context.currentLocation;
  
  // Query the world model for what the player is carrying
  const carried = context.world.getContents(player.id);
  
  // Separate worn items from held items
  const worn = carried.filter(item => {
    if (item.has(TraitType.WEARABLE)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      return wearable.worn;
    }
    return false;
  });
  
  const holding = carried.filter(item => {
    if (item.has(TraitType.WEARABLE)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      return !wearable.worn;
    }
    return true;
  });
  
  // Calculate weight if player has inventory limits
  let totalWeight = 0;
  let hasWeightLimit = false;
  let weightLimit = 0;
  
  if (player.has(TraitType.ACTOR)) {
    const actorTrait = player.get(TraitType.ACTOR);
    if (actorTrait && (actorTrait as any).inventoryLimit?.maxWeight !== undefined) {
      hasWeightLimit = true;
      weightLimit = (actorTrait as any).inventoryLimit.maxWeight;
      // Calculate weight manually from items
      carried.forEach(item => {
        const identity = item.get(TraitType.IDENTITY);
        if (identity && (identity as any).weight) {
          totalWeight += (identity as any).weight;
        }
      });
    }
  }
  
  // Build event data for the observable action
  const eventData: InventoryEventMap['if.action.inventory'] = {
    actorId: player.id,
    locationId: location.id,
    totalItems: carried.length,
    heldItems: holding.length,
    wornItems: worn.length,
    isEmpty: carried.length === 0,
    carried: holding.map(e => ({ id: e.id, name: e.name })),
    worn: worn.map(e => ({ id: e.id, name: e.name })),
    items: [
      ...holding.map(e => ({ id: e.id, name: e.name, worn: false })),
      ...worn.map(e => ({ id: e.id, name: e.name, worn: true }))
    ]
  };
  
  // Add weight info if applicable
  if (hasWeightLimit) {
    eventData.totalWeight = totalWeight;
    eventData.maxWeight = weightLimit;
    eventData.weightLimit = weightLimit;
    eventData.weightPercentage = Math.round((totalWeight / weightLimit) * 100);
    
    // Determine burden status
    if (carried.length > 0) {
      const percentage = (totalWeight / weightLimit) * 100;
      if (percentage >= 90) {
        eventData.burden = 'overloaded';
      } else if (percentage >= 75) {
        eventData.burden = 'heavy';
      } else {
        eventData.burden = 'light';
      }
    }
  }
  
  // Check action verb for variations
  const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'inventory';
  if (verb === 'i' || verb === 'inv') {
    // Short form, brief output
    eventData.brief = true;
  }
  
  const params: Record<string, any> = {};
  
  // Determine appropriate message based on inventory state
  let messageId = 'carrying';
  
  if (carried.length === 0) {
    messageId = 'inventory_empty';
    // Vary the empty message
    const emptyMessages = ['inventory_empty', 'nothing_at_all', 'hands_empty', 'pockets_empty'];
    messageId = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
  } else if (holding.length > 0 && worn.length > 0) {
    messageId = 'carrying_and_wearing';
    params.holdingCount = holding.length;
    params.wearingCount = worn.length;
  } else if (worn.length > 0 && holding.length === 0) {
    messageId = 'wearing';
    params.wearingCount = worn.length;
  } else {
    params.holdingCount = holding.length;
  }
  
  // Prepare lists for display
  const holdingList = holding.length > 0 ? holding.map(e => e.name).join(', ') : undefined;
  const wornList = worn.length > 0 ? worn.map(e => e.name).join(', ') : undefined;
  const burdenMessage = eventData.burden && carried.length > 0 ? `burden_${eventData.burden}` : undefined;
  
  return {
    holding,
    worn,
    carried,
    eventData,
    messageId,
    params,
    holdingList,
    wornList,
    burdenMessage,
    totalWeight,
    weightLimit
  };
}

export const inventoryAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.INVENTORY,
  requiredMessages: [
    'inventory_empty',
    'carrying',
    'wearing',
    'carrying_and_wearing',
    'holding_list',
    'worn_list',
    'checking_pockets',
    'rifling_through_bag',
    'inventory_header',
    'nothing_at_all',
    'hands_empty',
    'pockets_empty',
    'carrying_count',
    'wearing_count',
    'burden_light',
    'burden_heavy',
    'burden_overloaded'
  ],
  
  validate(context: ActionContext): ValidationResult {
    // Inventory check is always valid - no preconditions
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Inventory has NO world mutations
    // Analyze inventory and store in sharedData for report phase
    const analysis = analyzeInventory(context);
    const sharedData = getInventorySharedData(context);

    sharedData.analysis = analysis;
  },

  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const sharedData = getInventorySharedData(context);
    const analysis = sharedData.analysis;

    if (!analysis) {
      return events;
    }

    // Create the observable action event - NPCs can see this
    events.push(context.event('if.action.inventory', analysis.eventData));

    // Add the main inventory message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: analysis.messageId,
      params: analysis.params
    }));

    // Add item lists if not empty
    if (analysis.holdingList) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'holding_list',
        params: { items: analysis.holdingList }
      }));
    }

    if (analysis.wornList) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'worn_list',
        params: { items: analysis.wornList }
      }));
    }

    // Add burden status if relevant
    if (analysis.burdenMessage) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: analysis.burdenMessage,
        params: {
          weight: analysis.totalWeight,
          limit: analysis.weightLimit
        }
      }));
    }

    return events;
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};