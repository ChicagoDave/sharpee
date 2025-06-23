/**
 * Opening command definition
 * 
 * Maps "open" to the OPENING action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for opening objects
 * 
 * Handles patterns like:
 * - open door
 * - open the chest
 * - open box
 */
export const openingCommand: CommandDefinition = {
  verbId: IFVerbs.OPEN,
  mapsToAction: IFActions.OPENING,
  requiresNoun: true, // Opening always requires a target
  allowsIndirectObject: false, // Simple open, not "open X with Y"
  
  // No custom validation needed - standard noun resolution is sufficient
};