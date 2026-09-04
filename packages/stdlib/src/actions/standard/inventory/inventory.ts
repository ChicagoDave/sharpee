/**
 * Inventory action - Player checks what they're carrying
 *
 * This is treated as an observable action where the player
 * physically checks their pockets/bag, which NPCs can notice.
 *
 * Unlike scoring which uses capability data, inventory queries
 * the world model directly since items are core entities.
 *
 * Uses four-phase pattern:
 * 1. validate: Always succeeds (no preconditions)
 * 2. execute: Analyze inventory (no world mutations)
 * 3. report: Emit success events and messages
 * 4. blocked: Generate error events (never called since always valid)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { blockedMessageId } from '../../lifecycle/index.js';
import { type ISemanticEvent, definePoint } from '@sharpee/core';

// Plain draw (ADR-293 D4): a message-variant pick — seeded and traced, no
// outcome classes, no coverage row.
const EMPTY_VARIANT_POINT = definePoint('stdlib.inventory.empty-variant');
import { TraitType, IFEntity } from '@sharpee/world-model';
import type { Sequence } from '@sharpee/if-domain';
import { nounPhraseFor } from '../../../utils/index.js';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { InventoryEventMap } from './inventory-events.js';
import { InventoryMessages } from './inventory-messages.js';

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
  const actor = context.actor;
  const location = context.currentLocation;
  
  // ADR-247: getCarriedAndWorn is the partition — held items and worn items
  // in one call. (Replaces the old getContents({includeWorn:true}) + a
  // hand-rolled worn/held split.)
  const { carried: holding, worn } = context.world.getCarriedAndWorn(actor.id);
  const totalItems = holding.length + worn.length;
  
  // Calculate weight if actor has inventory limits
  let totalWeight = 0;
  let hasWeightLimit = false;
  let weightLimit = 0;
  
  if (actor.has(TraitType.ACTOR)) {
    // TODO: Add inventoryLimit to ActorTrait when weight system is implemented
    // Weight-based inventory limits are not yet supported on ActorTrait
  }
  
  // Build event data for the observable action
  const eventData: InventoryEventMap['if.action.inventory'] = {
    actorId: actor.id,
    locationId: location.id,
    totalItems: totalItems,
    heldItems: holding.length,
    wornItems: worn.length,
    isEmpty: totalItems === 0,
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
    if (totalItems > 0) {
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
  
  if (totalItems === 0) {
    messageId = 'inventory_empty';
    // Vary the empty message (plain draw on its own point — ADR-293 D4)
    const emptyMessages = ['inventory_empty', 'nothing_at_all', 'hands_empty', 'pockets_empty'];
    messageId = context.random.pick(EMPTY_VARIANT_POINT, emptyMessages);
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
  const burdenMessage = eventData.burden && totalItems > 0 ? `burden_${eventData.burden}` : undefined;

  return {
    holding,
    worn,
    carried: [...holding, ...worn],  // combined list (InventoryAnalysis contract)
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

/**
 * The inventory list-line phrase (GH #328): the first entity's own noun
 * phrase (its article follows its number and kind), then the remaining
 * names joined verbatim after commas — byte-identical to the standing
 * "a cloth satchel, apple" shape for a singular first item.
 *
 * @param entities the group's entities, in listing order
 * @returns a `Sequence` phrase for the `{items}` slot
 */
function listPhrase(entities: IFEntity[]): Sequence {
  const rest = entities.slice(1).map((e) => e.name).join(', ');
  return {
    kind: 'seq',
    parts: [nounPhraseFor(entities[0]), ...(rest ? [{ kind: 'literal' as const, text: `, ${rest}` }] : [])],
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

  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - inventory always succeeds
    const events: ISemanticEvent[] = [];
    const sharedData = getInventorySharedData(context);
    const analysis = sharedData.analysis;

    if (!analysis) {
      return events;
    }

    // Emit the main inventory event with messageId for text rendering
    // Include all data for comprehensive event handling
    events.push(context.event('if.event.inventory', {
      messageId: `${context.action.id}.${analysis.messageId}`,
      params: {
        ...analysis.params,
        holdingList: analysis.holdingList,
        wornList: analysis.wornList
      },
      ...analysis.eventData
    }));

    // Add item lists if not empty. The list-line `items` param is a phrase
    // whose FIRST entry is the entity's own noun phrase — so its article
    // honours the item's number and kind ("a cloth satchel", "boots", never
    // "a boots" — GH #328) — followed by the remaining names verbatim, the
    // list shape the standing output has always had.
    if (analysis.holdingList) {
      events.push(context.event('if.event.inventory', {
        messageId: `${context.action.id}.${InventoryMessages.HOLDING_LIST}`,
        params: { items: listPhrase(analysis.holding) },
        isHoldingList: true
      }));
    }

    if (analysis.wornList) {
      events.push(context.event('if.event.inventory', {
        messageId: `${context.action.id}.${InventoryMessages.WORN_LIST}`,
        params: { items: listPhrase(analysis.worn) },
        isWornList: true
      }));
    }

    // Add burden status if relevant
    if (analysis.burdenMessage) {
      events.push(context.event('if.event.inventory', {
        messageId: `${context.action.id}.${analysis.burdenMessage}`,
        params: { weight: analysis.totalWeight, limit: analysis.weightLimit },
        isBurdenMessage: true
      }));
    }

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    // Inventory always succeeds, so this should never be called
    return [context.event('if.event.inventory', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      reason: result.error
    })];
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};