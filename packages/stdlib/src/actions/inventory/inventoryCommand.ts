/**
 * Inventory command definition
 * 
 * Maps "inventory", "i" etc. to the INVENTORY action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for checking inventory
 * 
 * Handles patterns like:
 * - inventory
 * - i
 * - inv
 * - take inventory
 */
export const inventoryCommand: CommandDefinition = {
  verbId: IFVerbs.INVENTORY,
  mapsToAction: IFActions.INVENTORY,
  requiresNoun: false, // Inventory doesn't need a target
  allowsIndirectObject: false, // No indirect objects
  
  // No custom validation needed - this is a simple action
};