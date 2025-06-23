/**
 * Inventory action executor
 * 
 * Lists items currently carried by the actor
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, WearableBehavior } from '@sharpee/world-model';

/**
 * Executor for the inventory action
 */
export const inventoryAction: ActionExecutor = {
  id: IFActions.INVENTORY,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor } = command;
    
    // Get all items carried by the actor
    const carriedItems = context.world.getContents(actor.id);
    
    // Build inventory data
    const inventoryData: Record<string, unknown> = {
      totalItems: carriedItems.length,
      isEmpty: carriedItems.length === 0,
      items: []
    };
    
    // Separate worn and carried items
    const wornItems: string[] = [];
    const heldItems: string[] = [];
    
    for (const item of carriedItems) {
      const itemData: Record<string, unknown> = {
        id: item.id,
        isWorn: false
      };
      
      // Check if worn
      if (item.has(TraitType.WEARABLE)) {
        if (WearableBehavior.isWorn(item)) {
          itemData.isWorn = true;
          wornItems.push(item.id);
        } else {
          heldItems.push(item.id);
        }
      } else {
        heldItems.push(item.id);
      }
      
      (inventoryData.items as any[]).push(itemData);
    }
    
    // Add categorized lists
    inventoryData.wornItems = wornItems;
    inventoryData.heldItems = heldItems;
    inventoryData.wornCount = wornItems.length;
    inventoryData.heldCount = heldItems.length;
    
    // Check for weight/capacity if actor has those traits
    if (actor.has(TraitType.CONTAINER)) {
      // Could add capacity information here if needed
      const contents = context.world.getContents(actor.id);
      inventoryData.currentLoad = contents.length;
    }
    
    // Create the inventory event
    return [createEvent(
      IFEvents.INVENTORY_CHECKED,
      inventoryData,
      { actor: actor.id }
    )];
  }
};