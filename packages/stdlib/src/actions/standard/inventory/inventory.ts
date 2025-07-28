/**
 * Inventory action - Player checks what they're carrying
 * 
 * This is treated as an observable action where the player
 * physically checks their pockets/bag, which NPCs can notice.
 * 
 * Unlike scoring which uses capability data, inventory queries
 * the world model directly since items are core entities.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { InventoryEventMap, InventoryItem } from './inventory-events';

export const inventoryAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
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
        totalWeight = context.world.getTotalWeight(player.id);
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
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create the observable action event - NPCs can see this
    events.push(context.event('if.action.inventory', eventData));
    
    // Add the main inventory message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params
      }));
    
    // Add item lists if not empty
    if (holding.length > 0) {
      const holdingList = holding.map(e => e.name).join(', ');
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'holding_list',
        params: { items: holdingList }
      }));
    }
    
    if (worn.length > 0) {
      const wornList = worn.map(e => e.name).join(', ');
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'worn_list',
        params: { items: wornList }
      }));
    }
    
    // Add burden status if relevant
    if (eventData.burden && carried.length > 0) {
      const burdenMessage = `burden_${eventData.burden}`;
      params.weight = totalWeight;
      params.limit = weightLimit;
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: burdenMessage,
        params
      }));
    }
    
    return events;
  },
  
  group: "meta"
};
