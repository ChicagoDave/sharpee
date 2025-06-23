/**
 * Removing command definition
 * 
 * Maps "remove", "take off", "doff" to the TAKING_OFF action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for removing worn items
 * 
 * Handles patterns like:
 * - remove hat
 * - take off the cloak
 * - doff jacket
 */
export const removingCommand: CommandDefinition = {
  verbId: IFVerbs.REMOVE,
  mapsToAction: IFActions.TAKING_OFF,
  requiresNoun: true, // Removing always requires a target
  allowsIndirectObject: false, // Simple remove action
  
  // No custom validation needed - standard noun resolution is sufficient
};